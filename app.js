    const {
      filterEntriesByMonthYear,
      findGameMatches,
      getSuggestedGameTitles,
      getCoverUrlForGame,
      getUniqueGameTitles,
      loadAllData,
      monthNameFromNumber,
      normalizeGameSearchText
    } = window.GameRewindData;

    let games = [];
    let cinema = [];
    let music = [];
    let wwe = [];
    let rental = [];
    let cartoons = [];
    let retroWeekend = [];
    let consoleLaunches = [];
    let lastRandomGameKey = "";
    let randomSpinTimer = null;
    let isRandomSpinning = false;
    let isLoaded = false;
    let isRestoringHistory = false;
    let uniqueGameTitles = [];
    let renderBirthdayList = () => {};
    const APP_HISTORY_KEY = "game-rewind-view";
    const OFFSETS_YEARS = [10, 15, 20, 25, 30, 35, 40];
    const MAX_SECTION_ITEMS = 20;
    const MAX_MONTH_GAMES = 20;
    const SHARE_CATEGORY_KEYS = ["game", "cinema", "rental", "music", "cartoons", "wwe"];
    const PICK_CATEGORY_KEYS = ["cinema", "rental", "music", "cartoons", "wwe"];
    const SHARE_CARD_TEMPLATES = window.GameRewindShareCardTemplates || [];

    function getShareCardTemplate(templateKey) {
      return SHARE_CARD_TEMPLATES.find((template) => template.key === templateKey) || SHARE_CARD_TEMPLATES[0];
    }

    function getShareCardTemplateExportBackground(template) {
      const embeddedBackgrounds = window.GameRewindShareCardBackgrounds || {};
      return embeddedBackgrounds[template.key] || template.backgroundUrl || "";
    }

    function setLandingChromeVisible(visible) {
      const heroEl = document.getElementById("landing-hero");
      const searchPanelEl = document.getElementById("search-panel");
      const resultsSearchEl = document.getElementById("results-search-form");
      if (!heroEl || !searchPanelEl || !resultsSearchEl) return;

      heroEl.classList.toggle("is-hidden", !visible);
      searchPanelEl.classList.toggle("is-hidden", !visible);
      resultsSearchEl.classList.toggle("is-hidden", visible);
    }

    function clearShareModals() {
      document.querySelectorAll(".share-card-modal").forEach((modal) => modal.remove());
      document.body.classList.remove("has-share-modal");
    }

    function setImagePendingPlaceholder(element, label = "Archive") {
      element.innerHTML = "";
      element.classList.add("image-pending");

      const labelEl = document.createElement("span");
      labelEl.className = "image-pending-label";
      labelEl.textContent = label;

      const textEl = document.createElement("span");
      textEl.className = "image-pending-text";
      textEl.textContent = "Image pending";

      element.appendChild(labelEl);
      element.appendChild(textEl);
    }

    function normalizeConsoleText(value) {
      const normalized = String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");

      const aliases = {
        "nintendo entertainment system": "nes",
        "nintendo nes": "nes",
        "nes": "nes",
        "sega master system": "master system",
        "master system": "master system",
        "sega mega drive": "mega drive",
        "mega drive": "mega drive",
        "sega genesis": "mega drive",
        "nintendo game boy": "game boy",
        "game boy": "game boy",
        "super nintendo": "snes",
        "super nintendo entertainment system": "snes",
        "nintendo snes": "snes",
        "snes": "snes",
        "sega mega cd": "mega cd",
        "mega cd": "mega cd",
        "sega mega drive 32x": "32x",
        "mega drive 32x": "32x",
        "sega 32x": "32x",
        "32x": "32x",
        "sega saturn": "saturn",
        "saturn": "saturn",
        "sony playstation": "playstation",
        "playstation": "playstation",
        "ps1": "playstation",
        "nintendo 64 uk": "n64",
        "nintendo 64": "n64",
        "n64": "n64",
        "sega dreamcast": "dreamcast",
        "dreamcast": "dreamcast",
        "sony playstation 2": "ps2",
        "playstation 2": "ps2",
        "ps2": "ps2",
        "microsoft xbox": "xbox",
        "xbox launch": "xbox",
        "xbox": "xbox",
        "nintendo gamecube": "gamecube",
        "gamecube": "gamecube",
        "nintendo game cube": "gamecube",
        "game cube": "gamecube",
        "game boy advance": "gba",
        "gba": "gba",
        "playstation portable": "psp",
        "sony playstation portable": "psp",
        "sony psp": "psp",
        "psp": "psp",
        "nintendo ds": "nintendo ds",
        "ds": "nintendo ds",
        "xbox 360": "xbox 360",
        "microsoft xbox 360": "xbox 360",
        "nintendo wii": "wii",
        "wii": "wii",
        "sony playstation 3": "ps3",
        "playstation 3": "ps3",
        "ps3": "ps3"
      };

      return aliases[normalized] || normalized;
    }

    function getConsoleLaunchKey(launch) {
      return [launch.console, launch.month, launch.year].map(value => String(value || "")).join("|");
    }

    function getConsoleLaunchImageUrl(launch) {
      if (launch.imageUrl) return launch.imageUrl;

      const assetMap = {
        nes: "NES.png",
        "master system": "Master System.png",
        "mega drive": "Mega Drive.png",
        "game boy": "Game Boy.png",
        snes: "Super Nintendo.png",
        "mega cd": "Mega CD.png",
        "32x": "Mega Drive 32x.png",
        saturn: "Sega Saturn.png",
        playstation: "PS1.png",
        n64: "N64.png",
        dreamcast: "Dreamcast.png",
        ps2: "PS2.png",
        xbox: "Xbox.png",
        gamecube: "GameCube.png",
        gba: "GBA.png",
        psp: "PSP.png",
        "nintendo ds": "Nintendo DS.png",
        "xbox 360": "Xbox 360.png",
        wii: "Wii.png",
        ps3: "PS3.png"
      };

      const fileName = assetMap[normalizeConsoleText(launch.console)];
      return fileName ? `console/${encodeURIComponent(fileName)}` : "";
    }

    function getConsoleLaunchesForMonth(month, year) {
      return consoleLaunches
        .filter((launch) => launch.month === month && launch.year === year)
        .sort((a, b) => (a.console || "").localeCompare(b.console || ""));
    }

    function getNextMonthYear(month, year) {
      if (month === 12) {
        return { month: 1, year: year + 1 };
      }

      return { month: month + 1, year };
    }

    function isInConsoleLaunchWindow(game, launch) {
      const next = getNextMonthYear(launch.month, launch.year);
      return (
        (game.month === launch.month && game.year === launch.year) ||
        (game.month === next.month && game.year === next.year)
      );
    }

    function getLaunchWindowLabel(launch) {
      const next = getNextMonthYear(launch.month, launch.year);
      return `${monthNameFromNumber(launch.month)} ${launch.year} - ${monthNameFromNumber(next.month)} ${next.year}`;
    }

    function getLaunchWindowGames(launch) {
      const launchConsole = normalizeConsoleText(launch.console);
      return games
        .filter((game) =>
          isInConsoleLaunchWindow(game, launch) &&
          normalizeConsoleText(game.console) === launchConsole
        )
        .sort((a, b) =>
          a.year - b.year ||
          a.month - b.month ||
          (a.title || "").localeCompare(b.title || "")
        );
    }

    function getRestOfLaunchWindowGames(launch) {
      const launchConsole = normalizeConsoleText(launch.console);
      return games
        .filter((game) =>
          isInConsoleLaunchWindow(game, launch) &&
          normalizeConsoleText(game.console) !== launchConsole
        )
        .sort((a, b) =>
          a.year - b.year ||
          a.month - b.month ||
          (a.title || "").localeCompare(b.title || "")
        );
    }

    function getCultureCategoryDefinitions(month, year) {
      const keyCinema = filterEntriesByMonthYear(cinema, month, year);
      const keyMusic = filterEntriesByMonthYear(music, month, year);
      const keyWwe = filterEntriesByMonthYear(wwe, month, year);
      const keyRental = filterEntriesByMonthYear(rental, month, year);
      const keyCartoons = filterEntriesByMonthYear(cartoons, month, year);

      return [
        {
          key: "cinema",
          label: "Cinema",
          title: keyCinema.length ? `In cinemas (${keyCinema.length})` : "In cinemas",
          emptyText: "No cinema data for this month.",
          items: keyCinema,
          linkMode: "imdb",
          enableToggle: true
        },
        {
          key: "rental",
          label: "Rental",
          title: keyRental.length ? `Available to rent (${keyRental.length})` : "Available to rent",
          emptyText: "No rental data for this month.",
          items: keyRental,
          linkMode: "imdb",
          enableToggle: true
        },
        {
          key: "music",
          label: "Single",
          title: keyMusic.length ? `In the charts (${keyMusic.length})` : "IN THE CHARTS",
          emptyText: "No music data for this month.",
          items: keyMusic,
          linkMode: "youtube",
          enableToggle: false
        },
        {
          key: "cartoons",
          label: "Kids TV",
          title: keyCartoons.length ? `KIDS TV (${keyCartoons.length})` : "KIDS TV",
          emptyText: "No kids TV data for this month.",
          items: keyCartoons,
          linkMode: undefined,
          enableToggle: true
        },
        {
          key: "wwe",
          label: "Wrestling",
          title: keyWwe.length ? `Wrestling events (${keyWwe.length})` : "Wrestling events",
          emptyText: "No wrestling events for this month.",
          items: keyWwe,
          linkMode: undefined,
          enableToggle: false
        }
      ];
    }

    function createCultureSection(category, savedSelections = null, onPick = null) {
      const block = document.createElement("div");
      block.className = "section-block";

      const t = document.createElement("div");
      t.className = "section-title";
      t.textContent = category.title;
      block.appendChild(t);

      if (!category.items.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = category.emptyText;
        block.appendChild(empty);
        return block;
      }

      const ul = document.createElement("ul");
      ul.className = "section-list";
      block.appendChild(ul);

      const more = document.createElement("div");
      more.className = "section-more";
      more.style.display = "none";
      block.appendChild(more);

      let expanded = false;
      const enablePick = Boolean(savedSelections && onPick);

      function renderList() {
        ul.innerHTML = "";

        const visible = (category.enableToggle && expanded)
          ? category.items
          : category.items.slice(0, MAX_SECTION_ITEMS);

        visible.forEach(i => {
          const li = document.createElement("li");
          li.className = "section-entry";
          const mainContent = document.createElement("div");
          mainContent.className = "section-entry-main";
          const destination = getSectionItemDestination(i, category.linkMode);

          if (destination) {
            const link = document.createElement("a");
            link.href = destination;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = i.title;
            link.className = "has-link";
            mainContent.appendChild(link);
          } else {
            mainContent.textContent = i.title;
          }

          if (enablePick) {
            const isSelected = Boolean(savedSelections[category.key] && savedSelections[category.key].title === i.title);
            const pickButton = document.createElement("button");
            pickButton.type = "button";
            pickButton.className = isSelected ? "pick-button is-selected" : "pick-button";
            pickButton.textContent = isSelected ? "Picked" : "Pick";
            pickButton.dataset.categoryKey = category.key;
            pickButton.dataset.itemTitle = i.title;
            pickButton.addEventListener("click", (event) => {
              onPick(category, i, event.currentTarget);
            });
            li.appendChild(pickButton);
          }

          li.appendChild(mainContent);
          ul.appendChild(li);
        });

        if (!category.enableToggle || category.items.length <= MAX_SECTION_ITEMS) {
          more.style.display = "none";
        } else {
          more.style.display = "block";
          more.textContent = expanded ? "Show less" : `Show all ${category.items.length}`;
        }
      }

      more.addEventListener("click", () => {
        expanded = !expanded;
        renderList();
      });

      renderList();
      return block;
    }

    function appendCultureSections(card, categories, savedSelections = null, onPick = null) {
      categories.forEach((category) => {
        card.appendChild(createCultureSection(category, savedSelections, onPick));
      });
    }

    function createCultureCardForMonth(month, year, titleText, subtitleText) {
      const card = document.createElement("div");
      card.className = "card";

      const header = document.createElement("div");
      header.className = "card-header";

      const main = document.createElement("div");
      main.className = "card-header-main";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = titleText;

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = subtitleText;

      main.appendChild(title);
      main.appendChild(subtitle);
      header.appendChild(main);
      card.appendChild(header);

      appendCultureSections(card, getCultureCategoryDefinitions(month, year));
      return card;
    }

    function findConsoleLaunchMatches(query) {
      const normalizedQuery = normalizeGameSearchText(query);
      if (!normalizedQuery) return [];

      return consoleLaunches.filter((launch) => {
        const searchText = normalizeGameSearchText([
          launch.console,
          launch.headline,
          monthNameFromNumber(launch.month),
          launch.year,
          "console launch"
        ].join(" "));
        return searchText.includes(normalizedQuery);
      });
    }

    function findPrimaryConsoleLaunchMatch(query) {
      const normalizedQuery = normalizeGameSearchText(query);
      const normalizedConsoleQuery = normalizeConsoleText(query);
      if (!normalizedQuery && !normalizedConsoleQuery) return null;

      return consoleLaunches.find((launch) =>
        normalizeConsoleText(launch.console) === normalizedConsoleQuery ||
        normalizeGameSearchText(launch.console) === normalizedQuery ||
        normalizeGameSearchText(launch.headline) === normalizedQuery
      ) || null;
    }

    function showConsoleChooser(matches, baseQuery, options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      if (!options.skipHistory) {
        writeViewHistory({ type: "search", query: baseQuery });
      }

      statusEl.textContent = `Multiple versions found for "${baseQuery}". Choose a console.`;
      resultsEl.innerHTML = "";

      const card = document.createElement("div");
      card.className = "card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = baseQuery;

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Select a console to view that version.";

      card.appendChild(title);
      card.appendChild(subtitle);

      const list = document.createElement("ul");

      matches.forEach(game => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "console-choice-btn";
        btn.textContent = game.console ? `${game.title} - ${game.console}` : game.title;

        btn.addEventListener("click", () => {
          renderResults([game], `${game.title} (${game.console || "Console"})`);
          syncSearchInputs(game.title);
          statusEl.textContent = `Showing ${game.title}` + (game.console ? ` on ${game.console}` : "");
        });

        li.appendChild(btn);
        list.appendChild(li);
      });

      card.appendChild(list);
      resultsEl.appendChild(card);
      scrollResultViewToTop();
    }

    function handleGameSelection(query, { populateInput = false, skipHistory = false } = {}) {
      const statusEl = document.getElementById("status");
      const primaryLaunchMatch = findPrimaryConsoleLaunchMatch(query);
      if (primaryLaunchMatch) {
        renderConsoleLaunchResult(primaryLaunchMatch, { skipHistory });
        return;
      }

      const matches = findGameMatches(games, query);

      if (!matches.length) {
        const launchMatches = findConsoleLaunchMatches(query);
        if (launchMatches.length) {
          renderConsoleLaunchResult(launchMatches[0], { skipHistory });
          return;
        }

        statusEl.textContent = `No games found for "${query}".`;
        renderResults([], query, { skipHistory });
        return;
      }

      const consoles = [...new Set(matches.map((match) => (match.console || "").trim()))];
      if (matches.length > 1 && consoles.length > 1) {
        showConsoleChooser(matches, query, { skipHistory });
        return;
      }

      if (populateInput) {
        syncSearchInputs(matches[0].title);
      }

      statusEl.textContent = `Found ${matches.length} matching game(s).`;
      renderResults(matches, query, { skipHistory });
    }

    function getGameKey(game) {
      return [game.title, game.console, game.month, game.year].map(value => String(value || "")).join("|");
    }

    function encodeSharePayload(payload) {
      const json = JSON.stringify(payload || {});
      const bytes = new TextEncoder().encode(json);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });

      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodeSharePayload(value) {
      try {
        const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch (err) {
        return null;
      }
    }

    function compactSelections(selections = {}) {
      const compact = {};

      PICK_CATEGORY_KEYS.forEach((key) => {
        const selection = selections[key];
        if (!selection || !selection.title) return;

        compact[key] = {
          t: selection.title,
          i: selection.imageUrl || "",
          u: selection.url || "",
          l: selection.linkMode || ""
        };
      });

      return compact;
    }

    function expandSelections(compact = {}) {
      const expanded = {};

      PICK_CATEGORY_KEYS.forEach((key) => {
        const selection = compact[key];
        if (!selection || !selection.t) return;

        expanded[key] = {
          title: selection.t,
          imageUrl: selection.i || "",
          url: selection.u || "",
          linkMode: selection.l || ""
        };
      });

      return expanded;
    }

    function normalizeIncludedCategories(includedCategories = null) {
      const normalized = {};

      SHARE_CATEGORY_KEYS.forEach((key) => {
        normalized[key] = !includedCategories || includedCategories[key] !== false;
      });

      return normalized;
    }

    function getShareableUrl(game, selections = {}, includedCategories = null) {
      const url = new URL(window.location.href);
      const params = new URLSearchParams();
      const normalizedIncluded = normalizeIncludedCategories(includedCategories);
      const hiddenCategories = SHARE_CATEGORY_KEYS.filter((key) => normalizedIncluded[key] === false);
      const compact = compactSelections(selections);

      params.set("game", game.title || "");
      if (game.console) {
        params.set("console", game.console);
      }
      params.set("month", String(game.month || ""));
      params.set("year", String(game.year || ""));

      if (hiddenCategories.length) {
        params.set("hide", hiddenCategories.join(","));
      }

      if (Object.keys(compact).length) {
        params.set("picks", encodeSharePayload(compact));
      }

      url.search = params.toString();
      url.hash = "";
      return url.toString();
    }

    function readSharedUrlState() {
      const params = new URLSearchParams(window.location.search);
      const title = params.get("game");
      const month = Number(params.get("month"));
      const year = Number(params.get("year"));
      if (!title || !month || !year) return null;

      const consoleName = params.get("console") || "";
      const normalizedTitle = normalizeGameSearchText(title);
      const normalizedConsole = normalizeLookupText(consoleName);
      const game = games.find((candidate) =>
        normalizeGameSearchText(candidate.title) === normalizedTitle &&
        Number(candidate.month) === month &&
        Number(candidate.year) === year &&
        (!normalizedConsole || normalizeLookupText(candidate.console) === normalizedConsole)
      );

      if (!game) return null;

      const hiddenCategories = (params.get("hide") || "")
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean);
      const includedCategories = normalizeIncludedCategories();
      hiddenCategories.forEach((key) => {
        if (SHARE_CATEGORY_KEYS.includes(key)) {
          includedCategories[key] = false;
        }
      });

      return {
        game,
        selections: expandSelections(decodeSharePayload(params.get("picks")) || {}),
        includedCategories
      };
    }

    function clearShareableUrl() {
      if (!window.location.search) return;

      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState(window.history.state || {}, "", url.toString());
    }

    function scrollResultViewToTop() {
      window.requestAnimationFrame(() => {
        const target = document.getElementById("status") || document.getElementById("results");
        if (!target) return;
        target.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }

    function getGameHistoryState(game) {
      if (!game) return null;

      return {
        type: "game",
        title: game.title || "",
        console: game.console || "",
        month: Number(game.month) || 0,
        year: Number(game.year) || 0
      };
    }

    function getConsoleLaunchHistoryState(launch) {
      if (!launch) return null;

      return {
        type: "console-launch",
        console: launch.console || "",
        month: Number(launch.month) || 0,
        year: Number(launch.year) || 0
      };
    }

    function serializeViewState(viewState = {}) {
      const params = new URLSearchParams();
      params.set("view", viewState.type || "home");

      ["title", "console", "query", "date"].forEach((key) => {
        if (viewState[key]) {
          params.set(key, viewState[key]);
        }
      });

      ["month", "year"].forEach((key) => {
        if (viewState[key]) {
          params.set(key, String(viewState[key]));
        }
      });

      return params.toString();
    }

    function parseViewStateFromHash() {
      const rawHash = window.location.hash.replace(/^#/, "");
      if (!rawHash) return null;

      const params = new URLSearchParams(rawHash);
      const type = params.get("view");
      if (!type) return null;

      return {
        type,
        title: params.get("title") || "",
        console: params.get("console") || "",
        query: params.get("query") || "",
        date: params.get("date") || "",
        month: Number(params.get("month")) || 0,
        year: Number(params.get("year")) || 0
      };
    }

    function getHistoryUrl(viewState) {
      const url = new URL(window.location.href);
      url.search = "";
      url.hash = serializeViewState(viewState);
      return url.toString();
    }

    function writeViewHistory(viewState, { replace = false } = {}) {
      if (isRestoringHistory || !viewState || !viewState.type) return;

      const state = {
        [APP_HISTORY_KEY]: true,
        view: viewState
      };
      const url = getHistoryUrl(viewState);

      if (replace) {
        window.history.replaceState(state, "", url);
      } else {
        window.history.pushState(state, "", url);
      }
    }

    function findGameFromHistoryState(viewState = {}) {
      const normalizedTitle = normalizeGameSearchText(viewState.title);
      const normalizedConsole = normalizeLookupText(viewState.console);

      return games.find((game) =>
        normalizeGameSearchText(game.title) === normalizedTitle &&
        Number(game.month) === Number(viewState.month) &&
        Number(game.year) === Number(viewState.year) &&
        (!normalizedConsole || normalizeLookupText(game.console) === normalizedConsole)
      ) || null;
    }

    function findConsoleLaunchFromHistoryState(viewState = {}) {
      const normalizedConsole = normalizeConsoleText(viewState.console);

      return consoleLaunches.find((launch) =>
        normalizeConsoleText(launch.console) === normalizedConsole &&
        Number(launch.month) === Number(viewState.month) &&
        Number(launch.year) === Number(viewState.year)
      ) || null;
    }

    function restoreHistoryView(viewState) {
      if (!isLoaded) return;

      isRestoringHistory = true;
      clearSuggestions();
      clearShareModals();

      try {
        if (!viewState || viewState.type === "home") {
          resetApp({ skipHistory: true, focusInput: false });
          return;
        }

        if (viewState.type === "game") {
          const game = findGameFromHistoryState(viewState);
          if (game) {
            showSpecificGame(game, { populateInput: true, skipHistory: true });
            return;
          }
        }

        if (viewState.type === "console-launch") {
          const launch = findConsoleLaunchFromHistoryState(viewState);
          if (launch) {
            renderConsoleLaunchResult(launch, { skipHistory: true });
            return;
          }
        }

        if (viewState.type === "browse-date") {
          renderBrowseByDate({
            skipHistory: true,
            month: viewState.month,
            year: viewState.year,
            showList: Boolean(viewState.month && viewState.year)
          });
          return;
        }

        if (viewState.type === "browse-console") {
          renderBrowseByConsole({
            skipHistory: true,
            console: viewState.console,
            showList: Boolean(viewState.console)
          });
          return;
        }

        if (viewState.type === "birthday") {
          renderBirthdayList({
            skipHistory: true,
            date: viewState.date,
            showTimeline: Boolean(viewState.date)
          });
          return;
        }

        if (viewState.type === "search" && viewState.query) {
          syncSearchInputs(viewState.query);
          handleGameSelection(viewState.query, { populateInput: true, skipHistory: true });
          return;
        }

        resetApp({ skipHistory: true, focusInput: false });
      } finally {
        isRestoringHistory = false;
      }
    }

    function triggerResultsReveal() {
      const resultsEl = document.getElementById("results");
      resultsEl.classList.remove("results-random-reveal");
      void resultsEl.offsetWidth;
      resultsEl.classList.add("results-random-reveal");
    }

    function showSpecificGame(game, options = {}) {
      const { populateInput = false, animateResults = false } = options;
      const statusEl = document.getElementById("status");
      if (populateInput) {
        syncSearchInputs(game.title);
      }

      statusEl.textContent = `Showing ${game.title}` + (game.console ? ` on ${game.console}` : "");
      renderResults([game], game.title, options);

      if (animateResults) {
        triggerResultsReveal();
      }
    }

    function createConsoleLaunchPromo(launch) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "console-launch-promo";
      button.addEventListener("click", () => renderConsoleLaunchResult(launch));

      const imageWrap = document.createElement("div");
      imageWrap.className = "console-launch-promo-art";
      const imageUrl = getConsoleLaunchImageUrl(launch);
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = launch.headline;
        img.loading = "lazy";
        img.addEventListener("error", () => {
          img.remove();
          setImagePendingPlaceholder(imageWrap, "Console launch");
        }, { once: true });
        imageWrap.appendChild(img);
      } else {
        setImagePendingPlaceholder(imageWrap, "Console launch");
      }

      const copy = document.createElement("div");
      copy.className = "console-launch-promo-copy";

      const kicker = document.createElement("div");
      kicker.className = "console-launch-kicker";
      kicker.textContent = "Console launch";

      const title = document.createElement("div");
      title.className = "console-launch-promo-title";
      title.textContent = launch.headline;

      const meta = document.createElement("div");
      meta.className = "console-launch-meta";
      meta.textContent = `${monthNameFromNumber(launch.month)} ${launch.year} / ${launch.console}`;

      copy.appendChild(kicker);
      copy.appendChild(title);
      copy.appendChild(meta);
      button.appendChild(imageWrap);
      button.appendChild(copy);

      return button;
    }

    function createLaunchGameCard(game) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "console-launch-game-card";
      button.addEventListener("click", () => showSpecificGame(game, { populateInput: true }));

      const cover = document.createElement("div");
      cover.className = "console-launch-game-thumb";
      setImagePendingPlaceholder(cover, game.console || "Game");

      getCoverUrlForGame(game).then((url) => {
        if (!url) return;
        const img = document.createElement("img");
        img.src = url;
        img.alt = `${game.title} cover`;
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => {
          img.remove();
          setImagePendingPlaceholder(cover, game.console || "Game");
        }, { once: true });
        cover.appendChild(img);
      });

      const name = document.createElement("div");
      name.className = "retro-weekend-name";
      name.textContent = game.title;

      button.appendChild(cover);
      button.appendChild(name);
      return button;
    }

    function renderConsoleLaunchResult(launch, options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      const launchGames = getLaunchWindowGames(launch);
      const restOfMonth = getRestOfLaunchWindowGames(launch);
      const imageUrl = getConsoleLaunchImageUrl(launch);
      const launchWindowLabel = getLaunchWindowLabel(launch);

      clearShareableUrl();
      clearSuggestions();
      clearShareModals();
      setLandingChromeVisible(false);
      if (!options.skipHistory) {
        writeViewHistory(getConsoleLaunchHistoryState(launch));
      }
      syncSearchInputs(launch.console);
      statusEl.textContent = `Showing ${launch.console} launch window - ${launchWindowLabel}.`;
      resultsEl.innerHTML = "";

      const hero = document.createElement("div");
      hero.className = "console-launch-result";

      const art = document.createElement("div");
      art.className = "console-launch-result-art";
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = launch.headline;
        img.addEventListener("error", () => {
          img.remove();
          setImagePendingPlaceholder(art, "Console launch");
        }, { once: true });
        art.appendChild(img);
      } else {
        setImagePendingPlaceholder(art, "Console launch");
      }

      const copy = document.createElement("div");
      copy.className = "console-launch-result-copy";

      const kicker = document.createElement("div");
      kicker.className = "console-launch-kicker";
      kicker.textContent = "Console launch";

      const title = document.createElement("h1");
      title.textContent = launch.headline;

      const meta = document.createElement("div");
      meta.className = "console-launch-meta";
      meta.textContent = `${monthNameFromNumber(launch.month)} ${launch.year} / ${launch.console}`;

      const description = document.createElement("p");
      description.textContent = launch.description || `Explore the ${launch.console} launch window and the games sharing that UK release moment.`;

      copy.appendChild(kicker);
      copy.appendChild(title);
      copy.appendChild(meta);
      copy.appendChild(description);
      hero.appendChild(art);
      hero.appendChild(copy);
      resultsEl.appendChild(hero);

      const launchCard = document.createElement("div");
      launchCard.className = "card console-launch-games-card";
      const launchTitle = document.createElement("div");
      launchTitle.className = "card-title";
      launchTitle.textContent = `${launch.console} launch window games`;
      const launchSubtitle = document.createElement("div");
      launchSubtitle.className = "card-subtitle";
      launchSubtitle.textContent = launchGames.length
        ? `${launchGames.length} game${launchGames.length === 1 ? "" : "s"} released across ${launchWindowLabel}.`
        : `Launch-window game data is still being added for ${launch.console}.`;

      launchCard.appendChild(launchTitle);
      launchCard.appendChild(launchSubtitle);

      if (launchGames.length) {
        const gameGrid = document.createElement("div");
        gameGrid.className = "console-launch-game-grid";
        launchGames.forEach((game) => gameGrid.appendChild(createLaunchGameCard(game)));
        launchCard.appendChild(gameGrid);
      } else {
        const empty = document.createElement("div");
        empty.className = "empty console-launch-empty";
        empty.textContent = `We have the ${launch.console} UK launch in the archive, but the matching ${launchWindowLabel} game rows are not complete yet. Once those releases are added to the Games sheet, they will appear here automatically.`;
        launchCard.appendChild(empty);
      }

      resultsEl.appendChild(launchCard);

      const restCard = document.createElement("div");
      restCard.className = "card";
      const restTitle = document.createElement("div");
      restTitle.className = "card-title";
      restTitle.textContent = "The rest of this month's releases";
      const restSubtitle = document.createElement("div");
      restSubtitle.className = "card-subtitle";
      restSubtitle.textContent = `${monthNameFromNumber(launch.month)} ${launch.year}`;

      restCard.appendChild(restTitle);
      restCard.appendChild(restSubtitle);

      if (restOfMonth.length) {
        const list = document.createElement("ul");
        list.className = "month-games-list";
        restOfMonth.forEach((game) => {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.href = "#";
          link.className = "clickable-game";
          link.textContent = game.console ? `${game.title} - ${game.console}` : game.title;
          link.addEventListener("click", (event) => {
            event.preventDefault();
            showSpecificGame(game, { populateInput: true });
          });
          li.appendChild(link);
          list.appendChild(li);
        });
        restCard.appendChild(list);
      } else {
        const empty = document.createElement("div");
        empty.className = "empty console-launch-empty";
        empty.textContent = `No other game releases are listed for ${monthNameFromNumber(launch.month)} ${launch.year} yet.`;
        restCard.appendChild(empty);
      }

      resultsEl.appendChild(restCard);

      resultsEl.appendChild(createCultureCardForMonth(
        launch.month,
        launch.year,
        "More from this launch month",
        `${monthNameFromNumber(launch.month)} ${launch.year} culture picks from cinema, rental, music, kids TV, and wrestling.`
      ));
      scrollResultViewToTop();
    }

    function setRandomButtonSpinning(isSpinning) {
      const randomButton = document.getElementById("random-game");
      if (!randomButton) return;

      randomButton.classList.toggle("is-spinning", isSpinning);
      randomButton.disabled = isSpinning;
      randomButton.setAttribute("aria-busy", isSpinning ? "true" : "false");
    }

    function pickRandomGame() {
      const availableGames = games.length > 1 && lastRandomGameKey
        ? games.filter((game) => getGameKey(game) !== lastRandomGameKey)
        : games;

      const source = availableGames.length ? availableGames : games;
      return source[Math.floor(Math.random() * source.length)];
    }

    function pickRandomFromList(items) {
      if (!items.length) return null;
      return items[Math.floor(Math.random() * items.length)];
    }

    function showRandomGame() {
      const statusEl = document.getElementById("status");

      if (isRandomSpinning) {
        return;
      }

      if (!isLoaded) {
        statusEl.textContent = "Still loading data. Try again in a moment.";
        return;
      }

      if (!games.length) {
        statusEl.textContent = "No games are available to choose from yet.";
        return;
      }

      const randomGame = pickRandomGame();
      const spinDuration = 1100;
      const spinInterval = 72;
      const startTime = Date.now();

      clearShareableUrl();
      isRandomSpinning = true;
      setRandomButtonSpinning(true);
      setLandingChromeVisible(false);
      statusEl.textContent = "Random Rewind is searching the archive...";
      document.getElementById("results").innerHTML = "";

      randomSpinTimer = window.setInterval(() => {
        const previewGame = games[Math.floor(Math.random() * games.length)];
        syncSearchInputs(previewGame.title);
        statusEl.textContent =
          `Random Rewind: ${previewGame.title}` +
          (previewGame.console ? ` - ${previewGame.console}` : "");

        if (Date.now() - startTime >= spinDuration) {
          window.clearInterval(randomSpinTimer);
          randomSpinTimer = null;
          isRandomSpinning = false;
          setRandomButtonSpinning(false);

          lastRandomGameKey = getGameKey(randomGame);
          showSpecificGame(randomGame, { populateInput: true, animateResults: true });
        }
      }, spinInterval);
    }

    function renderOnThisMonth() {
      if (!isLoaded) return;

      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(true);
      resultsEl.innerHTML = "";

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const monthName = monthNameFromNumber(currentMonth);

      const header = document.createElement("div");
      header.className = "month-issue";

      const kicker = document.createElement("div");
      kicker.className = "month-issue-kicker";
      kicker.textContent = "This month in retro gaming";

      const title = document.createElement("div");
      title.className = "month-issue-title";
      title.textContent = `${monthName} rewind`;

      const subtitle = document.createElement("div");
      subtitle.className = "month-issue-copy";
      subtitle.textContent = `Browse ${monthName} releases for the same month 20, 25, even 40 years ago. Pick a headline game, then build the weekend around it.`;

      header.appendChild(kicker);
      header.appendChild(title);
      header.appendChild(subtitle);
      resultsEl.appendChild(header);

      let anyGroups = false;
      const grid = document.createElement("div");
      grid.className = "month-feature-grid";

      OFFSETS_YEARS.forEach(offset => {
        const targetYear = currentYear - offset;
        const group = games
          .filter(g => g.month === currentMonth && g.year === targetYear)
          .sort((a, b) =>
            (a.title || "").trim().localeCompare((b.title || "").trim(), undefined, { sensitivity: "base" })
          );
        if (!group.length) return;

        anyGroups = true;
        const featuredGame = pickRandomFromList(group) || group[0];

        const card = document.createElement("div");
        card.className = "month-feature-card";

        const cardHeader = document.createElement("div");
        cardHeader.className = "month-feature-header";

        const left = document.createElement("div");
        const yearTitle = document.createElement("div");
        yearTitle.className = "month-feature-title";
        yearTitle.textContent = `${monthName} ${targetYear}`;

        const yearSubtitle = document.createElement("div");
        yearSubtitle.className = "month-feature-subtitle";
        yearSubtitle.textContent = `${offset} years ago / ${group.length} game` + (group.length === 1 ? "" : "s");

        left.appendChild(yearTitle);
        left.appendChild(yearSubtitle);
        cardHeader.appendChild(left);
        card.appendChild(cardHeader);

        const featureButton = document.createElement("button");
        featureButton.type = "button";
        featureButton.className = "month-feature-cover";
        featureButton.setAttribute("aria-label", `Open ${featuredGame.title}`);
        featureButton.addEventListener("click", () => {
          showSpecificGame(featuredGame, { populateInput: true });
        });

        const coverPlaceholder = document.createElement("div");
        coverPlaceholder.className = "month-feature-cover-placeholder";
        setImagePendingPlaceholder(coverPlaceholder, featuredGame.console || "Game");
        featureButton.appendChild(coverPlaceholder);

        getCoverUrlForGame(featuredGame).then((coverUrl) => {
          if (!coverUrl) return;

          const image = document.createElement("img");
          image.src = coverUrl;
          image.alt = `${featuredGame.title} cover`;
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          image.addEventListener("error", () => {
            image.remove();
            setImagePendingPlaceholder(coverPlaceholder, featuredGame.console || "Game");
          });
          featureButton.appendChild(image);
        });

        const featureTitle = document.createElement("button");
        featureTitle.type = "button";
        featureTitle.className = "month-feature-headline";
        featureTitle.textContent = featuredGame.console ? `${featuredGame.title} - ${featuredGame.console}` : featuredGame.title;
        featureTitle.addEventListener("click", () => {
          showSpecificGame(featuredGame, { populateInput: true });
        });

        card.appendChild(featureButton);
        card.appendChild(featureTitle);

        const list = document.createElement("ul");
        list.className = "month-games-list";

        function addGameRow(g) {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.href = "#";
          link.className = "clickable-game";
          link.textContent = g.console ? `${g.title} - ${g.console}` : g.title;

          link.addEventListener("click", (event) => {
            event.preventDefault();
            showSpecificGame(g, { populateInput: true });
          });

          li.appendChild(link);
          list.appendChild(li);
        }

        group
          .filter((game) => getGameKey(game) !== getGameKey(featuredGame))
          .slice(0, 6)
          .forEach(addGameRow);
        card.appendChild(list);

        if (group.length > 7) {
          const more = document.createElement("div");
          more.className = "section-more";
          more.textContent = `Show all ${group.length} games`;
          more.addEventListener("click", () => {
            list.innerHTML = "";
            group
              .filter((game) => getGameKey(game) !== getGameKey(featuredGame))
              .forEach(addGameRow);
            more.remove();
          });
          card.appendChild(more);
        }

        grid.appendChild(card);
      });

      if (anyGroups) {
        resultsEl.appendChild(grid);
      }

      if (!anyGroups) {
        const msg = document.createElement("div");
        msg.className = "no-results";
        msg.textContent = `No games in your data for ${monthName} at 10, 15, 20, 25, 30, 35, or 40 years ago.`;
        resultsEl.appendChild(msg);
      }
    }

    

    // ===== 4.75 Browse views (Date / Console) =====
    function renderBrowseByDate(options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      resultsEl.innerHTML = "";
      if (!options.skipHistory) {
        writeViewHistory({ type: "browse-date" });
      }

      if (!isLoaded) {
        statusEl.textContent = "Still loading data. Try again in a moment.";
        return;
      }

      statusEl.textContent = "Browse games by month and year.";

      const card = document.createElement("div");
      card.className = "card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = "Browse by date";

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Pick a month and year to see all games released then.";

      card.appendChild(title);
      card.appendChild(subtitle);

      // Build month select
      const monthSelect = document.createElement("select");
      monthSelect.className = "browse-select";
      monthSelect.setAttribute("aria-label", "Month");

      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement("option");
        opt.value = String(m);
        opt.textContent = monthNameFromNumber(m);
        monthSelect.appendChild(opt);
      }
      if (options.month) {
        monthSelect.value = String(options.month);
      }

      // Build year select from data
      const years = [...new Set(games.map(g => g.year))].sort((a, b) => b - a);
      const yearSelect = document.createElement("select");
      yearSelect.className = "browse-select";
      yearSelect.setAttribute("aria-label", "Year");

      years.forEach(y => {
        const opt = document.createElement("option");
        opt.value = String(y);
        opt.textContent = String(y);
        yearSelect.appendChild(opt);
      });
      if (options.year) {
        yearSelect.value = String(options.year);
      }

      const goBtn = document.createElement("button");
      goBtn.type = "button";
      goBtn.className = "browse-action";
      goBtn.textContent = "Show games";

      const listWrap = document.createElement("div");
      listWrap.className = "browse-list-wrap";

      const list = document.createElement("ul");
      list.className = "month-games-list";
      listWrap.appendChild(list);

      function addGameRow(g) {
        const li = document.createElement("li");

        const link = document.createElement("a");
        link.href = "#";
        link.className = "clickable-game";
        link.textContent = g.console ? `${g.title} - ${g.console}` : g.title;

        link.addEventListener("click", (event) => {
          event.preventDefault();
          showSpecificGame(g, { populateInput: true });
        });

        li.appendChild(link);
        list.appendChild(li);
      }

      function renderList({ updateHistory = true } = {}) {
        list.innerHTML = "";
        const month = parseInt(monthSelect.value, 10);
        const year = parseInt(yearSelect.value, 10);
        if (updateHistory && !options.skipHistory) {
          writeViewHistory({ type: "browse-date", month, year });
        }

        const group = games
          .filter(g => g.month === month && g.year === year)
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        const launchMatches = getConsoleLaunchesForMonth(month, year);

        if (!group.length && !launchMatches.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = `No games found for ${monthNameFromNumber(month)} ${year}.`;
          listWrap.innerHTML = "";
          listWrap.appendChild(empty);
          return;
        }

        listWrap.innerHTML = "";
        launchMatches.forEach((launch) => {
          listWrap.appendChild(createConsoleLaunchPromo(launch));
        });
        listWrap.appendChild(list);
        group.forEach(addGameRow);
      }

      goBtn.addEventListener("click", () => renderList());

      card.appendChild(monthSelect);
      card.appendChild(yearSelect);
      card.appendChild(goBtn);
      card.appendChild(listWrap);

      resultsEl.appendChild(card);
      if (options.showList) {
        renderList({ updateHistory: false });
      }
      scrollResultViewToTop();
    }

    function renderBrowseByConsole(options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      resultsEl.innerHTML = "";
      if (!options.skipHistory) {
        writeViewHistory({ type: "browse-console" });
      }

      if (!isLoaded) {
        statusEl.textContent = "Still loading data. Try again in a moment.";
        return;
      }

      statusEl.textContent = "Browse games by console.";

      const card = document.createElement("div");
      card.className = "card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = "Browse by console";

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Pick a console to see all games for it.";

      card.appendChild(title);
      card.appendChild(subtitle);

      const consoles = [...new Set(games.map(g => (g.console || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

      const consoleSelect = document.createElement("select");
      consoleSelect.className = "browse-select";
      consoleSelect.setAttribute("aria-label", "Console");

      consoles.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        consoleSelect.appendChild(opt);
      });
      if (options.console) {
        consoleSelect.value = options.console;
      }

      const goBtn = document.createElement("button");
      goBtn.type = "button";
      goBtn.className = "browse-action";
      goBtn.textContent = "Show games";

      const listWrap = document.createElement("div");
      listWrap.className = "browse-list-wrap";

      const list = document.createElement("ul");
      list.className = "month-games-list";
      listWrap.appendChild(list);

      function addGameRow(g) {
        const li = document.createElement("li");

        const link = document.createElement("a");
        link.href = "#";
        link.className = "clickable-game";
        link.textContent = `${g.title} - ${monthNameFromNumber(g.month)} ${g.year}`;

        link.addEventListener("click", (event) => {
          event.preventDefault();
          showSpecificGame(g, { populateInput: true });
        });

        li.appendChild(link);
        list.appendChild(li);
      }

      function renderList({ updateHistory = true } = {}) {
        list.innerHTML = "";
        const selected = consoleSelect.value;
        if (updateHistory && !options.skipHistory) {
          writeViewHistory({ type: "browse-console", console: selected });
        }

        const group = games
          .filter(g => (g.console || "").trim() === selected)
          .sort((a, b) =>
          (a.title || "").trim().localeCompare((b.title || "").trim(), undefined, { sensitivity: "base" })
        );

        if (!group.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = `No games found for ${selected}.`;
          listWrap.innerHTML = "";
          listWrap.appendChild(empty);
          return;
        }

        listWrap.innerHTML = "";
        listWrap.appendChild(list);
        group.forEach(addGameRow);
      }

      goBtn.addEventListener("click", () => renderList());

      card.appendChild(consoleSelect);
      card.appendChild(goBtn);
      card.appendChild(listWrap);

      resultsEl.appendChild(card);
      if (options.showList) {
        renderList({ updateHistory: false });
      }
      scrollResultViewToTop();
    }

    if (window.GameRewindBirthday) {
      const birthdayFeature = window.GameRewindBirthday.createBirthdayFeature({
        getState: () => ({
          games,
          cinema,
          music,
          wwe,
          rental,
          cartoons,
          consoleLaunches
        }),
        isLoaded: () => isLoaded,
        monthNameFromNumber,
        getCultureCategoryDefinitions,
        getConsoleLaunchesForMonth,
        renderConsoleLaunchResult,
        showSpecificGame,
        setLandingChromeVisible,
        scrollResultViewToTop,
        writeViewHistory
      });

      renderBirthdayList = birthdayFeature.renderBirthdayList;
    }

    async function loadDataIntoApp() {
      const statusEl = document.getElementById("status");

      try {
        statusEl.textContent = "Loading data from all sheets...";

        const data = await loadAllData();
        games = data.games;
        cinema = data.cinema;
        music = data.music;
        wwe = data.wwe;
        rental = data.rental;
        cartoons = data.cartoons;
        retroWeekend = data.retroWeekend;
        consoleLaunches = data.consoleLaunches;
        uniqueGameTitles = getUniqueGameTitles(games);
        isLoaded = true;

        const unavailableSections = [
          data.cinemaLoaded ? null : "cinema",
          data.musicLoaded ? null : "music",
          data.wweLoaded ? null : "wrestling",
          data.rentalLoaded ? null : "rental",
          data.cartoonsLoaded ? null : "kids TV",
          data.retroWeekendLoaded ? null : "retro weekend",
          data.consoleLoaded ? null : "console launches"
        ].filter(Boolean);

        statusEl.textContent =
          `Loaded ${data.counts.games} games, ${data.counts.cinema} films, ` +
          `${data.counts.music} tracks, ${data.counts.wwe} wrestling events` +
          (data.rentalLoaded ? `, ${data.counts.rental} rental titles` : ", rental not loaded") +
          (data.cartoonsLoaded ? `, ${data.counts.cartoons} kids TV entries` : ", kids TV not loaded") +
          (data.consoleLoaded ? `, ${data.counts.consoleLaunches} console launches.` : ", console launches not loaded.") +
          (unavailableSections.length ? ` Some sections could not load: ${unavailableSections.join(", ")}.` : "");

        const sharedState = readSharedUrlState();
        if (sharedState) {
          statusEl.textContent =
            `Showing shared Retro Weekend for ${sharedState.game.title}` +
            (sharedState.game.console ? ` on ${sharedState.game.console}` : "");
          window.history.replaceState(
            { [APP_HISTORY_KEY]: true, view: getGameHistoryState(sharedState.game) },
            "",
            window.location.href
          );
          showSpecificGame(sharedState.game, {
            populateInput: true,
            initialSelections: sharedState.selections,
            includedCategories: sharedState.includedCategories,
            skipHistory: true
          });
        } else {
          const hashState = parseViewStateFromHash();
          if (hashState) {
            window.history.replaceState({ [APP_HISTORY_KEY]: true, view: hashState }, "", window.location.href);
            restoreHistoryView(hashState);
          } else {
            writeViewHistory({ type: "home" }, { replace: true });
            renderOnThisMonth();
          }
        }
      } catch (err) {
        console.error("loadAllData error:", err);
        statusEl.textContent = "Error loading data. Check the sheet share settings and tab names, then reload.";
      }
    }


    const gameInput = document.getElementById("game-input");
    const resultsGameInput = document.getElementById("results-game-input");
    const suggestionsEl = document.getElementById("suggestions");
    const resultsSuggestionsEl = document.getElementById("results-suggestions");

    function setSuggestionExpanded(source, expanded) {
      const inputEl = source === "results" ? resultsGameInput : gameInput;
      inputEl.setAttribute("aria-expanded", expanded ? "true" : "false");
    }

    function syncSearchInputs(value) {
      if (gameInput.value !== value) {
        gameInput.value = value;
      }
      if (resultsGameInput.value !== value) {
        resultsGameInput.value = value;
      }
    }

    function clearSuggestions(source) {
      const targets = source === "primary"
        ? [suggestionsEl]
        : source === "results"
          ? [resultsSuggestionsEl]
          : [suggestionsEl, resultsSuggestionsEl];

      targets.forEach((target) => {
        target.innerHTML = "";
        target.style.display = "none";
      });

      if (source === "primary") {
        setSuggestionExpanded("primary", false);
      } else if (source === "results") {
        setSuggestionExpanded("results", false);
      } else {
        setSuggestionExpanded("primary", false);
        setSuggestionExpanded("results", false);
      }
    }

    function renderSuggestions(list, query, source = "primary") {
      const targetSuggestionsEl = source === "results" ? resultsSuggestionsEl : suggestionsEl;
      targetSuggestionsEl.innerHTML = "";
      if (!query || !list.length) { clearSuggestions(source); return; }

      clearSuggestions(source === "results" ? "primary" : "results");
      targetSuggestionsEl.style.display = "block";
      setSuggestionExpanded(source, true);
      list.forEach(title => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.setAttribute("role", "option");
        item.tabIndex = 0;
        item.textContent = title;
        const chooseSuggestion = () => {
          syncSearchInputs(title);
          clearSuggestions();
          handleExactTitleSelection(title);
        };
        item.addEventListener("mousedown", chooseSuggestion);
        item.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseSuggestion();
          }
        });
        targetSuggestionsEl.appendChild(item);
      });
    }

    function getSuggestionTitles(query) {
      if (typeof getSuggestedGameTitles === "function") {
        return getSuggestedGameTitles(games, query);
      }

      const normalizedQuery = normalizeGameSearchText(query);
      if (!normalizedQuery) return [];

      return uniqueGameTitles.filter((title) =>
        normalizeGameSearchText(title).includes(normalizedQuery)
      );
    }

    function handleInputChange(source = "primary") {
      const inputEl = source === "results" ? resultsGameInput : gameInput;
      const query = inputEl.value.trim();
      if (!isLoaded || !normalizeGameSearchText(query)) { clearSuggestions(source); return; }

      const matches = getSuggestionTitles(query);
      renderSuggestions(matches, query, source);
    }

    gameInput.addEventListener("input", () => handleInputChange("primary"));
    gameInput.addEventListener("blur", () => setTimeout(() => clearSuggestions("primary"), 150));
    resultsGameInput.addEventListener("input", () => {
      handleInputChange("results");
    });
    resultsGameInput.addEventListener("blur", () => setTimeout(() => clearSuggestions("results"), 150));

    function handleSearch(event) {
      event.preventDefault();
      const statusEl = document.getElementById("status");
      const query = gameInput.value.trim();

      clearSuggestions();
      if (!query) return;

      if (!isLoaded) {
        statusEl.textContent = "Still loading data. Try again in a moment.";
        return;
      }

      clearShareableUrl();
      const primaryLaunchMatch = findPrimaryConsoleLaunchMatch(query);
      if (primaryLaunchMatch) {
        renderConsoleLaunchResult(primaryLaunchMatch);
        return;
      }

      const matches = findGameMatches(games, query);

      if (!matches.length) {
        const launchMatches = findConsoleLaunchMatches(query);
        if (launchMatches.length) {
          renderConsoleLaunchResult(launchMatches[0]);
          return;
        }

        statusEl.textContent = `No games found for "${query}".`;
        renderResults([], query);
        return;
      }

      const consoles = [...new Set(matches.map(m => (m.console || "").trim()))];
      if (matches.length > 1 && consoles.length > 1) {
        showConsoleChooser(matches, query);
        return;
      }

      statusEl.textContent = `Found ${matches.length} matching game(s).`;
      renderResults(matches, query);
    }

    function handleResultsSearch(event) {
      event.preventDefault();
      syncSearchInputs(resultsGameInput.value);
      document.getElementById("search-button").click();
    }

    function handleExactTitleSelection(title) {
      const statusEl = document.getElementById("status");
      clearShareableUrl();
      const normalizedTitle = normalizeGameSearchText(title);
      const exactMatches = games.filter((game) =>
        normalizeGameSearchText(game.title) === normalizedTitle
      );

      if (!exactMatches.length) {
        document.getElementById("search-button").click();
        return;
      }

      const consoles = [...new Set(exactMatches.map((match) => (match.console || "").trim()))];
      if (exactMatches.length > 1 && consoles.length > 1) {
        statusEl.textContent = `Multiple versions found for "${title}". Choose a console.`;
        showConsoleChooser(exactMatches, title);
        return;
      }

      statusEl.textContent = `Found ${exactMatches.length} matching game(s).`;
      renderResults(exactMatches, title);
    }

    function getRetroWeekendItems(game, customSelections = {}, includedCategories = null) {
      const entry = retroWeekend.find((item) => item.month === game.month && item.year === game.year);
      const presetItems = {
        cinema: entry && entry.cinemaTitle ? {
          label: "Cinema",
          title: entry.cinemaTitle,
          imageUrl: entry.cinemaImageUrl,
          month: game.month,
          year: game.year
        } : null,
        rental: entry && entry.rentalTitle ? {
          label: "Rental",
          title: entry.rentalTitle,
          imageUrl: entry.rentalImageUrl,
          month: game.month,
          year: game.year
        } : null,
        wwe: entry && entry.wweTitle ? {
          label: "Wrestling",
          title: entry.wweTitle,
          imageUrl: entry.wweImageUrl,
          month: game.month,
          year: game.year
        } : null,
        cartoons: entry && entry.cartoonsTitle ? {
          label: "Kids TV",
          title: entry.cartoonsTitle,
          imageUrl: entry.cartoonsImageUrl,
          month: game.month,
          year: game.year
        } : null,
        music: entry && entry.musicTitle ? {
          label: "Single",
          title: entry.musicTitle,
          imageUrl: entry.musicImageUrl,
          url: entry.musicUrl || "",
          linkMode: "youtube",
          month: game.month,
          year: game.year
        } : null,
        
      };

      return [
        { key: "cinema", label: "Cinema" },
        { key: "rental", label: "Rental" },
        { key: "music", label: "Single" },
        { key: "cartoons", label: "Kids TV" },
        { key: "wwe", label: "Wrestling" }
      ]
        .filter((category) => !includedCategories || includedCategories[category.key] !== false)
        .map((category) => {
          const selected = customSelections[category.key];
          if (selected && selected.title) {
            return {
              label: category.label,
              title: selected.title,
              imageUrl: selected.imageUrl || "",
              month: game.month,
              year: game.year,
              url: selected.url || "",
              linkMode: selected.linkMode || ""
            };
          }

          return presetItems[category.key];
        })
        .filter((item) => item && item.title);
    }

    function normalizeLookupText(value) {
      return String(value || "").trim().toLowerCase();
    }

    function findMusicEntry(month, year, title) {
      const normalizedTitle = normalizeLookupText(title);
      if (!normalizedTitle) return null;

      return music.find((entry) =>
        entry.month === month &&
        entry.year === year &&
        normalizeLookupText(entry.title) === normalizedTitle
      ) || null;
    }

    function getDefaultRetroWeekendSelections(game) {
      const entry = retroWeekend.find((item) => item.month === game.month && item.year === game.year);
      if (!entry) return {};
      const musicEntry = findMusicEntry(game.month, game.year, entry.musicTitle);

      return {
        ...(entry.cinemaTitle ? {
          cinema: {
            title: entry.cinemaTitle,
            imageUrl: entry.cinemaImageUrl || "",
            url: "",
            linkMode: "imdb"
          }
        } : {}),
        ...(entry.rentalTitle ? {
          rental: {
            title: entry.rentalTitle,
            imageUrl: entry.rentalImageUrl || "",
            url: "",
            linkMode: "imdb"
          }
        } : {}),
        ...(entry.cartoonsTitle ? {
          cartoons: {
            title: entry.cartoonsTitle,
            imageUrl: entry.cartoonsImageUrl || "",
            url: "",
            linkMode: ""
          }
        } : {}),
        ...(entry.wweTitle ? {
          wwe: {
            title: entry.wweTitle,
            imageUrl: entry.wweImageUrl || "",
            url: "",
            linkMode: ""
          }
        } : {}),
        ...(entry.musicTitle ? {
          music: {
            title: entry.musicTitle,
            imageUrl: entry.musicImageUrl || musicEntry?.imageUrl || "",
            url: entry.musicUrl || musicEntry?.url || "",
            linkMode: "youtube"
          }
        } : {})
      };
    }

    function mergeRetroWeekendSelections(defaultSelections, parsedSelections) {
      const merged = {};
      const categoryKeys = ["cinema", "rental", "music", "cartoons", "wwe"];

      categoryKeys.forEach((key) => {
        const defaultSelection = defaultSelections[key];
        const parsedSelection = parsedSelections && typeof parsedSelections === "object" ? parsedSelections[key] : null;

        if (parsedSelection && typeof parsedSelection === "object") {
          merged[key] = {
            ...(defaultSelection || {}),
            ...parsedSelection
          };
          return;
        }

        if (defaultSelection) {
          merged[key] = { ...defaultSelection };
        }
      });

      return merged;
    }

    function stripDefaultRetroWeekendSelections(defaultSelections, savedSelections) {
      const stripped = {};
      const categoryKeys = ["cinema", "rental", "music", "cartoons", "wwe"];

      categoryKeys.forEach((key) => {
        const savedSelection = savedSelections && savedSelections[key];
        if (!savedSelection || typeof savedSelection !== "object") return;

        const defaultSelection = defaultSelections[key];
        if (defaultSelection && defaultSelection.title === savedSelection.title) {
          return;
        }

        stripped[key] = { ...savedSelection };
      });

      return stripped;
    }

    function getSectionItemDestination(item, linkMode) {
      if (!item || !item.title) return null;
      if (item.url) {
        return item.url;
      }
      if (linkMode === "imdb") {
        return `https://www.imdb.com/find?q=${encodeURIComponent(item.title)}`;
      }
      if (linkMode === "youtube") {
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}`;
      }
      return null;
    }

    function getRetroWeekendDestination(item) {
      if (!item || !item.title) return null;

      const directDestination = getSectionItemDestination(item, item.linkMode);
      if (directDestination) {
        return directDestination;
      }

      if (item.label === "Cinema" || item.label === "Rental") {
        return `https://www.imdb.com/find?q=${encodeURIComponent(item.title)}`;
      }

      if (item.label === "Wrestling") {
        const match = wwe.find((entry) =>
          entry.month === item.month &&
          entry.year === item.year &&
          normalizeLookupText(entry.title) === normalizeLookupText(item.title) &&
          entry.url
        );
        return match?.url || null;
      }

      if (item.label === "Kids TV") {
        const match = cartoons.find((entry) =>
          entry.month === item.month &&
          entry.year === item.year &&
          normalizeLookupText(entry.title) === normalizeLookupText(item.title) &&
          entry.url
        );
        return match?.url || null;
      }

      return null;
    }

    function isSingleItem(item) {
      return item && item.label === "Single";
    }

    function appendSingleArtwork(imageWrap, imageUrl, altText, onError) {
      const background = document.createElement("img");
      background.src = imageUrl;
      background.alt = "";
      background.loading = "lazy";
      background.referrerPolicy = "no-referrer";
      background.className = "single-art-bg";

      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = altText;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.className = "single-art-main";

      let failed = false;
      function handleError() {
        if (failed) return;
        failed = true;
        background.remove();
        image.remove();
        onError();
      }

      background.addEventListener("error", handleError, { once: true });
      image.addEventListener("error", handleError, { once: true });

      imageWrap.appendChild(background);
      imageWrap.appendChild(image);
    }

    function createRetroWeekendTile(item, grid, card) {
      const destination = getRetroWeekendDestination(item);
      const tile = document.createElement(destination ? "a" : "div");
      tile.className = "retro-weekend-item";
      if (destination) {
        tile.href = destination;
        tile.target = "_blank";
        tile.rel = "noopener noreferrer";
      }

      const thumb = document.createElement("div");
      thumb.className = isSingleItem(item) ? "retro-weekend-thumb retro-weekend-thumb--single" : "retro-weekend-thumb";
      if (item.imageUrl) {
        if (isSingleItem(item)) {
          appendSingleArtwork(
            thumb,
            item.imageUrl,
            item.title ? `${item.label}: ${item.title}` : `${item.label} image`,
            () => {
              thumb.classList.add("retro-weekend-thumb--placeholder");
              setImagePendingPlaceholder(thumb, item.label);
            }
          );
        } else {
          const image = document.createElement("img");
          image.src = item.imageUrl;
          image.alt = item.title ? `${item.label}: ${item.title}` : `${item.label} image`;
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          image.addEventListener("error", () => {
            thumb.classList.add("retro-weekend-thumb--placeholder");
            setImagePendingPlaceholder(thumb, item.label);
          }, { once: true });
          thumb.appendChild(image);
        }
      } else {
        thumb.classList.add("retro-weekend-thumb--placeholder");
        setImagePendingPlaceholder(thumb, item.label);
      }

      const label = document.createElement("div");
      label.className = "retro-weekend-label";
      label.textContent = item.label;

      const name = document.createElement("div");
      name.className = "retro-weekend-name";
      name.textContent = item.title || item.label;

      tile.appendChild(thumb);
      tile.appendChild(label);
      tile.appendChild(name);
      grid.appendChild(tile);
    }

    function getShareCardItems(game, selections, gameImageUrl = "", includedCategories = null) {
      const gameItem = includedCategories && includedCategories.game === false
        ? []
        : [{
          label: "Game",
          title: game.console ? `${game.title} - ${game.console}` : game.title,
          imageUrl: gameImageUrl
        }];

      return [
        ...gameItem,
        ...getRetroWeekendItems(game, selections, includedCategories).map((item) => ({
          label: item.label,
          title: item.title,
          imageUrl: item.imageUrl || ""
        }))
      ];
    }

    function buildRetroWeekendShareText(game, selections, includedCategories = null) {
      const lines = [
        "My Game Rewind UK Retro Weekend",
        `${game.title}${game.console ? ` - ${game.console}` : ""}`,
        `${monthNameFromNumber(game.month)} ${game.year}`,
        "",
        ...getShareCardItems(game, selections, "", includedCategories).map((item) => `${item.label}: ${item.title}`),
        "",
        "Made with Game Rewind UK"
      ];

      return lines.join("\n");
    }

    function renderHtmlShareCard(target, game, selections, gameImageUrl = "", includedCategories = null, templateKey = "standard") {
      const items = getShareCardItems(game, selections, gameImageUrl, includedCategories).slice(0, 6);
      const template = getShareCardTemplate(templateKey);

      target.innerHTML = "";

      const shell = document.createElement("div");
      shell.className = `html-share-card html-share-card--${template.key}`;
      const templateBackground = template.backgroundUrl || "";
      shell.style.setProperty("--share-card-bg", templateBackground ? `url("${templateBackground}")` : "none");

      const content = document.createElement("div");
      content.className = "html-share-card-content";

      const brand = document.createElement("div");
      brand.className = "html-share-card-brand";
      brand.textContent = "GAME REWIND UK";

      const templateTag = document.createElement("div");
      templateTag.className = "html-share-card-template-tag";
      templateTag.textContent = template.label;

      const title = document.createElement("div");
      title.className = "html-share-card-title";
      title.textContent = "YOUR RETRO WEEKEND";

      const meta = document.createElement("div");
      meta.className = "html-share-card-meta";
      meta.textContent = `${monthNameFromNumber(game.month)} ${game.year}`;

      const grid = document.createElement("div");
      grid.className = "html-share-card-grid";

      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "html-share-card-empty";
        empty.textContent = "No categories selected.";
        grid.appendChild(empty);
      }

      items.forEach((item) => {
        const tile = document.createElement("div");
        tile.className = "html-share-card-tile";

        const imageWrap = document.createElement("div");
        imageWrap.className = isSingleItem(item) ? "html-share-card-image html-share-card-image--single" : "html-share-card-image";

        if (item.imageUrl) {
          if (isSingleItem(item)) {
            appendSingleArtwork(
              imageWrap,
              item.imageUrl,
              `${item.label}: ${item.title}`,
              () => {
                imageWrap.classList.add("is-placeholder");
                setImagePendingPlaceholder(imageWrap, item.label);
              }
            );
          } else {
            const image = document.createElement("img");
            image.src = item.imageUrl;
            image.alt = `${item.label}: ${item.title}`;
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => {
              image.remove();
              imageWrap.classList.add("is-placeholder");
              setImagePendingPlaceholder(imageWrap, item.label);
            }, { once: true });
            imageWrap.appendChild(image);
          }
        } else {
          imageWrap.classList.add("is-placeholder");
          setImagePendingPlaceholder(imageWrap, item.label);
        }

        const label = document.createElement("div");
        label.className = "html-share-card-label";
        label.textContent = item.label;

        const name = document.createElement("div");
        name.className = "html-share-card-name";
        name.textContent = item.title;

        tile.appendChild(imageWrap);
        tile.appendChild(label);
        tile.appendChild(name);
        grid.appendChild(tile);
      });

      const footer = document.createElement("div");
      footer.className = "html-share-card-footer";
      footer.textContent = "gamerewind.uk";

      if (template.showBrand !== false) {
        content.appendChild(brand);
      }
      if (template.showTemplateTag !== false) {
        content.appendChild(templateTag);
      }
      content.appendChild(title);
      content.appendChild(meta);
      content.appendChild(grid);
      if (template.showFooter !== false) {
        content.appendChild(footer);
      }
      shell.appendChild(content);
      target.appendChild(shell);
    }

    function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      const lines = [];
      let line = "";

      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxWidth || !line) {
          line = testLine;
          return;
        }

        lines.push(line);
        line = word;
      });

      if (line) {
        lines.push(line);
      }

      const visibleLines = lines.slice(0, maxLines);
      if (lines.length > maxLines && visibleLines.length) {
        let lastLine = visibleLines[visibleLines.length - 1];
        while (lastLine.length && ctx.measureText(`${lastLine}...`).width > maxWidth) {
          lastLine = lastLine.slice(0, -1).trim();
        }
        visibleLines[visibleLines.length - 1] = `${lastLine}...`;
      }

      visibleLines.forEach((lineText, index) => {
        ctx.fillText(lineText, x, y + (index * lineHeight));
      });

      return y + (visibleLines.length * lineHeight);
    }

    function loadImageFromDataUrl(src) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
      });
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    }

    async function loadShareCardImage(src) {
      if (!src) return null;

      const canvasSafeSrc = getCanvasSafeImageUrl(src);
      if (!canvasSafeSrc) return null;

      if (canvasSafeSrc.startsWith("data:")) {
        return loadImageFromDataUrl(canvasSafeSrc);
      }

      try {
        const response = await fetch(canvasSafeSrc, {
          mode: "cors",
          referrerPolicy: "no-referrer"
        });
        if (!response.ok) return null;

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return dataUrl ? loadImageFromDataUrl(dataUrl) : null;
      } catch (err) {
        return null;
      }
    }

    async function loadShareCardTemplateBackground(src) {
      const value = String(src || "").trim();
      if (!value) return null;

      if (value.startsWith("data:")) {
        return loadImageFromDataUrl(value);
      }

      let imageSrc = value;
      try {
        imageSrc = new URL(value, window.location.href).href;
      } catch (err) {
        imageSrc = value;
      }

      try {
        const response = await fetch(imageSrc);
        if (!response.ok) return null;

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return dataUrl ? loadImageFromDataUrl(dataUrl) : null;
      } catch (err) {
        return null;
      }
    }

    function getCanvasSafeImageUrl(src) {
      const value = String(src || "").trim();
      if (!value || value.startsWith("data:") || value.startsWith("blob:")) {
        return value;
      }

      if (!/^https?:\/\//i.test(value)) {
        try {
          return new URL(value, window.location.href).href;
        } catch (err) {
          return value;
        }
      }

      if (value.includes("images.weserv.nl/")) {
        return value;
      }

      try {
        const url = new URL(value);
        if (url.origin === window.location.origin) {
          return url.href;
        }
      } catch (err) {
        return value;
      }

      return `https://images.weserv.nl/?url=${encodeURIComponent(value)}`;
    }

    function drawCanvasImageContain(ctx, image, x, y, width, height) {
      const imageRatio = image.width / image.height;
      const boxRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;

      if (imageRatio > boxRatio) {
        drawHeight = width / imageRatio;
      } else {
        drawWidth = height * imageRatio;
      }

      const drawX = x + ((width - drawWidth) / 2);
      const drawY = y + ((height - drawHeight) / 2);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    function drawCanvasImageCover(ctx, image, x, y, width, height) {
      const imageRatio = image.width / image.height;
      const boxRatio = width / height;
      let sourceWidth = image.width;
      let sourceHeight = image.height;
      let sourceX = 0;
      let sourceY = 0;

      if (imageRatio > boxRatio) {
        sourceWidth = image.height * boxRatio;
        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / boxRatio;
        sourceY = (image.height - sourceHeight) / 2;
      }

      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    }

    async function drawRetroWeekendShareCard(canvas, game, selections, gameImageUrl = "", includedCategories = null, templateKey = "standard") {
      const ctx = canvas.getContext("2d");
      const width = 1080;
      const height = 1920;
      const items = getShareCardItems(game, selections, gameImageUrl, includedCategories).slice(0, 6);
      const template = getShareCardTemplate(templateKey);
      const loadedImages = await Promise.all([
        loadShareCardTemplateBackground(getShareCardTemplateExportBackground(template)),
        ...items.map((item) => loadShareCardImage(item.imageUrl))
      ]);
      const backgroundImage = loadedImages[0];
      const itemImages = loadedImages.slice(1);
      const box = template.box;

      canvas.width = width;
      canvas.height = height;

      if (backgroundImage) {
        drawCanvasImageCover(ctx, backgroundImage, 0, 0, width, height);
      } else if (template.key === "standard") {
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, "#080914");
        bg.addColorStop(0.55, "#121223");
        bg.addColorStop(1, "#071a22");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(255, 246, 216, 0.12)";
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 18) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        for (let x = 0; x < width; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        ctx.strokeStyle = "#46dfff";
        ctx.lineWidth = 6;
        ctx.strokeRect(36, 36, width - 72, height - 72);
        ctx.strokeStyle = "#ffd84a";
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 52, width - 104, height - 104);
      } else {
        ctx.fillStyle = "#080914";
        ctx.fillRect(0, 0, width, height);
      }

      if (template.panel && template.panel !== "rgba(0, 0, 0, 0)") {
        ctx.fillStyle = template.panel;
        ctx.fillRect(box.x, box.y, box.width, box.height);
      }

      const inset = 28;
      const contentX = box.x + inset;
      const contentWidth = box.width - (inset * 2);
      let cursorY = box.y + inset;

      ctx.textAlign = "center";

      if (template.showBrand !== false) {
        ctx.fillStyle = template.accent;
        ctx.font = "700 24px 'Chakra Petch', sans-serif";
        ctx.fillText("GAME REWIND UK", box.x + (box.width / 2), cursorY + 24);
        cursorY += 34;
      }

      if (template.showTemplateTag !== false) {
        ctx.fillStyle = template.muted;
        ctx.font = "700 22px 'Chakra Petch', sans-serif";
        ctx.fillText(template.label.toUpperCase(), box.x + (box.width / 2), cursorY + 24);
        cursorY += 34;
      }

      ctx.fillStyle = template.text;
      ctx.font = "700 46px 'Chakra Petch', sans-serif";
      ctx.fillText("YOUR RETRO WEEKEND", box.x + (box.width / 2), cursorY + 56);

      ctx.fillStyle = template.muted;
      ctx.font = "700 30px 'Chakra Petch', sans-serif";
      ctx.fillText(`${monthNameFromNumber(game.month)} ${game.year}`, box.x + (box.width / 2), cursorY + 100);
      ctx.textAlign = "left";

      cursorY += 142;

      if (!items.length) {
        ctx.fillStyle = template.text;
        ctx.font = "700 28px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No categories selected.", box.x + (box.width / 2), cursorY + 80);
        ctx.textAlign = "left";
      }

      const gap = 18;
      const columns = 3;
      const cardWidth = (contentWidth - (gap * (columns - 1))) / columns;
      const footerSpace = template.showFooter === false ? 12 : 70;
      const remainingHeight = Math.max(360, box.y + box.height - cursorY - footerSpace);
      const rows = Math.max(1, Math.ceil(items.length / columns));
      const itemHeight = Math.min(390, (remainingHeight - (gap * (rows - 1))) / rows);
      const imageHeight = Math.max(130, itemHeight - 112);

      items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = contentX + (column * (cardWidth + gap));
        const y = cursorY + (row * (itemHeight + gap));
        const image = itemImages[index];
        const strokeWidth = template.key === "game-box" ? 0 : 2;
        const imageInset = strokeWidth || 2;
        const imageX = x + imageInset;
        const imageY = y + imageInset;
        const imageWidth = cardWidth - (imageInset * 2);
        const insetImageHeight = imageHeight - imageInset;

        ctx.fillStyle = template.key === "web-y2k" || template.key === "game-box"
          ? "rgba(255, 255, 255, 0.72)"
          : "rgba(0, 0, 0, 0.48)";
        ctx.fillRect(x, y, cardWidth, itemHeight);

        if (image) {
          try {
            if (isSingleItem(item)) {
              ctx.save();
              ctx.filter = "blur(16px) saturate(1.25)";
              drawCanvasImageCover(ctx, image, imageX - 12, imageY - 12, imageWidth + 24, insetImageHeight + 24);
              ctx.restore();

              ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
              ctx.fillRect(imageX, imageY, imageWidth, insetImageHeight);
            }

            if (isSingleItem(item)) {
              const singleZoom = 1.16;
              const zoomWidth = imageWidth * singleZoom;
              const zoomHeight = insetImageHeight * singleZoom;
              drawCanvasImageCover(
                ctx,
                image,
                imageX - ((zoomWidth - imageWidth) / 2),
                imageY - ((zoomHeight - insetImageHeight) / 2),
                zoomWidth,
                zoomHeight
              );
            } else {
              drawCanvasImageContain(ctx, image, imageX, imageY, imageWidth, insetImageHeight);
            }
          } catch (err) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
            ctx.fillRect(imageX, imageY, imageWidth, insetImageHeight);
          }
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
          ctx.fillRect(imageX, imageY, imageWidth, insetImageHeight);
          ctx.fillStyle = template.accent;
          ctx.font = "700 22px 'Chakra Petch', sans-serif";
          ctx.fillText(item.label.toUpperCase(), x + 16, y + 68);
          ctx.fillStyle = template.muted;
          ctx.font = "700 18px 'Chakra Petch', sans-serif";
          ctx.fillText("IMAGE PENDING", x + 16, y + 100);
        }

        if (template.key !== "game-box") {
          ctx.strokeStyle = template.muted;
          ctx.lineWidth = strokeWidth;
          ctx.strokeRect(x, y, cardWidth, itemHeight);
        }

        ctx.fillStyle = template.accent;
        ctx.font = "700 18px 'Chakra Petch', sans-serif";
        ctx.fillText(item.label.toUpperCase(), x + 14, y + imageHeight + 28);

        ctx.fillStyle = template.text;
        ctx.font = "700 21px 'Chakra Petch', sans-serif";
        wrapCanvasText(ctx, item.title, x + 14, y + imageHeight + 58, cardWidth - 28, 26, 3);
      });

      if (template.showFooter !== false) {
        ctx.fillStyle = template.footer;
        ctx.font = "700 24px 'Chakra Petch', sans-serif";
        ctx.fillText("gamerewind.uk", contentX, box.y + box.height - 24);
      }

      return canvas;
    }

    function getShareCardFileName(game, extension) {
      const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthPart = monthAbbreviations[(game.month || 1) - 1] || "Month";
      const yearPart = String(game.year || "").slice(-2) || "YY";
      return `RetroWeekend${monthPart}${yearPart}.${extension}`;
    }

    function canvasToBlob(canvas, type = "image/png", quality = 0.9) {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
      });
    }

    function isMobileShareDevice() {
      return window.matchMedia("(pointer: coarse)").matches ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    }

    function downloadShareCard(dataUrl, game, extension = "png") {
      const link = document.createElement("a");

      link.href = dataUrl;
      link.download = getShareCardFileName(game, extension);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    async function shareOrDownloadMobileJpg(canvas, game) {
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      if (!blob) {
        throw new Error("Could not create JPG");
      }

      const file = new File([blob], getShareCardFileName(game, "jpg"), { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: "My Game Rewind UK Retro Weekend",
          text: "Made with Game Rewind UK"
        });
        return;
      }

      downloadShareCard(URL.createObjectURL(blob), game, "jpg");
    }

    function renderRetroWeekendCard(game, initialSelections = {}, initialIncludedCategories = null) {
      const card = document.createElement("div");
      card.className = "card retro-weekend-card";
      let currentSelections = initialSelections;
      let gameCoverUrl = "";
      const includedCategories = normalizeIncludedCategories(initialIncludedCategories);

      const kicker = document.createElement("div");
      kicker.className = "retro-weekend-kicker";
      kicker.textContent = "YOUR RETRO WEEKEND";

      const title = document.createElement("div");
      title.className = "retro-weekend-title";
      title.textContent = `${monthNameFromNumber(game.month)} ${game.year} picks`;

      const titleRow = document.createElement("div");
      titleRow.className = "retro-weekend-title-row";

      const titleActions = document.createElement("div");
      titleActions.className = "retro-weekend-title-actions";

      const createShareButton = document.createElement("button");
      createShareButton.type = "button";
      createShareButton.className = "share-card-button";
      createShareButton.textContent = "Create share card";

      const copyLinkButton = document.createElement("button");
      copyLinkButton.type = "button";
      copyLinkButton.className = "share-card-button is-secondary";
      copyLinkButton.textContent = "Copy link";

      const copy = document.createElement("div");
      copy.className = "retro-weekend-copy";
      copy.textContent = "A visual rewind for this release month. Build your own Retro Weekend from the lists below.";

      const includePanel = document.createElement("div");
      includePanel.className = "include-panel";

      const includeLabel = document.createElement("div");
      includeLabel.className = "include-panel-label";
      includeLabel.textContent = "Include in card";

      const includeControls = document.createElement("div");
      includeControls.className = "include-controls";

      const includeOptions = [
        { key: "game", label: "Game" },
        { key: "cinema", label: "Cinema" },
        { key: "rental", label: "Rental" },
        { key: "music", label: "Single" },
        { key: "cartoons", label: "Kids TV" },
        { key: "wwe", label: "Wrestling" }
      ];

      includeOptions.forEach((option) => {
        const label = document.createElement("label");
        label.className = "include-toggle";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = includedCategories[option.key] !== false;
        input.addEventListener("change", () => {
          includedCategories[option.key] = input.checked;
          shareCardDataUrl = "";
          syncCurrentShareUrl();
          renderTiles();
          if (!shareModal.classList.contains("is-hidden")) {
            createShareCard();
          }
        });

        const text = document.createElement("span");
        text.textContent = option.label;

        label.appendChild(input);
        label.appendChild(text);
        includeControls.appendChild(label);
      });

      includePanel.appendChild(includeLabel);
      includePanel.appendChild(includeControls);

      const grid = document.createElement("div");
      grid.className = "retro-weekend-grid";

      const shareModal = document.createElement("div");
      shareModal.className = "share-card-modal is-hidden";
      shareModal.setAttribute("role", "dialog");
      shareModal.setAttribute("aria-modal", "true");
      shareModal.setAttribute("aria-label", "Retro Weekend share card");
      shareModal.tabIndex = -1;

      const shareModalPanel = document.createElement("div");
      shareModalPanel.className = "share-card-modal-panel";

      const shareModalHeader = document.createElement("div");
      shareModalHeader.className = "share-card-modal-header";

      const shareModalTitle = document.createElement("div");
      shareModalTitle.className = "share-card-modal-title";
      shareModalTitle.textContent = "Your share card";

      const sharePreview = document.createElement("div");
      sharePreview.className = "share-card-preview";

      const templateControl = document.createElement("label");
      templateControl.className = "share-template-control";
      templateControl.textContent = "Card style";

      const templateSelect = document.createElement("select");
      templateSelect.className = "share-template-select";
      SHARE_CARD_TEMPLATES.forEach((template) => {
        const option = document.createElement("option");
        option.value = template.key;
        option.textContent = template.label;
        templateSelect.appendChild(option);
      });
      templateControl.appendChild(templateSelect);

      const shareActions = document.createElement("div");
      shareActions.className = "share-card-actions";

      const downloadShareButton = document.createElement("button");
      downloadShareButton.type = "button";
      downloadShareButton.className = "share-card-button";
      downloadShareButton.textContent = isMobileShareDevice() ? "Share JPG" : "Download PNG";

      const copyShareButton = document.createElement("button");
      copyShareButton.type = "button";
      copyShareButton.className = "share-card-button is-secondary";
      copyShareButton.textContent = "Copy text";

      const closeShareButton = document.createElement("button");
      closeShareButton.type = "button";
      closeShareButton.className = "share-card-button is-secondary";
      closeShareButton.textContent = "Close";

      let shareCardDataUrl = "";
      let shareCardCanvas = null;
      let selectedTemplateKey = SHARE_CARD_TEMPLATES[0].key;
      let sharePreviewRequestId = 0;

      card.appendChild(kicker);
      titleRow.appendChild(title);
      titleActions.appendChild(createShareButton);
      titleActions.appendChild(copyLinkButton);
      titleRow.appendChild(titleActions);
      card.appendChild(titleRow);
      card.appendChild(copy);
      card.appendChild(includePanel);
      card.appendChild(grid);
      shareModalHeader.appendChild(shareModalTitle);
      shareModalHeader.appendChild(closeShareButton);
      shareActions.appendChild(downloadShareButton);
      shareActions.appendChild(copyShareButton);
      shareModalPanel.appendChild(shareModalHeader);
      shareModalPanel.appendChild(templateControl);
      shareModalPanel.appendChild(sharePreview);
      shareModalPanel.appendChild(shareActions);
      shareModal.appendChild(shareModalPanel);
      document.body.appendChild(shareModal);

      function closeShareModal() {
        shareModal.classList.add("is-hidden");
        document.body.classList.remove("has-share-modal");
      }

      async function renderShareCardPreview() {
        const requestId = ++sharePreviewRequestId;

        if (!isMobileShareDevice()) {
          renderHtmlShareCard(sharePreview, game, currentSelections, gameCoverUrl, includedCategories, selectedTemplateKey);
          return;
        }

        sharePreview.innerHTML = "";
        const loading = document.createElement("div");
        loading.className = "share-card-preview-loading";
        loading.textContent = "Preparing preview...";
        sharePreview.appendChild(loading);

        try {
          if (!shareCardCanvas) {
            const canvas = document.createElement("canvas");
            shareCardCanvas = await drawRetroWeekendShareCard(canvas, game, currentSelections, gameCoverUrl, includedCategories, selectedTemplateKey);
          }

          if (requestId !== sharePreviewRequestId) return;

          const image = document.createElement("img");
          image.className = "share-card-rendered-preview";
          image.alt = "Share card preview";
          image.src = shareCardCanvas.toDataURL("image/jpeg", 0.9);
          sharePreview.innerHTML = "";
          sharePreview.appendChild(image);
        } catch (err) {
          if (requestId !== sharePreviewRequestId) return;
          renderHtmlShareCard(sharePreview, game, currentSelections, gameCoverUrl, includedCategories, selectedTemplateKey);
        }
      }

      function createShareCard() {
        createShareButton.disabled = true;
        createShareButton.textContent = "Opening...";
        try {
          renderShareCardPreview();
          shareModal.classList.remove("is-hidden");
          document.body.classList.add("has-share-modal");
          shareModal.focus();
        } finally {
          createShareButton.disabled = false;
          createShareButton.textContent = "Create share card";
        }
      }

      function syncCurrentShareUrl() {
        if (!window.location.search) return;

        window.history.replaceState(
          { [APP_HISTORY_KEY]: true, view: getGameHistoryState(game) },
          "",
          getShareableUrl(game, currentSelections, includedCategories)
        );
      }

      async function copyShareLink() {
        const url = getShareableUrl(game, currentSelections, includedCategories);

        function showCopiedFeedback() {
          copyLinkButton.textContent = "Link copied";
          window.setTimeout(() => {
            copyLinkButton.textContent = "Copy link";
          }, 1400);
        }

        try {
          await navigator.clipboard.writeText(url);
          showCopiedFeedback();
        } catch (err) {
          const input = document.createElement("input");
          input.value = url;
          input.setAttribute("readonly", "");
          input.style.position = "fixed";
          input.style.left = "-9999px";
          document.body.appendChild(input);
          input.select();

          try {
            if (document.execCommand("copy")) {
              showCopiedFeedback();
            } else {
              window.prompt("Copy your Retro Weekend link:", url);
            }
          } finally {
            input.remove();
          }
        }
      }

      async function copyShareText() {
        const text = buildRetroWeekendShareText(game, currentSelections, includedCategories);

        function showCopiedFeedback() {
          copyShareButton.textContent = "Copied";
          window.setTimeout(() => {
            copyShareButton.textContent = "Copy text";
          }, 1400);
        }

        try {
          await navigator.clipboard.writeText(text);
          showCopiedFeedback();
        } catch (err) {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();

          try {
            if (document.execCommand("copy")) {
              showCopiedFeedback();
            } else {
              window.prompt("Copy your Retro Weekend text:", text);
            }
          } finally {
            textarea.remove();
          }
        }
      }

      function renderTiles() {
        grid.innerHTML = "";

        if (includedCategories.game !== false) {
          createRetroWeekendTile({
            label: "Game",
            title: game.console ? `${game.title} - ${game.console}` : game.title,
            imageUrl: gameCoverUrl,
            month: game.month,
            year: game.year
          }, grid, card);
        }

        getRetroWeekendItems(game, currentSelections, includedCategories).forEach((item) => {
          createRetroWeekendTile(item, grid, card);
        });

        if (!grid.children.length) {
          const empty = document.createElement("div");
          empty.className = "retro-weekend-empty";
          empty.textContent = "No categories selected. Switch one back on to build your weekend.";
          grid.appendChild(empty);
        }
      }

      getCoverUrlForGame(game).then((coverUrl) => {
        gameCoverUrl = coverUrl || "";
        renderTiles();
      });

      createShareButton.addEventListener("click", createShareCard);
      copyLinkButton.addEventListener("click", copyShareLink);
      templateSelect.addEventListener("change", () => {
        selectedTemplateKey = templateSelect.value;
        shareCardDataUrl = "";
        shareCardCanvas = null;
        renderShareCardPreview();
      });
      downloadShareButton.addEventListener("click", async () => {
        downloadShareButton.disabled = true;
        downloadShareButton.textContent = "Preparing...";

        try {
          if (!shareCardCanvas) {
            const canvas = document.createElement("canvas");
            shareCardCanvas = await drawRetroWeekendShareCard(canvas, game, currentSelections, gameCoverUrl, includedCategories, selectedTemplateKey);
          }

          if (isMobileShareDevice()) {
            await shareOrDownloadMobileJpg(shareCardCanvas, game);
          } else {
            if (!shareCardDataUrl) {
              shareCardDataUrl = shareCardCanvas.toDataURL("image/png");
            }
            downloadShareCard(shareCardDataUrl, game, "png");
          }
        } catch (err) {
          window.alert(`Download failed: ${err?.message || "Try another card style or reload the page."}`);
        } finally {
          downloadShareButton.disabled = false;
          downloadShareButton.textContent = isMobileShareDevice() ? "Share JPG" : "Download PNG";
        }
      });
      copyShareButton.addEventListener("click", copyShareText);
      closeShareButton.addEventListener("click", closeShareModal);
      shareModal.addEventListener("click", (event) => {
        if (event.target === shareModal) {
          closeShareModal();
        }
      });
      shareModal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeShareModal();
        }
      });

      renderTiles();

      return {
        card,
        update(nextSelections) {
          currentSelections = nextSelections || {};
          shareCardDataUrl = "";
          shareCardCanvas = null;
          syncCurrentShareUrl();
          renderTiles();
          if (!shareModal.classList.contains("is-hidden")) {
            createShareCard();
          }
        }
      };
    }

    function renderResults(matches, query, options = {}) {
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      clearShareModals();
      resultsEl.innerHTML = "";
      const sharedGameKey = options.game ? getGameKey(options.game) : matches.length === 1 ? getGameKey(matches[0]) : "";
      if (!options.skipHistory) {
        if (matches.length === 1) {
          writeViewHistory(getGameHistoryState(matches[0]));
        } else {
          writeViewHistory({ type: "search", query });
        }
      }

      if (!matches.length) {
        const div = document.createElement("div");
        div.className = "no-results";
        div.textContent = `No games found for "${query}". Check the spelling or your Games sheet.`;
        resultsEl.appendChild(div);
        scrollResultViewToTop();
        return;
      }

      matches.forEach(game => {
        const releaseSummary = document.createElement("div");
        releaseSummary.className = "card release-summary";

        const releaseLine = document.createElement("div");
        releaseLine.className = "release-summary-line";
        releaseLine.textContent =
          `${game.title} - ${monthNameFromNumber(game.month)} ${game.year}` +
          (game.console ? ` - ${game.console}` : "");

        releaseSummary.appendChild(releaseLine);
        resultsEl.appendChild(releaseSummary);

        const card = document.createElement("div");
        card.className = "card";

const bg = document.createElement("div");
bg.className = "card-bg";
card.appendChild(bg);

getCoverUrlForGame(game).then((url) => {
  if (url) bg.style.backgroundImage = `url('${url}')`;
});


        const header = document.createElement("div");
        header.className = "card-header";

        const main = document.createElement("div");
        main.className = "card-header-main";

        const title = document.createElement("div");
        title.className = "card-title";
        title.textContent = "The rest of this month's releases";

        main.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "card-subtitle picks-subtitle";
        subtitle.textContent = "Make your own retro picks to create your ideal retro weekend.";
        main.appendChild(subtitle);

        header.appendChild(main);

        card.appendChild(header);

        const cultureCategories = getCultureCategoryDefinitions(game.month, game.year);
        const defaultSelections = getDefaultRetroWeekendSelections(game);
        const isSharedGame = sharedGameKey && getGameKey(game) === sharedGameKey;
        let savedSelections = isSharedGame ? { ...(options.initialSelections || {}) } : {};
        let effectiveSelections = mergeRetroWeekendSelections(defaultSelections, savedSelections);
        const retroWeekendController = renderRetroWeekendCard(
          game,
          effectiveSelections,
          isSharedGame ? options.includedCategories : null
        );
        resultsEl.appendChild(retroWeekendController.card);

        function renderSections() {
          card.replaceChildren(bg, header);
          appendCultureSections(card, cultureCategories, savedSelections, toggleCustomSelection);
        }

        function preserveScrollPosition(updateFn, anchorEl = null) {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          const anchorTop = anchorEl ? anchorEl.getBoundingClientRect().top : null;
          const root = document.documentElement;
          const previousScrollBehavior = root.style.scrollBehavior;

          root.style.scrollBehavior = "auto";
          updateFn();

          function restorePosition() {
            if (anchorEl && anchorTop !== null && document.body.contains(anchorEl)) {
              const nextTop = anchorEl.getBoundingClientRect().top;
              window.scrollBy(0, nextTop - anchorTop);
              return;
            }

            window.scrollTo(scrollX, scrollY);
          }

          restorePosition();
          requestAnimationFrame(() => {
            restorePosition();
            root.style.scrollBehavior = previousScrollBehavior;
          });
        }

        function updatePickButtonStates() {
          card.querySelectorAll(".pick-button").forEach((button) => {
            const categoryKey = button.dataset.categoryKey;
            const itemTitle = button.dataset.itemTitle;
            const isSelected = Boolean(
              categoryKey &&
              itemTitle &&
              savedSelections[categoryKey] &&
              savedSelections[categoryKey].title === itemTitle
            );

            button.classList.toggle("is-selected", isSelected);
            button.textContent = isSelected ? "Picked" : "Pick";
          });
        }

        function toggleCustomSelection(category, item, anchorEl = null) {
          if (!category || !item || !item.title) return;

          if (savedSelections[category.key] && savedSelections[category.key].title === item.title) {
            delete savedSelections[category.key];
          } else {
            savedSelections[category.key] = {
              title: item.title,
              imageUrl: item.imageUrl || "",
              url: item.url || "",
              linkMode: category.linkMode || ""
            };
          }

          effectiveSelections = mergeRetroWeekendSelections(defaultSelections, savedSelections);
          preserveScrollPosition(() => {
            retroWeekendController.update(effectiveSelections);
            updatePickButtonStates();
          }, anchorEl);
        }

        renderSections();

        resultsEl.appendChild(card);
      });
      scrollResultViewToTop();
    }

    function resetApp(options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");

      clearShareableUrl();
      if (!options.skipHistory) {
        writeViewHistory({ type: "home" });
      }
      gameInput.value = "";
      resultsGameInput.value = "";
      clearSuggestions();
      clearShareModals();
      resultsEl.innerHTML = "";
      setLandingChromeVisible(true);

      if (isLoaded) {
        statusEl.textContent = "Type a game name or pick a game from this month below.";
        renderOnThisMonth();
      } else {
        statusEl.textContent = "Loading data from Google Sheets...";
      }

      if (options.focusInput !== false) {
        gameInput.focus();
      }
    }

    document.getElementById("home-button").addEventListener("click", resetApp);
    document.getElementById("header-home-button").addEventListener("click", resetApp);

    document.getElementById("browse-by-date").addEventListener("click", (e) => {
      e.preventDefault();
      clearShareableUrl();
      clearSuggestions();
      renderBrowseByDate();
    });

    document.getElementById("browse-by-console").addEventListener("click", (e) => {
      e.preventDefault();
      clearShareableUrl();
      clearSuggestions();
      renderBrowseByConsole();
    });

    document.getElementById("random-game").addEventListener("click", (e) => {
      e.preventDefault();
      clearSuggestions();
      showRandomGame();
    });

    document.getElementById("birthday-list").addEventListener("click", (e) => {
      e.preventDefault();
      clearShareableUrl();
      clearSuggestions();
      renderBirthdayList();
    });

    document.getElementById("results-search-form").addEventListener("submit", handleResultsSearch);
    document.getElementById("search-form").addEventListener("submit", handleSearch);

    window.addEventListener("load", () => {
      loadDataIntoApp();
      document.getElementById("game-input").focus();
    });

    window.addEventListener("popstate", (event) => {
      const state = event.state;
      const viewState = state && state[APP_HISTORY_KEY]
        ? state.view
        : parseViewStateFromHash();

      restoreHistoryView(viewState || { type: "home" });
    });

    gameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("search-button").click();
      }
    });
