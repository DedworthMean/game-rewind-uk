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
    let lastRandomGameKey = "";
    let isLoaded = false;
    let uniqueGameTitles = [];
    const OFFSETS_YEARS = [10, 15, 20, 25, 30, 35, 40];
    const MAX_SECTION_ITEMS = 20;
    const MAX_MONTH_GAMES = 20;

    function setLandingChromeVisible(visible) {
      const heroEl = document.getElementById("landing-hero");
      const searchPanelEl = document.getElementById("search-panel");
      const resultsSearchEl = document.getElementById("results-search-form");
      if (!heroEl || !searchPanelEl || !resultsSearchEl) return;

      heroEl.classList.toggle("is-hidden", !visible);
      searchPanelEl.classList.toggle("is-hidden", !visible);
      resultsSearchEl.classList.toggle("is-hidden", visible);
    }

    function showConsoleChooser(matches, baseQuery) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);

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
    }

    function handleGameSelection(query, { populateInput = false } = {}) {
      const statusEl = document.getElementById("status");
      const matches = findGameMatches(games, query);

      if (!matches.length) {
        statusEl.textContent = `No games found for "${query}".`;
        renderResults([], query);
        return;
      }

      const consoles = [...new Set(matches.map((match) => (match.console || "").trim()))];
      if (matches.length > 1 && consoles.length > 1) {
        showConsoleChooser(matches, query);
        return;
      }

      if (populateInput) {
        syncSearchInputs(matches[0].title);
      }

      statusEl.textContent = `Found ${matches.length} matching game(s).`;
      renderResults(matches, query);
    }

    function getGameKey(game) {
      return [game.title, game.console, game.month, game.year].map(value => String(value || "")).join("|");
    }

    function triggerResultsReveal() {
      const resultsEl = document.getElementById("results");
      resultsEl.classList.remove("results-random-reveal");
      void resultsEl.offsetWidth;
      resultsEl.classList.add("results-random-reveal");
    }

    function showSpecificGame(game, { populateInput = false, animateResults = false } = {}) {
      const statusEl = document.getElementById("status");
      if (populateInput) {
        syncSearchInputs(game.title);
      }

      statusEl.textContent = `Showing ${game.title}` + (game.console ? ` on ${game.console}` : "");
      renderResults([game], game.title);

      if (animateResults) {
        triggerResultsReveal();
      }
    }

    function showRandomGame() {
      const statusEl = document.getElementById("status");

      if (!isLoaded) {
        statusEl.textContent = "Still loading data. Try again in a moment.";
        return;
      }

      if (!games.length) {
        statusEl.textContent = "No games are available to choose from yet.";
        return;
      }

      const availableGames = games.length > 1 && lastRandomGameKey
        ? games.filter((game) => getGameKey(game) !== lastRandomGameKey)
        : games;

      const source = availableGames.length ? availableGames : games;
      const randomGame = source[Math.floor(Math.random() * source.length)];

      lastRandomGameKey = getGameKey(randomGame);
      showSpecificGame(randomGame, { populateInput: true, animateResults: true });
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
      header.className = "card month-card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = `This month: ${monthName}`;

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Games released in this month across the years.";

      header.appendChild(title);
      header.appendChild(subtitle);
      resultsEl.appendChild(header);

      let anyGroups = false;

      OFFSETS_YEARS.forEach(offset => {
        const targetYear = currentYear - offset;
        const group = games.filter(g => g.month === currentMonth && g.year === targetYear);
        if (!group.length) return;

        anyGroups = true;

        const card = document.createElement("div");
        card.className = "card month-card";

        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header";

        const left = document.createElement("div");
        const yearTitle = document.createElement("div");
        yearTitle.className = "card-title";
        yearTitle.textContent = `${offset} years ago - ${monthName} ${targetYear}`;

        const yearSubtitle = document.createElement("div");
        yearSubtitle.className = "card-subtitle";
        yearSubtitle.textContent = `${group.length} game` + (group.length === 1 ? "" : "s");

        left.appendChild(yearTitle);
        left.appendChild(yearSubtitle);
        cardHeader.appendChild(left);
        card.appendChild(cardHeader);

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

        group.slice(0, MAX_MONTH_GAMES).forEach(addGameRow);
        card.appendChild(list);

        if (group.length > MAX_MONTH_GAMES) {
          const more = document.createElement("div");
          more.className = "section-more";
          more.textContent = `Show all ${group.length} games`;
          more.addEventListener("click", () => {
            list.innerHTML = "";
            group.forEach(addGameRow);
            more.remove();
          });
          card.appendChild(more);
        }

        resultsEl.appendChild(card);
      });

      if (!anyGroups) {
        const msg = document.createElement("div");
        msg.className = "no-results";
        msg.textContent = `No games in your data for ${monthName} at 10, 15, 20, 25, 30, 35, or 40 years ago.`;
        resultsEl.appendChild(msg);
      }
    }

    

    // ===== 4.75 Browse views (Date / Console) =====
    function renderBrowseByDate() {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      resultsEl.innerHTML = "";

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

      function renderList() {
        list.innerHTML = "";
        const month = parseInt(monthSelect.value, 10);
        const year = parseInt(yearSelect.value, 10);

        const group = games
          .filter(g => g.month === month && g.year === year)
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

        if (!group.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = `No games found for ${monthNameFromNumber(month)} ${year}.`;
          listWrap.innerHTML = "";
          listWrap.appendChild(empty);
          return;
        }

        listWrap.innerHTML = "";
        listWrap.appendChild(list);
        group.forEach(addGameRow);
      }

      goBtn.addEventListener("click", renderList);

      card.appendChild(monthSelect);
      card.appendChild(yearSelect);
      card.appendChild(goBtn);
      card.appendChild(listWrap);

      resultsEl.appendChild(card);
    }

    function renderBrowseByConsole() {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      resultsEl.innerHTML = "";

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

      function renderList() {
        list.innerHTML = "";
        const selected = consoleSelect.value;

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

      goBtn.addEventListener("click", renderList);

      card.appendChild(consoleSelect);
      card.appendChild(goBtn);
      card.appendChild(listWrap);

      resultsEl.appendChild(card);
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
        uniqueGameTitles = getUniqueGameTitles(games);
        isLoaded = true;

        const unavailableSections = [
          data.cinemaLoaded ? null : "cinema",
          data.musicLoaded ? null : "music",
          data.wweLoaded ? null : "wrestling",
          data.rentalLoaded ? null : "rental",
          data.cartoonsLoaded ? null : "kids TV",
          data.retroWeekendLoaded ? null : "retro weekend"
        ].filter(Boolean);

        statusEl.textContent =
          `Loaded ${data.counts.games} games, ${data.counts.cinema} films, ` +
          `${data.counts.music} tracks, ${data.counts.wwe} wrestling events` +
          (data.rentalLoaded ? `, ${data.counts.rental} rental titles` : ", rental not loaded") +
          (data.cartoonsLoaded ? `, ${data.counts.cartoons} kids TV entries.` : ", kids TV not loaded.") +
          (unavailableSections.length ? ` Some sections could not load: ${unavailableSections.join(", ")}.` : "");

        renderOnThisMonth();
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

      const matches = findGameMatches(games, query);

      if (!matches.length) {
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

    function getRetroWeekendItems(game, customSelections = {}) {
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
          label: "Music",
          title: entry.musicTitle,
          imageUrl: entry.musicImageUrl,
          month: game.month,
          year: game.year
        } : null,
        
      };

      return [
        { key: "cinema", label: "Cinema" },
        { key: "rental", label: "Rental" },
        { key: "music", label: "Music" },
        { key: "cartoons", label: "Kids TV" },
        { key: "wwe", label: "Wrestling" }
      ]
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

    function getDefaultRetroWeekendSelections(game) {
      const entry = retroWeekend.find((item) => item.month === game.month && item.year === game.year);
      if (!entry) return {};

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
      if (linkMode === "imdb") {
        return `https://www.imdb.com/find?q=${encodeURIComponent(item.title)}`;
      }
      if (linkMode === "youtube") {
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}`;
      }
      if (item.url) {
        return item.url;
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
      thumb.className = "retro-weekend-thumb";
      if (item.imageUrl) {
        const image = document.createElement("img");
        image.src = item.imageUrl;
        image.alt = item.title ? `${item.label}: ${item.title}` : `${item.label} image`;
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => {
          thumb.innerHTML = "";
          thumb.classList.add("retro-weekend-thumb--placeholder");
          thumb.textContent = item.label;
        }, { once: true });
        thumb.appendChild(image);
      } else {
        thumb.classList.add("retro-weekend-thumb--placeholder");
        thumb.textContent = item.label;
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

    function renderRetroWeekendCard(game, initialSelections = {}) {
      const card = document.createElement("div");
      card.className = "card retro-weekend-card";
      let currentSelections = initialSelections;
      let gameCoverUrl = "";

      const kicker = document.createElement("div");
      kicker.className = "retro-weekend-kicker";
      kicker.textContent = "YOUR RETRO WEEKEND";

      const title = document.createElement("div");
      title.className = "retro-weekend-title";
      title.textContent = `${monthNameFromNumber(game.month)} ${game.year} picks`;

      const copy = document.createElement("div");
      copy.className = "retro-weekend-copy";
      copy.textContent = "A visual rewind for this release month. Build your own Retro Weekend from the lists below.";

      const grid = document.createElement("div");
      grid.className = "retro-weekend-grid";

      card.appendChild(kicker);
      card.appendChild(title);
      card.appendChild(copy);
      card.appendChild(grid);

      function renderTiles() {
        grid.innerHTML = "";
        createRetroWeekendTile({
          label: "Game",
          title: game.console ? `${game.title} - ${game.console}` : game.title,
          imageUrl: gameCoverUrl,
          month: game.month,
          year: game.year
        }, grid, card);

        getRetroWeekendItems(game, currentSelections).forEach((item) => {
          createRetroWeekendTile(item, grid, card);
        });
      }

      getCoverUrlForGame(game).then((coverUrl) => {
        gameCoverUrl = coverUrl || "";
        renderTiles();
      });

      renderTiles();

      return {
        card,
        update(nextSelections) {
          currentSelections = nextSelections || {};
          renderTiles();
        }
      };
    }

    function renderResults(matches, query) {
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      resultsEl.innerHTML = "";

      if (!matches.length) {
        const div = document.createElement("div");
        div.className = "no-results";
        div.textContent = `No games found for "${query}". Check the spelling or your Games sheet.`;
        resultsEl.appendChild(div);
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
        title.textContent = "The rest of the months releases";

        main.appendChild(title);
        header.appendChild(main);

        card.appendChild(header);

        const keyCinema = filterEntriesByMonthYear(cinema, game.month, game.year);
        const keyMusic = filterEntriesByMonthYear(music, game.month, game.year);
        const keyWwe = filterEntriesByMonthYear(wwe, game.month, game.year);
        const keyRental = filterEntriesByMonthYear(rental, game.month, game.year);
        const keyCartoons = filterEntriesByMonthYear(cartoons, game.month, game.year);
        const customCategoryDefinitions = [
          { key: "cinema", label: "Cinema", items: keyCinema, linkMode: "imdb" },
          { key: "rental", label: "Rental", items: keyRental, linkMode: "imdb" },
          { key: "music", label: "Music", items: keyMusic, linkMode: "youtube" },
          { key: "cartoons", label: "Kids TV", items: keyCartoons, linkMode: undefined },
          { key: "wwe", label: "Wrestling", items: keyWwe, linkMode: undefined }
        ];
        const defaultSelections = getDefaultRetroWeekendSelections(game);
        let savedSelections = {};
        let effectiveSelections = mergeRetroWeekendSelections(defaultSelections, savedSelections);
        const retroWeekendController = renderRetroWeekendCard(game, effectiveSelections);
        resultsEl.appendChild(retroWeekendController.card);

        function section(titleText, items, emptyText, linkMode, enableToggle = false, category = null) {
          const block = document.createElement("div");
          block.className = "section-block";

          const t = document.createElement("div");
          t.className = "section-title";
          t.textContent = titleText;
          block.appendChild(t);

          if (!items.length) {
            const empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = emptyText;
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

          function renderList() {
            ul.innerHTML = "";

            const visible = (enableToggle && expanded) ? items : items.slice(0, MAX_SECTION_ITEMS);

            visible.forEach(i => {
              const li = document.createElement("li");
              li.className = "section-entry";
              const mainContent = document.createElement("div");
              mainContent.className = "section-entry-main";

              if (linkMode === "imdb") {
                const link = document.createElement("a");
                link.href = `https://www.imdb.com/find?q=${encodeURIComponent(i.title)}`;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = i.title;
                link.className = "has-link";
                mainContent.appendChild(link);
              } else if (linkMode === "youtube") {
                const link = document.createElement("a");
                link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(i.title)}`;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = i.title;
                link.className = "has-link";
                mainContent.appendChild(link);
              } else if (i.url) {
                const a = document.createElement("a");
                a.href = i.url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.textContent = i.title;
                a.className = "has-link";
                a.style.color = "#ffffff";
                mainContent.appendChild(a);
              } else {
                mainContent.textContent = i.title;
              }

              if (category) {
                const isSelected = Boolean(savedSelections[category.key] && savedSelections[category.key].title === i.title);
                const pickButton = document.createElement("button");
                pickButton.type = "button";
                pickButton.className = isSelected ? "pick-button is-selected" : "pick-button";
                pickButton.textContent = isSelected ? "Picked" : "Pick";
                pickButton.addEventListener("click", () => {
                  toggleCustomSelection(category, i);
                });
                li.appendChild(pickButton);
              }

              li.appendChild(mainContent);

              ul.appendChild(li);
            });

            if (more) {
              if (!enableToggle || items.length <= MAX_SECTION_ITEMS) {
                more.style.display = "none";
              } else {
                more.style.display = "block";
                more.textContent = expanded ? `Show less` : `Show all ${items.length}`;
              }
            }
          }

          more.addEventListener("click", () => {
            expanded = !expanded;
            renderList();
          });

          renderList();
          return block;
        }

        function renderSections() {
          card.replaceChildren(bg, header);

          card.appendChild(section(
            keyCinema.length ? `In cinemas (${keyCinema.length})` : "In cinemas",
            keyCinema,
            "No cinema data for this month.",
            "imdb",
            true,
            customCategoryDefinitions[0]
          ));
          card.appendChild(section(
            keyRental.length ? `Available to rent (${keyRental.length})` : "Available to rent",
            keyRental,
            "No rental data for this month.",
            "imdb",
            true,
            customCategoryDefinitions[1]
          ));
          card.appendChild(section(
            keyMusic.length ? `In the charts (${keyMusic.length})` : "IN THE CHARTS",
            keyMusic,
            "No music data for this month.",
            "youtube",
            false,
            customCategoryDefinitions[2]
          ));
          card.appendChild(section(
            keyCartoons.length ? `KIDS TV (${keyCartoons.length})` : "KIDS TV",
            keyCartoons,
            "No kids TV data for this month.",
            undefined,
            true,
            customCategoryDefinitions[3]
          ));
          card.appendChild(section(
            keyWwe.length ? `Wrestling events (${keyWwe.length})` : "Wrestling events",
            keyWwe,
            "No wrestling events for this month.",
            undefined,
            false,
            customCategoryDefinitions[4]
          ));
        }

        function preserveScrollPosition(updateFn) {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          updateFn();
          requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
          });
        }

        function toggleCustomSelection(category, item) {
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
            renderSections();
          });
        }

        renderSections();

        resultsEl.appendChild(card);
      });
    }

    function resetApp() {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");

      gameInput.value = "";
      resultsGameInput.value = "";
      clearSuggestions();
      resultsEl.innerHTML = "";
      setLandingChromeVisible(true);

      if (isLoaded) {
        statusEl.textContent = "Type a game name or pick a game from this month below.";
        renderOnThisMonth();
      } else {
        statusEl.textContent = "Loading data from Google Sheets...";
      }

      gameInput.focus();
    }

    document.getElementById("home-button").addEventListener("click", resetApp);

    document.getElementById("browse-by-date").addEventListener("click", (e) => {
      e.preventDefault();
      clearSuggestions();
      renderBrowseByDate();
    });

    document.getElementById("browse-by-console").addEventListener("click", (e) => {
      e.preventDefault();
      clearSuggestions();
      renderBrowseByConsole();
    });

    document.getElementById("random-game").addEventListener("click", (e) => {
      e.preventDefault();
      clearSuggestions();
      showRandomGame();
    });

    document.getElementById("results-search-form").addEventListener("submit", handleResultsSearch);
    document.getElementById("search-form").addEventListener("submit", handleSearch);

    window.addEventListener("load", () => {
      loadDataIntoApp();
      document.getElementById("game-input").focus();
    });

    gameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("search-button").click();
      }
    });
