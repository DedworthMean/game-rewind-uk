(function () {
  const SHEET_URLS = {
    games: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Games",
    cinema: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Cinema",
    music: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Music",
    wwe: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/WWE",
    rental: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Rental",
    cartoons: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Cartoons",
    console: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Console"
  };
  const GOOGLE_SHEET_ID = "1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU";
  const RETRO_WEEKEND_GID = "435750815";

  const IGDB_PROXY = "https://igdb-cover-proxy.deanagacy.workers.dev";
  const DEFAULT_SUGGESTION_LIMIT = 12;
  const COVER_REQUEST_TIMEOUT_MS = 8000;
  const SHEET_REQUEST_TIMEOUT_MS = 10000;
  const SHEET_REQUEST_ATTEMPTS = 2;
  const coverCache = new Map();

  function getSafeHttpUrl(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.length > 2048) return "";

    try {
      const url = new URL(raw);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (err) {
      return "";
    }
  }

  function parseMonthYear(raw) {
    if (!raw) return { month: null, year: null };

    const str = String(raw).replace(/\s+/g, " ").trim();
    const match = str.match(/([A-Za-z]+)\s+(\d{4})/);
    if (!match) return { month: null, year: null };

    const monthName = match[1].toLowerCase();
    const year = parseInt(match[2], 10);
    const monthMap = {
      january: 1, jan: 1,
      february: 2, feb: 2,
      march: 3, mar: 3,
      april: 4, apr: 4,
      may: 5,
      june: 6, jun: 6,
      july: 7, jul: 7,
      august: 8, aug: 8,
      september: 9, sept: 9, sep: 9,
      october: 10, oct: 10,
      november: 11, nov: 11,
      december: 12, dec: 12
    };

    const month = monthMap[monthName] || null;
    if (!month || !year) return { month: null, year: null };
    return { month, year };
  }

  function monthNameFromNumber(n) {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return (!n || n < 1 || n > 12) ? "Unknown month" : months[n - 1];
  }

  async function fetchJsonArray(url, options = {}) {
    const timeoutMs = options.timeoutMs || SHEET_REQUEST_TIMEOUT_MS;
    const attempts = options.attempts || SHEET_REQUEST_ATTEMPTS;
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error("Failed to fetch: " + res.status + " " + res.statusText);
        }

        const rows = await res.json();
        if (!Array.isArray(rows)) throw new Error("Sheet response was not an array");
        return rows;
      } catch (err) {
        lastError = err;
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error("Sheet request failed");
  }

  async function fetchGoogleVisualizationRowsOnce(sheetId, gid) {
    const callbackName = `gameRewindSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${gid}`;

    return await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("Timed out loading visualization data"));
      }, 10000);

      function cleanup() {
        window.clearTimeout(timeoutId);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete window[callbackName];
      }

      window[callbackName] = (payload) => {
        try {
          const columns = payload.table.cols.map((column) => column.label || column.id || "");
          const rows = payload.table.rows.map((row) => {
            const record = {};

            columns.forEach((column, index) => {
              const cell = row.c[index];
              record[column] = cell ? (cell.f || cell.v || "") : "";
            });

            return record;
          });

          cleanup();
          resolve(rows);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Failed to load visualization data script"));
      };
      script.src = url;
      document.head.appendChild(script);
    });
  }

  async function fetchGoogleVisualizationRows(sheetId, gid) {
    let lastError = null;

    for (let attempt = 1; attempt <= SHEET_REQUEST_ATTEMPTS; attempt += 1) {
      try {
        return await fetchGoogleVisualizationRowsOnce(sheetId, gid);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Visualization sheet request failed");
  }

  function parseGames(rows) {
    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["UK Release Date"]);
        return {
          title: (row["Game Title"] || "").trim(),
          console: (row["Console"] || "").trim(),
          month,
          year,
          imageUrl: getSafeHttpUrl(row["Image URL"])
        };
      })
      .filter((game) => game.title && game.month && game.year);
  }

  function assertGamesAvailable(games) {
    if (!Array.isArray(games) || !games.length) {
      throw new Error("Games sheet returned no valid rows");
    }
  }

  function parseCinema(rows) {
    const linkKeys = ["Link", "URL", "Url", "url"];

    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["UK Release Date (by Month)"]);
        const linkRaw = linkKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        return {
          title: (row["Title"] || "").trim(),
          imageUrl: getSafeHttpUrl(row["Image"]),
          url: getSafeHttpUrl(linkRaw),
          month,
          year
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function parseRental(rows) {
    const monthKeys = [
      "UK Release Date (by Month)",
      "UK Release Date",
      "Month",
      "Date",
      "Release Month",
      "Release Date"
    ];
    const titleKeys = ["Title", "Film", "Movie", "Name", "Event"];
    const linkKeys = ["Link", "URL", "Url", "url"];

    return rows
      .map((row) => {
        const monthRaw = monthKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const titleRaw = titleKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const linkRaw = linkKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const { month, year } = parseMonthYear(monthRaw);

        return {
          title: String(titleRaw || "").trim(),
          imageUrl: getSafeHttpUrl(row["Image"]),
          url: getSafeHttpUrl(linkRaw),
          month,
          year
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function getYouTubeVideoId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
        if (url.searchParams.get("v")) return url.searchParams.get("v");
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
      }
    } catch (err) {
      return "";
    }

    return "";
  }

  function getYouTubeThumbnailUrl(value) {
    const videoId = getYouTubeVideoId(value);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  }

  function isYouTubeUrl(value) {
    return Boolean(getYouTubeVideoId(value));
  }

  function parseMusic(rows) {
    const linkKeys = ["Link", "URL", "Url", "YouTube", "Youtube", "YouTube Link", "Video"];

    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["Month"]);
        const linkRaw = linkKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const url = getSafeHttpUrl(linkRaw);
        const imageUrl = getSafeHttpUrl(row["Image"]) ||
          getSafeHttpUrl(row["Cover Art URL"]) ||
          getYouTubeThumbnailUrl(url);
        const existingTitle = String(row["Existing Title"] || "").trim();
        const artist = String(row["Artist"] || "").trim();
        const title = String(row["Title"] || "").trim();
        const displayTitle = existingTitle || (artist && title ? `${artist} - ${title}` : title);

        return {
          title: displayTitle,
          imageUrl,
          url,
          month,
          year
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function parseCartoons(rows) {
    const monthKeys = [
      "Month",
      "Date",
      "UK Release Date (by Month)",
      "UK Release Date",
      "Release Month",
      "Release Date"
    ];
    const titleKeys = ["Title", "Content", "Name", "Show", "Series"];
    const linkKeys = ["Link", "URL", "Url", "url", "TMDB", "Tmdb"];

    return rows
      .map((row) => {
        const monthRaw = monthKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const titleRaw = titleKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const linkRaw = linkKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const { month, year } = parseMonthYear(monthRaw);

        return {
          title: String(titleRaw || "").trim(),
          imageUrl: getSafeHttpUrl(row["Image Link"]),
          month,
          year,
          url: getSafeHttpUrl(linkRaw)
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function parseWwe(rows) {
    return rows
      .map((row) => {
        const dateRaw = row["Date"] || row["DATE"] || row["date"] || "";
        const eventRaw = row["Event"] || row["Event/PPV"] || row["PPV"] || row["Title"] || row["Event Name"] || "";
        const urlRaw = row["URL"] || row["Url"] || row["url"] || row["YouTube URL"] || row["Youtube URL"] || row["YouTube"] || row["Youtube"] || row["Link"] || row["LINK"] || "";
        const { month, year } = parseMonthYear(dateRaw);

        return {
          title: eventRaw.trim(),
          imageUrl: getSafeHttpUrl(row["Image"]),
          month,
          year,
          url: getSafeHttpUrl(urlRaw)
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function parseRetroWeekend(rows) {
    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["UK Date"]);
        const musicLink = getSafeHttpUrl(row["Music Link"]);
        const musicImageRaw = getSafeHttpUrl(row["Music Image"] || row["Music Image Link"] || row["Music Artwork"]);
        const musicUrl = isYouTubeUrl(musicLink) ? musicLink : "";
        const musicImageUrl = musicImageRaw || (musicUrl ? getYouTubeThumbnailUrl(musicUrl) : musicLink);

        return {
          month,
          year,
          cinemaTitle: String(row["Cinema"] || "").trim(),
          cinemaImageUrl: getSafeHttpUrl(row["Cinema Link"]),
          musicTitle: String(row["Music"] || "").trim(),
          musicImageUrl,
          musicUrl,
          wweTitle: String(row["WWE"] || row["Wrestling"] || "").trim(),
          wweImageUrl: getSafeHttpUrl(row["WWE Link"] || row["Wrestling Link"]),
          rentalTitle: String(row["Rental"] || "").trim(),
          rentalImageUrl: getSafeHttpUrl(row["Rental Link"]),
          cartoonsTitle: String(row["Cartoons"] || "").trim(),
          cartoonsImageUrl: getSafeHttpUrl(row["Cartoons Link"]),
          tvTitle: String(row["TV"] || "").trim(),
          tvImageUrl: getSafeHttpUrl(row["TV Link"]),
          magazineTitle: String(row["Magazine"] || "").trim(),
          magazineImageUrl: getSafeHttpUrl(row["Magazine Link"])
        };
      })
      .filter((entry) => entry.month && entry.year);
  }

  function parseConsoleLaunches(rows) {
    const dateKeys = ["Date", "UK Date", "UK Release Date", "Launch Date", "Month"];
    const consoleKeys = ["Console", "System", "Format"];
    const headlineKeys = ["Headline", "Title", "Launch", "Name"];
    const descriptionKeys = ["Description", "Copy", "Text", "Body"];
    const imageKeys = ["Image", "Image URL", "Image Link", "Art", "Artwork"];

    return rows
      .map((row) => {
        const dateRaw = dateKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const consoleRaw = consoleKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const headlineRaw = headlineKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const descriptionRaw = descriptionKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const imageRaw = imageKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const { month, year } = parseMonthYear(dateRaw);
        const consoleName = String(consoleRaw || "").trim();

        return {
          console: consoleName,
          headline: String(headlineRaw || "").trim() || (consoleName ? `${consoleName} launches in the UK` : ""),
          description: String(descriptionRaw || "").trim(),
          imageUrl: getSafeHttpUrl(imageRaw),
          month,
          year
        };
      })
      .filter((entry) => entry.console && entry.headline && entry.month && entry.year);
  }

  function filterEntriesByMonthYear(entries, month, year) {
    return entries.filter((entry) => entry.month === month && entry.year === year);
  }

  function getUniqueGameTitles(games) {
    return [...new Set(games.map((game) => game.title))].sort((a, b) => a.localeCompare(b));
  }

  function normalizeGameSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['\u2019]s\b/g, "")
      .replace(/['\u2019]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function findGameMatches(games, query) {
    const rawQuery = String(query || "").trim().toLowerCase();
    const normalizedQuery = normalizeGameSearchText(query);
    if (!rawQuery && !normalizedQuery) return [];

    const queryTokens = normalizedQuery ? normalizedQuery.split(" ") : [];
    const exactRawMatches = [];
    const exactNormalizedMatches = [];
    const partialNormalizedMatches = [];
    const tokenMatches = [];

    games.forEach((game) => {
      const rawTitle = String(game.title || "").trim().toLowerCase();
      const normalizedTitle = normalizeGameSearchText(game.title);

      if (rawQuery && rawTitle === rawQuery) {
        exactRawMatches.push(game);
        return;
      }

      if (normalizedQuery && normalizedTitle === normalizedQuery) {
        exactNormalizedMatches.push(game);
        return;
      }

      if (normalizedQuery && normalizedTitle.includes(normalizedQuery)) {
        partialNormalizedMatches.push(game);
        return;
      }

      if (queryTokens.length && queryTokens.every((token) => normalizedTitle.includes(token))) {
        tokenMatches.push(game);
      }
    });

    return exactRawMatches
      .concat(exactNormalizedMatches, partialNormalizedMatches, tokenMatches);
  }

  function getSuggestedGameTitles(games, query, limit = DEFAULT_SUGGESTION_LIMIT) {
    const normalizedQuery = normalizeGameSearchText(query);
    if (!normalizedQuery) return [];

    const safeLimit = Math.max(1, Number(limit) || DEFAULT_SUGGESTION_LIMIT);

    const queryTokens = normalizedQuery.split(" ");
    const exactNormalizedTitles = [];
    const startsWithTitles = [];
    const includesTitles = [];
    const tokenTitles = [];
    const seenTitles = new Set();

    games.forEach((game) => {
      const title = String(game.title || "").trim();
      const normalizedTitle = normalizeGameSearchText(title);
      if (!title || !normalizedTitle || seenTitles.has(normalizedTitle)) return;

      if (normalizedTitle === normalizedQuery) {
        exactNormalizedTitles.push(title);
        seenTitles.add(normalizedTitle);
        return;
      }

      if (normalizedTitle.startsWith(normalizedQuery)) {
        startsWithTitles.push(title);
        seenTitles.add(normalizedTitle);
        return;
      }

      if (normalizedTitle.includes(normalizedQuery)) {
        includesTitles.push(title);
        seenTitles.add(normalizedTitle);
        return;
      }

      if (queryTokens.every((token) => normalizedTitle.includes(token))) {
        tokenTitles.push(title);
        seenTitles.add(normalizedTitle);
      }
    });

    const sortTitles = (titles) => titles.sort((a, b) => a.localeCompare(b));
    return sortTitles(exactNormalizedTitles)
      .concat(
        sortTitles(startsWithTitles),
        sortTitles(includesTitles),
        sortTitles(tokenTitles)
      )
      .slice(0, safeLimit);
  }

  async function getCoverUrlForGame(game) {
    if (game.imageUrl) return game.imageUrl;

    const title = String(game.title || "").trim().slice(0, 160);
    const consoleName = String(game.console || "").trim().slice(0, 80);
    const year = Number.isInteger(Number(game.year)) && Number(game.year) >= 1970 && Number(game.year) <= 2100
      ? Number(game.year)
      : null;
    if (!title) return null;

    const key = [title, consoleName, year]
      .map((value) => normalizeGameSearchText(value))
      .join("|");
    if (coverCache.has(key)) return coverCache.get(key);

    const request = (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), COVER_REQUEST_TIMEOUT_MS);

      try {
        const params = new URLSearchParams({ title });
        if (consoleName) params.set("console", consoleName);
        if (year) params.set("year", String(year));

        const res = await fetch(`${IGDB_PROXY}/?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Proxy error: ${res.status}`);

        const data = await res.json();
        return getSafeHttpUrl(data.coverUrl) || null;
      } catch (err) {
        coverCache.delete(key);
        console.warn("IGDB cover lookup failed:", err);
        return null;
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();

    coverCache.set(key, request);
    return request;
  }

  async function loadOptionalSheet(name, loader) {
    try {
      return {
        loaded: true,
        rows: await loader()
      };
    } catch (err) {
      console.warn(`${name} sheet failed to load (non-fatal):`, err);
      return {
        loaded: false,
        rows: []
      };
    }
  }

  async function loadAllData() {
    const [gamesResult, cinemaResult, musicResult, wweResult, rentalResult, cartoonsResult, retroWeekendResult, consoleResult] = await Promise.all([
      loadOptionalSheet("Games", () => fetchJsonArray(SHEET_URLS.games)),
      loadOptionalSheet("Cinema", () => fetchJsonArray(SHEET_URLS.cinema)),
      loadOptionalSheet("Music", () => fetchJsonArray(SHEET_URLS.music)),
      loadOptionalSheet("WWE", () => fetchJsonArray(SHEET_URLS.wwe)),
      loadOptionalSheet("Rental", () => fetchJsonArray(SHEET_URLS.rental)),
      loadOptionalSheet("Cartoons", () => fetchJsonArray(SHEET_URLS.cartoons)),
      loadOptionalSheet("Retro weekend", () => fetchGoogleVisualizationRows(GOOGLE_SHEET_ID, RETRO_WEEKEND_GID)),
      loadOptionalSheet("Console", () => fetchJsonArray(SHEET_URLS.console))
    ]);

    if (!gamesResult.loaded) {
      throw new Error("Games sheet failed to load");
    }

    const games = parseGames(gamesResult.rows);
    assertGamesAvailable(games);

    const cinema = parseCinema(cinemaResult.rows);
    const music = parseMusic(musicResult.rows);
    const wwe = parseWwe(wweResult.rows);
    const rental = parseRental(rentalResult.rows);
    const cartoons = parseCartoons(cartoonsResult.rows);
    const retroWeekend = parseRetroWeekend(retroWeekendResult.rows);
    const consoleLaunches = parseConsoleLaunches(consoleResult.rows);

    return {
      games,
      cinema,
      music,
      wwe,
      rental,
      cartoons,
      retroWeekend,
      consoleLaunches,
      cinemaLoaded: cinemaResult.loaded,
      musicLoaded: musicResult.loaded,
      wweLoaded: wweResult.loaded,
      rentalLoaded: rentalResult.loaded,
      cartoonsLoaded: cartoonsResult.loaded,
      retroWeekendLoaded: retroWeekendResult.loaded,
      consoleLoaded: consoleResult.loaded,
      counts: {
        games: games.length,
        cinema: cinema.length,
        music: music.length,
        wwe: wwe.length,
        rental: rental.length,
        cartoons: cartoons.length,
        retroWeekend: retroWeekend.length,
        consoleLaunches: consoleLaunches.length
      }
    };
  }

  window.GameRewindData = {
    SHEET_URLS,
    assertGamesAvailable,
    filterEntriesByMonthYear,
    fetchJsonArray,
    findGameMatches,
    getSuggestedGameTitles,
    getCoverUrlForGame,
    getSafeHttpUrl,
    getUniqueGameTitles,
    loadAllData,
    monthNameFromNumber,
    normalizeGameSearchText,
    parseMonthYear
  };
}());
