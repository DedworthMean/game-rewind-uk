const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const workerPath = path.resolve(__dirname, "..", "cloudflare-worker", "worker.js");

function loadWorker(fetchImpl = async () => {
  throw new Error("Unexpected upstream request");
}) {
  const source = fs.readFileSync(workerPath, "utf8")
    .replace("export default {", "globalThis.worker = {");
  const cache = {
    match: async () => undefined,
    put: async () => undefined
  };
  const context = vm.createContext({
    AbortSignal,
    Request,
    Response,
    URL,
    URLSearchParams,
    caches: { default: cache },
    console: { error: () => {} },
    fetch: fetchImpl
  });
  vm.runInContext(source, context, { filename: workerPath });
  return { worker: context.worker, cache };
}

const env = {
  TWITCH_CLIENT_ID: "test-client",
  TWITCH_CLIENT_SECRET: "test-secret",
  COVER_RATE_LIMITER: {
    limit: async () => ({ success: true })
  }
};

const ctx = { waitUntil: () => {} };

test("Worker advertises and enforces GET and OPTIONS only", async () => {
  const { worker } = loadWorker();
  const options = await worker.fetch(new Request("https://worker.example/?title=Doom", {
    method: "OPTIONS"
  }), env, ctx);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("access-control-allow-methods"), "GET,OPTIONS");

  const post = await worker.fetch(new Request("https://worker.example/?title=Doom", {
    method: "POST"
  }), env, ctx);
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, OPTIONS");
});

test("Worker rejects missing and overlong titles before calling upstream", async () => {
  const { worker } = loadWorker();
  assert.equal((await worker.fetch(new Request("https://worker.example/"), env, ctx)).status, 400);
  assert.equal((await worker.fetch(new Request(`https://worker.example/?title=${"a".repeat(161)}`), env, ctx)).status, 400);
});

test("Worker escapes IGDB search input and returns a validated cover URL", async () => {
  const calls = [];
  const { worker } = loadWorker(async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith("https://id.twitch.tv/")) {
      return new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify([{ cover: { image_id: "co1abc" } }]), { status: 200 });
  });

  const response = await worker.fetch(
    new Request('https://worker.example/?title=Game%20%22Deluxe%22%20%20Edition'),
    env,
    ctx
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    title: 'Game "Deluxe" Edition',
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg"
  });
  assert.equal(calls[0].url, "https://id.twitch.tv/oauth2/token");
  assert.equal(
    calls[0].options.headers["Content-Type"],
    "application/x-www-form-urlencoded"
  );
  const tokenBody = new URLSearchParams(calls[0].options.body);
  assert.equal(tokenBody.get("client_id"), env.TWITCH_CLIENT_ID);
  assert.equal(tokenBody.get("client_secret"), env.TWITCH_CLIENT_SECRET);
  assert.equal(tokenBody.get("grant_type"), "client_credentials");
  assert.match(calls[1].options.body, /search "Game \\"Deluxe\\" Edition";/);
});

test("Worker reuses a valid Twitch token across distinct title lookups", async () => {
  let tokenCalls = 0;
  let igdbCalls = 0;
  const { worker } = loadWorker(async (url) => {
    if (String(url) === "https://id.twitch.tv/oauth2/token") {
      tokenCalls += 1;
      return new Response(JSON.stringify({ access_token: "shared-token", expires_in: 3600 }), { status: 200 });
    }
    igdbCalls += 1;
    return new Response(JSON.stringify([]), { status: 200 });
  });

  const first = await worker.fetch(new Request("https://worker.example/?title=Doom"), env, ctx);
  const second = await worker.fetch(new Request("https://worker.example/?title=Quake"), env, ctx);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(tokenCalls, 1);
  assert.equal(igdbCalls, 2);
});

test("Worker enforces the cover lookup budget before calling upstream", async () => {
  let upstreamCalls = 0;
  const { worker } = loadWorker(async () => {
    upstreamCalls += 1;
    return new Response("unexpected", { status: 500 });
  });
  const limitedEnv = {
    ...env,
    COVER_RATE_LIMITER: {
      limit: async () => ({ success: false })
    }
  };

  const response = await worker.fetch(
    new Request("https://worker.example/?title=Unique%20uncached%20title"),
    limitedEnv,
    ctx
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(upstreamCalls, 0);
});

test("Worker serves cached covers without consuming the lookup budget", async () => {
  const { worker, cache } = loadWorker();
  cache.match = async () => new Response(JSON.stringify({
    title: "Doom",
    coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg"
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  const cachedOnlyEnv = {
    ...env,
    COVER_RATE_LIMITER: {
      limit: async () => {
        throw new Error("Cache hits must not use the lookup budget");
      }
    }
  };

  const response = await worker.fetch(
    new Request("https://worker.example/?title=Doom"),
    cachedOnlyEnv,
    ctx
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).title, "Doom");
});

test("Worker does not expose upstream error details", async () => {
  const { worker } = loadWorker(async () => new Response("private upstream detail", { status: 500 }));
  const response = await worker.fetch(new Request("https://worker.example/?title=Doom"), env, ctx);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Cover lookup unavailable" });
});
