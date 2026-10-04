const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function loadBrowserScript(fileName, fetchImpl = async () => {
  throw new Error("Unexpected fetch");
}) {
  const window = {
    setTimeout,
    clearTimeout
  };
  const context = vm.createContext({
    AbortController,
    URL,
    URLSearchParams,
    console: { ...console, warn: () => {} },
    fetch: fetchImpl,
    window
  });
  const source = fs.readFileSync(path.join(projectRoot, fileName), "utf8");
  vm.runInContext(source, context, { filename: fileName });
  return window;
}

test("month parsing accepts long and abbreviated UK release months", () => {
  const data = loadBrowserScript("game-rewind-data.js").GameRewindData;

  assert.deepEqual({ ...data.parseMonthYear("September 1986") }, { month: 9, year: 1986 });
  assert.deepEqual({ ...data.parseMonthYear("Sept 1986") }, { month: 9, year: 1986 });
  assert.deepEqual({ ...data.parseMonthYear("not a date") }, { month: null, year: null });
});

test("sheet fetches retry once and require an array response", async () => {
  let attempts = 0;
  const data = loadBrowserScript("game-rewind-data.js", async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("Temporary network failure");
    return { ok: true, json: async () => [{ value: "loaded" }] };
  }).GameRewindData;

  assert.deepEqual(Array.from(await data.fetchJsonArray("https://example.com/sheet")), [{ value: "loaded" }]);
  assert.equal(attempts, 2);

  const invalidData = loadBrowserScript("game-rewind-data.js", async () => ({
    ok: true,
    json: async () => ({ not: "an array" })
  })).GameRewindData;
  await assert.rejects(() => invalidData.fetchJsonArray("https://example.com/sheet"), /not an array/);
});

test("an empty or invalid Games dataset is rejected", () => {
  const data = loadBrowserScript("game-rewind-data.js").GameRewindData;

  assert.throws(() => data.assertGamesAvailable([]), /no valid rows/);
  assert.throws(() => data.assertGamesAvailable(null), /no valid rows/);
  assert.doesNotThrow(() => data.assertGamesAvailable([{ title: "Doom" }]));
});

test("sheet and proxy artwork URLs allow only bounded HTTP and HTTPS URLs", () => {
  const data = loadBrowserScript("game-rewind-data.js").GameRewindData;

  assert.equal(data.getSafeHttpUrl("https://images.example/cover.webp"), "https://images.example/cover.webp");
  assert.equal(data.getSafeHttpUrl("javascript:alert(1)"), "");
  assert.equal(data.getSafeHttpUrl("data:image/svg+xml,<svg></svg>"), "");
  assert.equal(data.getSafeHttpUrl("/local-file.png"), "");
});

test("external links allow only bounded HTTP and HTTPS URLs", () => {
  const urls = loadBrowserScript("game-rewind-url.js").GameRewindUrl;

  assert.equal(urls.getSafeExternalUrl("https://example.com/watch?v=1"), "https://example.com/watch?v=1");
  assert.equal(urls.getSafeExternalUrl("http://example.com"), "http://example.com/");
  assert.equal(urls.getSafeExternalUrl("javascript:alert(1)"), null);
  assert.equal(urls.getSafeExternalUrl("data:text/html,bad"), null);
  assert.equal(urls.getSafeExternalUrl("/relative/path"), null);
});

test("restored view state rejects malformed types, dates, ranges, and oversized values", () => {
  const urls = loadBrowserScript("game-rewind-url.js").GameRewindUrl;

  assert.equal(urls.sanitizeViewState({ type: "admin" }), null);
  assert.equal(urls.sanitizeViewState({ type: "browse-date", month: 13, year: 1995 }), null);
  assert.equal(urls.sanitizeViewState({ type: "birthday", date: "2020-02-30" }), null);
  assert.equal(urls.sanitizeViewState({ type: "search", query: "x".repeat(161) }), null);
  assert.deepEqual(
    { ...urls.sanitizeViewState({ type: "browse-date", month: 12, year: 1995 }) },
    { type: "browse-date", title: "", console: "", query: "", date: "", month: 12, year: 1995 }
  );
  assert.equal(urls.isSafeSharePayload("x".repeat(6001)), false);
});

test("suggestions preserve relevance order, deduplicate, and stay bounded", () => {
  const data = loadBrowserScript("game-rewind-data.js").GameRewindData;
  const games = [
    { title: "The Doom Collection" },
    { title: "Doom II" },
    { title: "DOOM" },
    { title: "Doom" },
    { title: "Ultimate Doom" },
    ...Array.from({ length: 30 }, (_, index) => ({ title: `Doom Expansion ${index}` }))
  ];

  const suggestions = data.getSuggestedGameTitles(games, "doom");
  const rankedSuggestions = data.getSuggestedGameTitles(games, "doom", 50);

  assert.equal(suggestions[0], "DOOM");
  assert.equal(suggestions.length, 12);
  assert.equal(new Set(suggestions.map((title) => title.toLowerCase())).size, suggestions.length);
  assert.ok(rankedSuggestions.indexOf("Doom II") < rankedSuggestions.indexOf("The Doom Collection"));
});

test("cover requests are deduplicated per game edition", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    return {
      ok: true,
      json: async () => ({ coverUrl: `cover-${requestedUrls.length}.jpg` })
    };
  };
  const data = loadBrowserScript("game-rewind-data.js", fetchImpl).GameRewindData;
  const ps1Game = { title: "Example Game", console: "PlayStation", year: 1998 };

  const [first, second] = await Promise.all([
    data.getCoverUrlForGame(ps1Game),
    data.getCoverUrlForGame(ps1Game)
  ]);
  await data.getCoverUrlForGame({ ...ps1Game, console: "Nintendo 64" });

  assert.equal(first, second);
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /console=PlayStation/);
  assert.match(requestedUrls[1], /console=Nintendo\+64/);
});

test("failed cover requests are not permanently cached", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("Temporary outage");
    return { ok: true, json: async () => ({ coverUrl: "https://images.example/retry.jpg" }) };
  };
  const data = loadBrowserScript("game-rewind-data.js", fetchImpl).GameRewindData;
  const game = { title: "Retry Game", console: "Dreamcast", year: 2000 };

  assert.equal(await data.getCoverUrlForGame(game), null);
  assert.equal(await data.getCoverUrlForGame(game), "https://images.example/retry.jpg");
  assert.equal(attempts, 2);
});

test("cover lookups bound inputs and reject unsafe proxy URLs", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    return { ok: true, json: async () => ({ coverUrl: "javascript:alert(1)" }) };
  };
  const data = loadBrowserScript("game-rewind-data.js", fetchImpl).GameRewindData;

  assert.equal(await data.getCoverUrlForGame({
    title: "x".repeat(200),
    console: "y".repeat(120),
    year: 9999
  }), null);
  const requestUrl = new URL(requestedUrls[0]);
  assert.equal(requestUrl.searchParams.get("title").length, 160);
  assert.equal(requestUrl.searchParams.get("console").length, 80);
  assert.equal(requestUrl.searchParams.has("year"), false);
});

test("console aliases and December launch windows remain correct", () => {
  const featureFactory = loadBrowserScript("console-launches.js").GameRewindConsoleLaunches;
  const state = {
    consoleLaunches: [],
    games: [
      { title: "Launch Game", console: "PS2", month: 12, year: 2000 },
      { title: "January Game", console: "Sony PlayStation 2", month: 1, year: 2001 },
      { title: "Too Late", console: "PS2", month: 2, year: 2001 }
    ]
  };
  const feature = featureFactory.createConsoleLaunchFeature({
    getState: () => state,
    monthNameFromNumber: (month) => String(month)
  });
  const launch = { console: "Sony PlayStation 2", month: 12, year: 2000 };

  assert.equal(feature.normalizeConsoleText("Sony PlayStation 2"), "ps2");
  assert.equal(feature.normalizeConsoleText("PS2"), "ps2");
  assert.equal(feature.isInConsoleLaunchWindow(state.games[1], launch), true);
  assert.equal(feature.isInConsoleLaunchWindow(state.games[2], launch), false);
  assert.deepEqual(
    Array.from(feature.getLaunchWindowGames(launch), (game) => game.title),
    ["Launch Game", "January Game"]
  );
});


test("Games become usable before optional sheets finish", async () => {
  let releaseOptional;
  const optionalGate = new Promise((resolve) => { releaseOptional = resolve; });
  let signalReady;
  const ready = new Promise((resolve) => { signalReady = resolve; });
  const data = loadBrowserScript("game-rewind-data.js", async (url) => {
    if (String(url).endsWith("/Games")) {
      return { ok: true, json: async () => [{ "Game Title": "Doom", "Console": "PC", "UK Release Date": "October 1993" }] };
    }
    await optionalGate;
    return { ok: true, json: async () => [] };
  }).GameRewindData;
  let completed = false;
  const loading = data.loadAllData({ onGamesReady: signalReady }).then((result) => { completed = true; return result; });
  try {
    const games = await ready;
    assert.equal(games[0].title, "Doom");
    assert.equal(completed, false);
  } finally {
    releaseOptional();
  }
  const result = await loading;
  assert.equal(result.counts.games, 1);
  assert.equal(result.cinemaLoaded, true);
});

test("invalid required Games fail without waiting for optional sheets", async () => {
  let releaseOptional;
  const gate = new Promise((resolve) => { releaseOptional = resolve; });
  const data = loadBrowserScript("game-rewind-data.js", async (url) => {
    if (!String(url).endsWith("/Games")) await gate;
    return { ok: true, json: async () => [] };
  }).GameRewindData;
  let readyCalled = false;
  try {
    await assert.rejects(() => data.loadAllData({ onGamesReady: () => { readyCalled = true; } }), /no valid rows/);
    assert.equal(readyCalled, false);
  } finally {
    releaseOptional();
  }
});


test("optional feed failures preserve early Games readiness and final availability", async () => {
  const data = loadBrowserScript("game-rewind-data.js", async (url) => {
    if (String(url).endsWith("/Cinema")) throw new Error("Optional outage");
    return { ok: true, json: async () => String(url).endsWith("/Games")
      ? [{ "Game Title": "Doom", "UK Release Date": "October 1993" }] : [] };
  }).GameRewindData;
  let readyCalled = false;
  const result = await data.loadAllData({ onGamesReady: () => { readyCalled = true; } });
  assert.equal(readyCalled, true);
  assert.equal(result.counts.games, 1);
  assert.equal(result.cinemaLoaded, false);
  assert.equal(result.musicLoaded, true);
});


function deferredRender() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("share preview and download both keep the newest style when older renders finish last", async () => {
  const factory = loadBrowserScript("share-card.js").GameRewindShareCard;
  const old = deferredRender();
  const latest = deferredRender();
  let calls = 0;
  const renderer = factory.createLatestShareCardRenderer(() => (++calls === 1 ? old.promise : latest.promise));
  const oldPreview = renderer.getRender();
  await Promise.resolve();
  renderer.invalidate();
  const currentPreview = renderer.getRender();
  const download = renderer.getRender();
  await Promise.resolve();
  const expected = { style: "teletext" };
  latest.resolve(expected);
  assert.equal((await currentPreview).canvas, expected);
  old.resolve({ style: "magazine" });
  assert.equal((await oldPreview).canvas, expected);
  assert.equal((await download).canvas, expected);
  assert.equal((await renderer.getRender()).canvas, expected);
  assert.equal(calls, 2);
});

test("late cover or category changes replace a completed share render", async () => {
  const factory = loadBrowserScript("share-card.js").GameRewindShareCard;
  let artwork = "placeholder";
  const renderer = factory.createLatestShareCardRenderer(() => ({ artwork }));
  const before = await renderer.getRender();
  artwork = "loaded cover";
  renderer.invalidate();
  const after = await renderer.getRender();
  assert.equal(before.canvas.artwork, "placeholder");
  assert.equal(after.canvas.artwork, "loaded cover");
  assert.notEqual(before.revision, after.revision);
});

test("obsolete render failures do not break a newer share card and current failures can retry", async () => {
  const factory = loadBrowserScript("share-card.js").GameRewindShareCard;
  const old = deferredRender();
  let calls = 0;
  const renderer = factory.createLatestShareCardRenderer(() => {
    calls += 1;
    if (calls === 1) return old.promise;
    if (calls === 2) throw new Error("Temporary render failure");
    return { style: "working" };
  });
  const oldPreview = renderer.getRender();
  await Promise.resolve();
  renderer.invalidate();
  await assert.rejects(() => renderer.getRender(), /Temporary render failure/);
  const current = await renderer.getRender();
  old.reject(new Error("Obsolete failure"));
  assert.equal((await oldPreview).canvas, current.canvas);
});
