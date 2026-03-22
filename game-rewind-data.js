(function () {
  const SHEET_URLS = {
    games: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Games",
    cinema: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Cinema",
    music: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Music",
    wwe: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/WWE",
    rental: "https://opensheet.elk.sh/1rEjpzvAYKZiBsu_jzZKHSZkeGzEate3ZBj0VKwuzefU/Rental"
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
          month,
          year
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

  function filterEntriesByMonthYear(entries, month, year) {
    return entries.filter((entry) => entry.month === month && entry.year === year);
  }

  function getUniqueGameTitles(games) {
    return [...new Set(games.map((game) => game.title))].sort((a, b) => a.localeCompare(b));
  }

  function findGameMatches(games, query) {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    if (!normalizedQuery) return [];

    let matches = games.filter((game) => game.title.toLowerCase() === normalizedQuery);
    if (!matches.length) {
      matches = games.filter((game) => game.title.toLowerCase().includes(normalizedQuery));
    }

    return matches;
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

  async function loadAllData() {
    const [gamesRows, cinemaRows, musicRows, wweRows] = await Promise.all([
      fetchJsonArray(SHEET_URLS.games),
      fetchJsonArray(SHEET_URLS.cinema),
      fetchJsonArray(SHEET_URLS.music),
      fetchJsonArray(SHEET_URLS.wwe)
    ]);

    let rentalRows = [];
    let rentalLoaded = true;
    let retroWeekendRows = [];
    let retroWeekendLoaded = true;

    try {
      rentalRows = await fetchJsonArray(SHEET_URLS.rental);
    } catch (err) {
      console.warn("Rental sheet failed to load (non-fatal):", err);
      rentalLoaded = false;
    }

    try {
      retroWeekendRows = await fetchGoogleVisualizationRows(GOOGLE_SHEET_ID, RETRO_WEEKEND_GID);
    } catch (err) {
      console.warn("Retro weekend sheet failed to load (non-fatal):", err);
      retroWeekendLoaded = false;
    }

    const games = parseGames(gamesRows);
    const cinema = parseCinema(cinemaRows);
    const music = parseMusic(musicRows);
    const wwe = parseWwe(wweRows);
    const rental = parseRental(rentalRows);
    const retroWeekend = parseRetroWeekend(retroWeekendRows);

    return {
      games,
      cinema,
      music,
      wwe,
      rental,
      retroWeekend,
      rentalLoaded,
      retroWeekendLoaded,
      counts: {
        games: games.length,
        cinema: cinema.length,
        music: music.length,
        wwe: wwe.length,
        rental: rental.length,
        retroWeekend: retroWeekend.length
      }
    };
  }

  window.GameRewindData = {
    SHEET_URLS,
    filterEntriesByMonthYear,
    findGameMatches,
    getCoverUrlForGame,
    getUniqueGameTitles,
    loadAllData,
    monthNameFromNumber,
    parseMonthYear
  };
}());
