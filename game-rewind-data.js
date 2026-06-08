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
  const coverCache = new Map();

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

  async function fetchJsonArray(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch: " + res.status + " " + res.statusText);
    }

    return await res.json();
  }

  async function fetchGoogleVisualizationRows(sheetId, gid) {
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

  function parseGames(rows) {
    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["UK Release Date"]);
        return {
          title: (row["Game Title"] || "").trim(),
          console: (row["Console"] || "").trim(),
          month,
          year,
          imageUrl: (row["Image URL"] || "").trim()
        };
      })
      .filter((game) => game.title && game.month && game.year);
  }

  function parseCinema(rows) {
    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["UK Release Date (by Month)"]);
        return {
          title: (row["Title"] || "").trim(),
          imageUrl: String(row["Image"] || "").trim(),
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

    return rows
      .map((row) => {
        const monthRaw = monthKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const titleRaw = titleKeys.map((key) => row[key]).find((value) => value !== undefined) || "";
        const { month, year } = parseMonthYear(monthRaw);

        return {
          title: String(titleRaw || "").trim(),
          imageUrl: String(row["Image"] || "").trim(),
          month,
          year
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function parseMusic(rows) {
    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["Month"]);
        return {
          title: (row["Title"] || "").trim(),
          imageUrl: String(row["Image"] || "").trim(),
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
          imageUrl: String(row["Image Link"] || "").trim(),
          month,
          year,
          url: String(linkRaw || "").trim()
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
          imageUrl: String(row["Image"] || "").trim(),
          month,
          year,
          url: String(urlRaw).trim()
        };
      })
      .filter((entry) => entry.title && entry.month && entry.year);
  }

  function parseRetroWeekend(rows) {
    return rows
      .map((row) => {
        const { month, year } = parseMonthYear(row["UK Date"]);
        return {
          month,
          year,
          cinemaTitle: String(row["Cinema"] || "").trim(),
          cinemaImageUrl: String(row["Cinema Link"] || "").trim(),
          musicTitle: String(row["Music"] || "").trim(),
          musicImageUrl: String(row["Music Link"] || "").trim(),
          wweTitle: String(row["WWE"] || row["Wrestling"] || "").trim(),
          wweImageUrl: String(row["WWE Link"] || row["Wrestling Link"] || "").trim(),
          rentalTitle: String(row["Rental"] || "").trim(),
          rentalImageUrl: String(row["Rental Link"] || "").trim(),
          cartoonsTitle: String(row["Cartoons"] || "").trim(),
          cartoonsImageUrl: String(row["Cartoons Link"] || "").trim(),
          tvTitle: String(row["TV"] || "").trim(),
          tvImageUrl: String(row["TV Link"] || "").trim(),
          magazineTitle: String(row["Magazine"] || "").trim(),
          magazineImageUrl: String(row["Magazine Link"] || "").trim()
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
          imageUrl: String(imageRaw || "").trim(),
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

  function getSuggestedGameTitles(games, query) {
    const normalizedQuery = normalizeGameSearchText(query);
    if (!normalizedQuery) return [];

    const queryTokens = normalizedQuery.split(" ");
    const exactNormalizedTitles = [];
    const startsWithTitles = [];
    const includesTitles = [];
    const tokenTitles = [];
    const seenTitles = new Set();

    games.forEach((game) => {
      const title = String(game.title || "").trim();
      const normalizedTitle = normalizeGameSearchText(title);
      if (!title || !normalizedTitle || seenTitles.has(title)) return;

      if (normalizedTitle === normalizedQuery) {
        exactNormalizedTitles.push(title);
        seenTitles.add(title);
        return;
      }

      if (normalizedTitle.startsWith(normalizedQuery)) {
        startsWithTitles.push(title);
        seenTitles.add(title);
        return;
      }

      if (normalizedTitle.includes(normalizedQuery)) {
        includesTitles.push(title);
        seenTitles.add(title);
        return;
      }

      if (queryTokens.every((token) => normalizedTitle.includes(token))) {
        tokenTitles.push(title);
        seenTitles.add(title);
      }
    });

    return exactNormalizedTitles
      .concat(startsWithTitles, includesTitles, tokenTitles)
      .sort((a, b) => a.localeCompare(b));
  }

  async function getCoverUrlForGame(game) {
    if (game.imageUrl) return game.imageUrl;

    const key = game.title;
    if (coverCache.has(key)) return coverCache.get(key);

    try {
      const res = await fetch(`${IGDB_PROXY}/?title=${encodeURIComponent(game.title)}`);
      if (!res.ok) throw new Error("Proxy error");

      const data = await res.json();
      const url = data.coverUrl || null;
      coverCache.set(key, url);
      return url;
    } catch (err) {
      console.warn("IGDB cover lookup failed:", err);
      coverCache.set(key, null);
      return null;
    }
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
    filterEntriesByMonthYear,
    findGameMatches,
    getSuggestedGameTitles,
    getCoverUrlForGame,
    getUniqueGameTitles,
    loadAllData,
    monthNameFromNumber,
    normalizeGameSearchText,
    parseMonthYear
  };
}());
