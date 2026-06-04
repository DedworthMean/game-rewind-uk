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
    let randomSpinTimer = null;
    let isRandomSpinning = false;
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

    function clearShareModals() {
      document.querySelectorAll(".share-card-modal").forEach((modal) => modal.remove());
      document.body.classList.remove("has-share-modal");
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

    function renderHtmlShareCard(target, game, selections, gameImageUrl = "", includedCategories = null) {
      const items = getShareCardItems(game, selections, gameImageUrl, includedCategories).slice(0, 6);

      target.innerHTML = "";

      const shell = document.createElement("div");
      shell.className = "html-share-card";

      const brand = document.createElement("div");
      brand.className = "html-share-card-brand";
      brand.textContent = "GAME REWIND UK";

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
        imageWrap.className = "html-share-card-image";

        if (item.imageUrl) {
          const image = document.createElement("img");
          image.src = item.imageUrl;
          image.alt = `${item.label}: ${item.title}`;
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          image.addEventListener("error", () => {
            image.remove();
            imageWrap.classList.add("is-placeholder");
            imageWrap.textContent = item.label;
          }, { once: true });
          imageWrap.appendChild(image);
        } else {
          imageWrap.classList.add("is-placeholder");
          imageWrap.textContent = item.label;
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

      shell.appendChild(brand);
      shell.appendChild(title);
      shell.appendChild(meta);
      shell.appendChild(grid);
      shell.appendChild(footer);
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

    function loadShareCardImage(src) {
      return new Promise((resolve) => {
        if (!src) {
          resolve(null);
          return;
        }

        const canvasSafeSrc = getCanvasSafeImageUrl(src);
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.referrerPolicy = "no-referrer";
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = canvasSafeSrc;
      });
    }

    function getCanvasSafeImageUrl(src) {
      const value = String(src || "").trim();
      if (!value || value.startsWith("data:") || value.startsWith("blob:")) {
        return value;
      }

      if (!/^https?:\/\//i.test(value)) {
        return value;
      }

      if (value.includes("images.weserv.nl/")) {
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

    async function drawRetroWeekendShareCard(canvas, game, selections, gameImageUrl = "", includedCategories = null) {
      const ctx = canvas.getContext("2d");
      const width = 1080;
      const height = 1920;
      const margin = 72;
      const items = getShareCardItems(game, selections, gameImageUrl, includedCategories).slice(0, 6);
      const loadedImages = await Promise.all(items.map((item) => loadShareCardImage(item.imageUrl)));

      canvas.width = width;
      canvas.height = height;

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

      ctx.fillStyle = "#25f4a0";
      ctx.font = "700 28px 'Chakra Petch', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME REWIND UK", width / 2, 112);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 58px 'Chakra Petch', sans-serif";
      ctx.fillText("YOUR RETRO WEEKEND", width / 2, 210);

      ctx.fillStyle = "#ffd84a";
      ctx.font = "700 34px 'Chakra Petch', sans-serif";
      ctx.fillText(`${monthNameFromNumber(game.month)} ${game.year}`, width / 2, 268);
      ctx.textAlign = "left";

      ctx.fillStyle = "rgba(255, 246, 216, 0.08)";
      ctx.fillRect(margin, 330, width - (margin * 2), 2);

      let itemY = 390;
      const gap = 24;
      const columns = 3;
      const cardWidth = (width - (margin * 2) - (gap * (columns - 1))) / columns;
      const imageHeight = Math.round(cardWidth * 1.5);
      const textBlockHeight = 124;
      const itemHeight = imageHeight + textBlockHeight;

      items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = margin + (column * (cardWidth + gap));
        const y = itemY + (row * (itemHeight + 24));
        const image = loadedImages[index];

        ctx.fillStyle = "rgba(255, 246, 216, 0.06)";
        ctx.fillRect(x, y, cardWidth, itemHeight);
        ctx.strokeStyle = "rgba(255, 246, 216, 0.24)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardWidth, itemHeight);

        if (image) {
          try {
            drawCanvasImageContain(ctx, image, x, y, cardWidth, imageHeight);
          } catch (err) {
            ctx.fillStyle = "rgba(70, 223, 255, 0.12)";
            ctx.fillRect(x, y, cardWidth, imageHeight);
          }
        } else {
          ctx.fillStyle = "rgba(70, 223, 255, 0.12)";
          ctx.fillRect(x, y, cardWidth, imageHeight);
          ctx.fillStyle = "#46dfff";
          ctx.font = "700 28px 'Chakra Petch', sans-serif";
          ctx.fillText(item.label.toUpperCase(), x + 22, y + 118);
        }

        ctx.fillStyle = "#46dfff";
        ctx.font = "700 20px 'Chakra Petch', sans-serif";
        ctx.fillText(item.label.toUpperCase(), x + 16, y + imageHeight + 32);

        ctx.fillStyle = "#fff6d8";
        ctx.font = "600 24px 'Chakra Petch', sans-serif";
        wrapCanvasText(ctx, item.title, x + 16, y + imageHeight + 66, cardWidth - 32, 30, 3);
      });

      ctx.fillStyle = "#ff405c";
      ctx.font = "700 26px 'Chakra Petch', sans-serif";
      ctx.fillText("gamerewind.uk", margin, height - 92);

      return canvas.toDataURL("image/png");
    }

    function downloadShareCard(dataUrl, game) {
      const link = document.createElement("a");
      const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthPart = monthAbbreviations[(game.month || 1) - 1] || "Month";
      const yearPart = String(game.year || "").slice(-2) || "YY";
      const fileName = `RetroWeekend${monthPart}${yearPart}`;

      link.href = dataUrl;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    function renderRetroWeekendCard(game, initialSelections = {}) {
      const card = document.createElement("div");
      card.className = "card retro-weekend-card";
      let currentSelections = initialSelections;
      let gameCoverUrl = "";
      const includedCategories = {
        game: true,
        cinema: true,
        rental: true,
        music: true,
        cartoons: true,
        wwe: true
      };

      const kicker = document.createElement("div");
      kicker.className = "retro-weekend-kicker";
      kicker.textContent = "YOUR RETRO WEEKEND";

      const title = document.createElement("div");
      title.className = "retro-weekend-title";
      title.textContent = `${monthNameFromNumber(game.month)} ${game.year} picks`;

      const titleRow = document.createElement("div");
      titleRow.className = "retro-weekend-title-row";

      const createShareButton = document.createElement("button");
      createShareButton.type = "button";
      createShareButton.className = "share-card-button";
      createShareButton.textContent = "Create share card";

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
        { key: "music", label: "Music" },
        { key: "cartoons", label: "Kids TV" },
        { key: "wwe", label: "Wrestling" }
      ];

      includeOptions.forEach((option) => {
        const label = document.createElement("label");
        label.className = "include-toggle";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = true;
        input.addEventListener("change", () => {
          includedCategories[option.key] = input.checked;
          shareCardDataUrl = "";
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

      const shareActions = document.createElement("div");
      shareActions.className = "share-card-actions";

      const downloadShareButton = document.createElement("button");
      downloadShareButton.type = "button";
      downloadShareButton.className = "share-card-button";
      downloadShareButton.textContent = "Download PNG";

      const copyShareButton = document.createElement("button");
      copyShareButton.type = "button";
      copyShareButton.className = "share-card-button is-secondary";
      copyShareButton.textContent = "Copy text";

      const closeShareButton = document.createElement("button");
      closeShareButton.type = "button";
      closeShareButton.className = "share-card-button is-secondary";
      closeShareButton.textContent = "Close";

      let shareCardDataUrl = "";

      card.appendChild(kicker);
      titleRow.appendChild(title);
      titleRow.appendChild(createShareButton);
      card.appendChild(titleRow);
      card.appendChild(copy);
      card.appendChild(includePanel);
      card.appendChild(grid);
      shareModalHeader.appendChild(shareModalTitle);
      shareModalHeader.appendChild(closeShareButton);
      shareActions.appendChild(downloadShareButton);
      shareActions.appendChild(copyShareButton);
      shareModalPanel.appendChild(shareModalHeader);
      shareModalPanel.appendChild(sharePreview);
      shareModalPanel.appendChild(shareActions);
      shareModal.appendChild(shareModalPanel);
      document.body.appendChild(shareModal);

      function closeShareModal() {
        shareModal.classList.add("is-hidden");
        document.body.classList.remove("has-share-modal");
      }

      function createShareCard() {
        createShareButton.disabled = true;
        createShareButton.textContent = "Opening...";
        try {
          renderHtmlShareCard(sharePreview, game, currentSelections, gameCoverUrl, includedCategories);
          shareModal.classList.remove("is-hidden");
          document.body.classList.add("has-share-modal");
          shareModal.focus();
        } finally {
          createShareButton.disabled = false;
          createShareButton.textContent = "Create share card";
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
      downloadShareButton.addEventListener("click", async () => {
        if (!shareCardDataUrl) {
          const canvas = document.createElement("canvas");
          shareCardDataUrl = await drawRetroWeekendShareCard(canvas, game, currentSelections, gameCoverUrl, includedCategories);
        }
        downloadShareCard(shareCardDataUrl, game);
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
          renderTiles();
          if (!shareModal.classList.contains("is-hidden")) {
            createShareCard();
          }
        }
      };
    }

    function renderResults(matches, query) {
      const resultsEl = document.getElementById("results");
      setLandingChromeVisible(false);
      clearShareModals();
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
        title.textContent = "The rest of this month's releases";

        main.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "card-subtitle picks-subtitle";
        subtitle.textContent = "Make your own retro picks to create your ideal retro weekend.";
        main.appendChild(subtitle);

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
                pickButton.dataset.categoryKey = category.key;
                pickButton.dataset.itemTitle = i.title;
                pickButton.addEventListener("click", (event) => {
                  toggleCustomSelection(category, i, event.currentTarget);
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
    }

    function resetApp() {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");

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

      gameInput.focus();
    }

    document.getElementById("home-button").addEventListener("click", resetApp);
    document.getElementById("header-home-button").addEventListener("click", resetApp);

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
