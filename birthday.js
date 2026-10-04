(function () {
  function createBirthdayFeature(context) {
    function getArchiveYearRange() {
      const state = context.getState();
      const years = [
        ...state.games.map((entry) => entry.year),
        ...state.cinema.map((entry) => entry.year),
        ...state.music.map((entry) => entry.year),
        ...state.wwe.map((entry) => entry.year),
        ...state.rental.map((entry) => entry.year),
        ...state.cartoons.map((entry) => entry.year),
        ...state.consoleLaunches.map((entry) => entry.year)
      ].filter(Boolean);

      return {
        min: Math.min(...years),
        max: Math.max(...years)
      };
    }

    function parseBirthdayDate(value) {
      const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (!year || !month || !day) return null;

      return { year, month, day };
    }

    function formatBirthdayLabel(day, month) {
      return `${day} ${context.monthNameFromNumber(month)}`;
    }

    function getBirthdayTimelineRows(birthday) {
      const range = getArchiveYearRange();
      if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return [];

      const state = context.getState();
      const startYear = Math.max(birthday.year, range.min);
      const rows = [];

      for (let year = startYear; year <= range.max; year += 1) {
        const month = birthday.month;
        const gameMatches = state.games
          .filter((game) => game.month === month && game.year === year)
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        const cultureCategories = context.getCultureCategoryDefinitions(month, year);
        const launchMatches = context.getConsoleLaunchesForMonth(month, year);
        const cultureCount = cultureCategories.reduce((total, category) => total + category.items.length, 0);
        const totalCount = gameMatches.length + cultureCount + launchMatches.length;

        if (!totalCount) continue;

        rows.push({
          year,
          age: year - birthday.year,
          month,
          games: gameMatches,
          launches: launchMatches,
          cultureCategories,
          totalCount
        });
      }

      return rows;
    }

    function plural(count, singular, pluralLabel = `${singular}s`) {
      return `${count} ${count === 1 ? singular : pluralLabel}`;
    }

    function createCultureItemLink(item, category) {
      const destination = context.getSectionItemDestination(item, category.linkMode);
      if (!destination) {
        const text = document.createElement("span");
        text.textContent = item.title;
        return text;
      }

      const link = document.createElement("a");
      link.href = destination;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "has-link";
      link.textContent = item.title;
      return link;
    }

    function isReleasedByCutoff(entry, cutoffMonth, cutoffYear) {
      return Number(entry.year) < cutoffYear ||
        (Number(entry.year) === cutoffYear && Number(entry.month) <= cutoffMonth);
    }

    function isReleasedOnOrAfter(entry, launch) {
      return Number(entry.year) > Number(launch.year) ||
        (Number(entry.year) === Number(launch.year) && Number(entry.month) >= Number(launch.month));
    }

    function getEligibleConsoleLaunches(row) {
      const seen = new Set();
      return context.getState().consoleLaunches
        .filter((launch) => isReleasedByCutoff(launch, row.month, row.year))
        .sort((a, b) =>
          Number(a.year) - Number(b.year) ||
          Number(a.month) - Number(b.month) ||
          (a.console || "").localeCompare(b.console || "")
        )
        .filter((launch) => {
          const key = context.normalizeConsoleText(launch.console);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    function getEligibleGamesForConsole(row, launch) {
      const consoleKey = context.normalizeConsoleText(launch.console);
      return context.getState().games
        .filter((game) =>
          context.normalizeConsoleText(game.console) === consoleKey &&
          isReleasedByCutoff(game, row.month, row.year) &&
          isReleasedOnOrAfter(game, launch)
        )
        .sort((a, b) =>
          Number(b.year) - Number(a.year) ||
          Number(b.month) - Number(a.month) ||
          (a.title || "").localeCompare(b.title || "")
        );
    }

    function getBirthdayConsoleImageUrl(launch) {
      const assetMap = {
        nes: "NES.png",
        "master system": "Master System.png",
        "mega drive": "Mega Drive.png",
        "game boy": "Game Boy.png",
        "game boy color": "Game Boy Color.png",
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
      const fileName = assetMap[context.normalizeConsoleText(launch.console)];
      return fileName ? `console/consolebday/${encodeURIComponent(fileName)}` : "";
    }

    function openBirthdayPresentAnimation(row, launch, games) {
      document.querySelectorAll(".birthday-animation-modal").forEach((modal) => modal.remove());
      const modal = document.createElement("div");
      modal.className = "share-card-modal birthday-animation-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", `Animated birthday presents for age ${row.age}`);

      const panel = document.createElement("div");
      panel.className = "birthday-animation-panel";
      const header = document.createElement("div");
      header.className = "birthday-animation-header";
      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = "Your birthday present reveal";
      const controls = document.createElement("div");
      controls.className = "birthday-animation-controls";
      const replay = document.createElement("button");
      replay.type = "button";
      replay.textContent = "Replay";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Close";
      controls.appendChild(replay);
      controls.appendChild(close);
      header.appendChild(title);
      header.appendChild(controls);

      const stage = document.createElement("div");
      stage.className = "birthday-animation-stage";

      const intro = document.createElement("div");
      intro.className = "birthday-animation-frame birthday-animation-intro";
      const introAge = document.createElement("div");
      introAge.className = "birthday-animation-age";
      introAge.textContent = "Happy Birthday!";
      const introDate = document.createElement("div");
      introDate.className = "birthday-animation-date";
      introDate.textContent = `${row.age === 0 ? "Born" : `Age ${row.age}`} · ${context.monthNameFromNumber(row.month)} ${row.year}`;
      const introCopy = document.createElement("div");
      introCopy.className = "birthday-animation-copy";
      introCopy.textContent = "What was waiting on your birthday morning?";
      intro.appendChild(introAge);
      intro.appendChild(introDate);
      intro.appendChild(introCopy);

      const consoleFrame = document.createElement("div");
      consoleFrame.className = "birthday-animation-frame birthday-animation-console";
      const consoleKicker = document.createElement("div");
      consoleKicker.className = "birthday-animation-kicker";
      consoleKicker.textContent = "Your birthday presents";
      const presentLayout = document.createElement("div");
      presentLayout.className = "birthday-animation-present-layout";
      const consoleArt = document.createElement("div");
      consoleArt.className = "birthday-animation-console-art";
      const consoleImageUrl = getBirthdayConsoleImageUrl(launch);
      if (consoleImageUrl) {
        const image = document.createElement("img");
        image.src = consoleImageUrl;
        image.alt = launch.console || "Selected console";
        image.addEventListener("error", () => {
          consoleArt.innerHTML = "";
          consoleArt.textContent = "Console image pending";
          consoleArt.classList.add("image-pending");
        }, { once: true });
        consoleArt.appendChild(image);
      } else {
        consoleArt.textContent = "Console image pending";
        consoleArt.classList.add("image-pending");
      }
      presentLayout.appendChild(consoleArt);
      games.forEach((game, index) => {
        const tile = document.createElement("div");
        tile.className = `birthday-animation-orbit-game position-${index + 1}`;
        tile.style.setProperty("--reveal-index", String(index));
        tile.title = game.title;
        const art = document.createElement("div");
        art.className = "birthday-animation-game-art image-pending";
        art.textContent = "Image pending";
        tile.appendChild(art);
        presentLayout.appendChild(tile);
        context.getCoverUrlForGame(game).then((url) => {
          if (!url || !art.isConnected) return;
          const image = document.createElement("img");
          image.src = url;
          image.alt = `${game.title} cover`;
          image.addEventListener("load", () => {
            art.innerHTML = "";
            art.classList.remove("image-pending");
            art.appendChild(image);
          }, { once: true });
        });
      });
      const consoleName = document.createElement("div");
      consoleName.className = "birthday-animation-console-name";
      consoleName.textContent = launch.console;
      const presentDate = document.createElement("div");
      presentDate.className = "birthday-animation-present-date";
      presentDate.textContent = `${context.monthNameFromNumber(row.month)} ${row.year} · Age ${row.age}`;
      consoleFrame.appendChild(consoleKicker);
      consoleFrame.appendChild(presentLayout);
      consoleFrame.appendChild(consoleName);
      consoleFrame.appendChild(presentDate);

      stage.appendChild(intro);
      stage.appendChild(consoleFrame);
      panel.appendChild(header);
      panel.appendChild(stage);
      modal.appendChild(panel);
      document.body.appendChild(modal);
      document.body.classList.add("has-share-modal");
      const pageShell = document.querySelector(".page-shell");
      if (pageShell) pageShell.setAttribute("inert", "");

      function play() {
        stage.classList.remove("is-playing");
        void stage.offsetWidth;
        stage.classList.add("is-playing");
      }
      function closeModal() {
        modal.remove();
        document.body.classList.remove("has-share-modal");
        if (pageShell) pageShell.removeAttribute("inert");
        document.removeEventListener("keydown", handleKeydown);
      }
      function handleKeydown(event) {
        if (event.key === "Escape") closeModal();
      }
      replay.addEventListener("click", play);
      close.addEventListener("click", closeModal);
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });
      document.addEventListener("keydown", handleKeydown);
      play();
      close.focus();
    }

    function createBirthdayPresentBuilder(row, presentState) {
      const builder = document.createElement("div");
      builder.className = "birthday-present-builder";
      const eligibleLaunches = getEligibleConsoleLaunches(row);
      let selectedLaunch = eligibleLaunches.find((launch) =>
        context.normalizeConsoleText(launch.console) === presentState.launchKey
      ) || null;
      let selectedGames = Array.isArray(presentState.games) ? presentState.games : [];

      const heading = document.createElement("div");
      heading.className = "birthday-present-heading";
      heading.textContent = `Build your age ${row.age} birthday presents`;
      const intro = document.createElement("div");
      intro.className = "birthday-present-intro";
      intro.textContent = `Choose a console available in the UK by ${context.monthNameFromNumber(row.month)} ${row.year}, then add up to five games that had already been released for it.`;
      builder.appendChild(heading);
      builder.appendChild(intro);

      if (!eligibleLaunches.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = context.getState().dataAvailability?.console === null
          ? "Console launches are still loading. Build the list again once they are ready."
          : "No eligible console launch data is available for this birthday year.";
        builder.appendChild(empty);
        return builder;
      }

      const consoleLabel = document.createElement("label");
      consoleLabel.className = "birthday-present-label";
      consoleLabel.textContent = "1. Choose your console";
      const consoleSelect = document.createElement("select");
      consoleSelect.className = "birthday-present-console";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select a console";
      consoleSelect.appendChild(placeholder);
      eligibleLaunches.forEach((launch, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = `${launch.console} — launched ${context.monthNameFromNumber(launch.month)} ${launch.year}`;
        consoleSelect.appendChild(option);
      });
      if (selectedLaunch) {
        consoleSelect.value = String(eligibleLaunches.indexOf(selectedLaunch));
      }
      consoleLabel.appendChild(consoleSelect);
      builder.appendChild(consoleLabel);

      const gameStep = document.createElement("div");
      gameStep.className = "birthday-present-game-step";
      gameStep.hidden = true;
      const gameLabel = document.createElement("label");
      gameLabel.className = "birthday-present-label";
      gameLabel.textContent = "2. Pick up to five games";
      const gameSearch = document.createElement("input");
      gameSearch.type = "search";
      gameSearch.className = "birthday-present-search";
      gameSearch.placeholder = "Search eligible games";
      gameSearch.setAttribute("aria-label", "Search eligible birthday games");
      gameLabel.appendChild(gameSearch);

      const resultMeta = document.createElement("div");
      resultMeta.className = "birthday-present-result-meta";
      const gameResults = document.createElement("div");
      gameResults.className = "birthday-present-games";
      const presentList = document.createElement("div");
      presentList.className = "birthday-present-list";
      gameStep.appendChild(gameLabel);
      gameStep.appendChild(resultMeta);
      gameStep.appendChild(gameResults);
      gameStep.appendChild(presentList);
      builder.appendChild(gameStep);

      function gameKey(game) {
        return [game.title, game.console, game.month, game.year].join("|");
      }

      function renderPresentList() {
        presentList.innerHTML = "";
        const title = document.createElement("div");
        title.className = "birthday-present-list-title";
        title.textContent = "Your birthday present list";
        presentList.appendChild(title);

        const consoleLine = document.createElement("div");
        consoleLine.className = "birthday-present-console-pick";
        consoleLine.textContent = selectedLaunch ? `Console: ${selectedLaunch.console}` : "Choose a console to begin";
        presentList.appendChild(consoleLine);

        if (selectedGames.length) {
          const list = document.createElement("ol");
          selectedGames.forEach((game) => {
            const li = document.createElement("li");
            li.textContent = `${game.title} — ${context.monthNameFromNumber(game.month)} ${game.year}`;
            list.appendChild(li);
          });
          presentList.appendChild(list);
        } else if (selectedLaunch) {
          const empty = document.createElement("div");
          empty.className = "birthday-present-list-empty";
          empty.textContent = "Add games to complete the present list.";
          presentList.appendChild(empty);
        }

        const count = document.createElement("div");
        count.className = "birthday-present-count";
        count.textContent = `${selectedGames.length} of 5 games selected`;
        presentList.appendChild(count);

        if (selectedLaunch && selectedGames.length) {
          const preview = document.createElement("button");
          preview.type = "button";
          preview.className = "birthday-animation-button";
          preview.textContent = "Preview animated reveal";
          preview.addEventListener("click", () => openBirthdayPresentAnimation(row, selectedLaunch, selectedGames));
          presentList.appendChild(preview);
        }
      }

      function getGameGroup(game) {
        if (Number(game.year) === row.year && Number(game.month) === row.month) return "Released in your birthday month";
        if (Number(game.year) === row.year) return `Released earlier in ${row.year}`;
        return "Older games already available";
      }

      function renderGames() {
        if (!selectedLaunch) return;
        const eligibleGames = getEligibleGamesForConsole(row, selectedLaunch);
        const query = gameSearch.value.trim().toLowerCase();
        const matches = eligibleGames.filter((game) => !query || `${game.title} ${game.console}`.toLowerCase().includes(query));
        const visible = matches.slice(0, query ? 100 : 60);
        gameResults.innerHTML = "";
        resultMeta.textContent = `${eligibleGames.length} eligible game${eligibleGames.length === 1 ? "" : "s"}${matches.length !== eligibleGames.length ? ` / ${matches.length} matching` : ""}. ${visible.length < matches.length ? "Search to narrow the list." : ""}`;

        const groups = new Map();
        visible.forEach((game) => {
          const label = getGameGroup(game);
          if (!groups.has(label)) groups.set(label, []);
          groups.get(label).push(game);
        });

        groups.forEach((games, label) => {
          const section = document.createElement("div");
          section.className = "birthday-present-game-group";
          const groupTitle = document.createElement("div");
          groupTitle.className = "birthday-present-game-group-title";
          groupTitle.textContent = `${label} (${games.length})`;
          section.appendChild(groupTitle);
          games.forEach((game) => {
            const key = gameKey(game);
            const selected = selectedGames.some((candidate) => gameKey(candidate) === key);
            const button = document.createElement("button");
            button.type = "button";
            button.className = selected ? "birthday-present-game is-selected" : "birthday-present-game";
            button.setAttribute("aria-pressed", String(selected));
            const name = document.createElement("span");
            name.textContent = game.title;
            const date = document.createElement("span");
            date.textContent = `${context.monthNameFromNumber(game.month)} ${game.year}`;
            const action = document.createElement("strong");
            action.textContent = selected ? "Remove" : "Add";
            button.appendChild(name);
            button.appendChild(date);
            button.appendChild(action);
            button.addEventListener("click", () => {
              const selectedIndex = selectedGames.findIndex((candidate) => gameKey(candidate) === key);
              if (selectedIndex >= 0) {
                selectedGames.splice(selectedIndex, 1);
              } else if (selectedGames.length < 5) {
                selectedGames.push(game);
              } else {
                window.alert("Your birthday present list can hold up to five games.");
                return;
              }
              renderPresentList();
              renderGames();
            });
            section.appendChild(button);
          });
          gameResults.appendChild(section);
        });

        if (!visible.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "No eligible games match that search.";
          gameResults.appendChild(empty);
        }
      }

      consoleSelect.addEventListener("change", () => {
        selectedLaunch = consoleSelect.value === "" ? null : eligibleLaunches[Number(consoleSelect.value)];
        selectedGames = [];
        presentState.launchKey = selectedLaunch ? context.normalizeConsoleText(selectedLaunch.console) : "";
        presentState.games = selectedGames;
        gameSearch.value = "";
        gameStep.hidden = !selectedLaunch;
        renderPresentList();
        renderGames();
      });
      gameSearch.addEventListener("input", renderGames);
      gameStep.hidden = !selectedLaunch;
      renderPresentList();
      renderGames();
      return builder;
    }

    function createBirthdayTimelineCard(row, activeFilter = "all", presentStore = null) {
      const card = document.createElement("div");
      card.className = "birthday-year-card";
      card.id = `birthday-age-${row.age}`;
      card.tabIndex = -1;

      const yearColumn = document.createElement("div");
      yearColumn.className = "birthday-year-marker";

      const year = document.createElement("div");
      year.className = "birthday-year";
      year.textContent = String(row.year);

      const age = document.createElement("div");
      age.className = "birthday-age";
      age.textContent = row.age === 0 ? "Born" : `Age ${row.age}`;

      yearColumn.appendChild(year);
      yearColumn.appendChild(age);

      const body = document.createElement("div");
      body.className = "birthday-year-body";

      const title = document.createElement("div");
      title.className = "birthday-year-title";
      title.textContent = `${context.monthNameFromNumber(row.month)} ${row.year}`;

      const visibleCategories = activeFilter === "all"
        ? row.cultureCategories
        : row.cultureCategories.filter((category) => category.key === activeFilter);
      const showGames = activeFilter === "all" || activeFilter === "games";
      const showLaunches = activeFilter === "all" || activeFilter === "launches";
      const visibleCount = (showGames ? row.games.length : 0) +
        (showLaunches ? row.launches.length : 0) +
        visibleCategories.reduce((total, category) => total + category.items.length, 0);

      const meta = document.createElement("div");
      meta.className = "birthday-year-meta";
      meta.textContent = `${row.age === 0 ? "Your birth month" : `You turned ${row.age}`} · ${plural(visibleCount, "archive item")}`;

      body.appendChild(title);
      body.appendChild(meta);

      if (showLaunches && row.launches.length) {
        const launchList = document.createElement("div");
        launchList.className = "birthday-launch-list";
        row.launches.forEach((launch) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "birthday-launch-pill";
          button.textContent = launch.console ? `${launch.console} launch` : "Console launch";
          button.addEventListener("click", () => context.renderConsoleLaunchResult(launch));
          launchList.appendChild(button);
        });
        body.appendChild(launchList);
      }

      const highlights = document.createElement("div");
      highlights.className = "birthday-highlights";
      if (showGames && row.games[0]) {
        const highlight = document.createElement("span");
        highlight.textContent = `Game: ${row.games[0].title}`;
        highlights.appendChild(highlight);
      }
      visibleCategories.forEach((category) => {
        if (!category.items[0]) return;
        const highlight = document.createElement("span");
        highlight.textContent = `${category.label}: ${category.items[0].title}`;
        highlights.appendChild(highlight);
      });
      if (highlights.childElementCount) body.appendChild(highlights);

      let presentState = presentStore?.get(row.year);
      if (!presentState) {
        presentState = { launchKey: "", games: [] };
        if (presentStore) presentStore.set(row.year, presentState);
      }
      const presentBuilder = createBirthdayPresentBuilder(row, presentState);
      presentBuilder.hidden = true;
      const presentButton = document.createElement("button");
      presentButton.type = "button";
      presentButton.className = "birthday-present-button";
      const consoleDataAvailable = context.getState().dataAvailability?.console !== false;
      presentButton.disabled = !consoleDataAvailable;
      presentButton.textContent = consoleDataAvailable ? "Build birthday presents" : "Present builder unavailable";
      presentButton.setAttribute("aria-expanded", "false");
      presentButton.addEventListener("click", () => {
        const expanded = presentButton.getAttribute("aria-expanded") === "true";
        presentButton.setAttribute("aria-expanded", String(!expanded));
        presentButton.textContent = expanded ? "Build birthday presents" : "Close present builder";
        presentBuilder.hidden = expanded;
      });
      body.appendChild(presentButton);
      body.appendChild(presentBuilder);

      const details = document.createElement("div");
      details.className = "birthday-year-details";
      details.hidden = true;

      if (showGames && row.games.length) {
        const gamesList = document.createElement("ul");
        gamesList.className = "birthday-game-list";

        function addGameRow(game) {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.href = "#";
          link.className = "clickable-game";
          link.textContent = game.console ? `${game.title} - ${game.console}` : game.title;
          link.addEventListener("click", (event) => {
            event.preventDefault();
            context.showSpecificGame(game, { populateInput: true });
          });
          li.appendChild(link);
          gamesList.appendChild(li);
        }

        row.games.forEach(addGameRow);
        details.appendChild(gamesList);
      }

      visibleCategories.forEach((category) => {
        if (!category.items.length) return;
        const group = document.createElement("div");
        group.className = "birthday-culture-group";
        const heading = document.createElement("div");
        heading.className = "birthday-culture-heading";
        heading.textContent = `${category.label} (${category.items.length})`;
        group.appendChild(heading);
        const list = document.createElement("ul");
        list.className = "birthday-culture-list";
        category.items.forEach((item) => {
          const li = document.createElement("li");
          li.appendChild(createCultureItemLink(item, category));
          list.appendChild(li);
        });
        group.appendChild(list);
        details.appendChild(group);
      });

      if (details.childElementCount) {
        const explore = document.createElement("button");
        explore.type = "button";
        explore.className = "birthday-explore";
        explore.textContent = `Explore ${context.monthNameFromNumber(row.month)} ${row.year}`;
        explore.setAttribute("aria-expanded", "false");
        explore.addEventListener("click", () => {
          const expanded = explore.getAttribute("aria-expanded") === "true";
          explore.setAttribute("aria-expanded", String(!expanded));
          explore.textContent = expanded ? `Explore ${context.monthNameFromNumber(row.month)} ${row.year}` : "Show less";
          details.hidden = expanded;
        });
        body.appendChild(explore);
        body.appendChild(details);
      }

      card.appendChild(yearColumn);
      card.appendChild(body);
      return card;
    }

    function renderBirthdayList(options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      context.setLandingChromeVisible(false);
      resultsEl.innerHTML = "";
      if (!options.skipHistory) {
        context.writeViewHistory({ type: "birthday" });
      }

      if (!context.isLoaded()) {
        statusEl.textContent = "Still loading data. Try again in a moment.";
        return;
      }

      statusEl.textContent = "Enter a birthday to travel through that month in the archive.";

      const card = document.createElement("div");
      card.className = "card birthday-card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = "Birthday time machine";

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Enter your birth date and revisit the games and pop culture from your birthday month as you grew up.";

      const form = document.createElement("form");
      form.className = "birthday-form";

      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.className = "birthday-date-input";
      dateInput.required = true;
      dateInput.setAttribute("aria-label", "Birth date");
      dateInput.min = "1970-01-01";
      if (options.date) {
        dateInput.value = options.date;
      }

      const goBtn = document.createElement("button");
      goBtn.type = "submit";
      goBtn.className = "browse-action";
      goBtn.textContent = "Build list";

      form.appendChild(dateInput);
      form.appendChild(goBtn);

      const timelineWrap = document.createElement("div");
      timelineWrap.className = "birthday-timeline-wrap";

      function renderTimeline({ updateHistory = true } = {}) {
        const birthday = parseBirthdayDate(dateInput.value);
        if (!birthday) {
          timelineWrap.innerHTML = "";
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "Choose a full birth date to build your Birthday List.";
          timelineWrap.appendChild(empty);
          return;
        }

        const rows = getBirthdayTimelineRows(birthday);
        timelineWrap.innerHTML = "";

        const summary = document.createElement("div");
        summary.className = "birthday-summary";
        if (rows.length) {
          const totals = rows.reduce((result, row) => ({
            games: result.games + row.games.length,
            launches: result.launches + row.launches.length,
            items: result.items + row.totalCount
          }), { games: 0, launches: 0, items: 0 });
          summary.innerHTML = `<span class="birthday-summary-kicker">Your birthday month through gaming history</span><strong>${formatBirthdayLabel(birthday.day, birthday.month)}</strong><span>${rows[0].year}–${rows[rows.length - 1].year}</span>`;
          const stats = document.createElement("div");
          stats.className = "birthday-stats";
          [[totals.games, "games"], [totals.launches, "console launches"], [rows.length, "archive years"], [totals.items, "total moments"]].forEach(([value, label]) => {
            const stat = document.createElement("span");
            stat.innerHTML = `<strong>${value}</strong>${label}`;
            stats.appendChild(stat);
          });
          summary.appendChild(stats);
        } else {
          summary.textContent = `No archive matches found for ${formatBirthdayLabel(birthday.day, birthday.month)} from ${birthday.year} onward.`;
        }
        timelineWrap.appendChild(summary);

        statusEl.textContent = `Birthday List for ${formatBirthdayLabel(birthday.day, birthday.month)}.`;
        if (updateHistory) {
          context.writeViewHistory({ type: "birthday", date: dateInput.value });
        }

        if (!rows.length) return;

        const landmarkAges = [0, 5, 10, 16, 18, 21, 30, 40, 50];
        const availableLandmarks = landmarkAges.filter((ageValue) => rows.some((row) => row.age === ageValue));
        let jumps = null;
        if (availableLandmarks.length) {
          jumps = document.createElement("div");
          jumps.className = "birthday-jumps";
          const jumpLabel = document.createElement("span");
          jumpLabel.textContent = "Jump to:";
          jumps.appendChild(jumpLabel);
          availableLandmarks.forEach((ageValue) => {
            const jump = document.createElement("button");
            jump.type = "button";
            jump.textContent = ageValue === 0 ? "Born" : `Age ${ageValue}`;
            jump.addEventListener("click", () => {
              const target = document.getElementById(`birthday-age-${ageValue}`);
              if (!target) return;
              target.scrollIntoView({ behavior: "smooth", block: "center" });
              target.focus({ preventScroll: true });
              target.classList.add("is-highlighted");
              window.setTimeout(() => target.classList.remove("is-highlighted"), 1400);
            });
            jumps.appendChild(jump);
          });
          timelineWrap.appendChild(jumps);
        }

        const filters = document.createElement("div");
        filters.className = "birthday-filters";
        filters.setAttribute("aria-label", "Filter Birthday List");
        const timeline = document.createElement("div");
        timeline.className = "birthday-timeline";
        const presentStore = new Map();
        let activeFilter = "all";
        const filterOptions = [
          ["all", "All"], ["games", "Games"], ["launches", "Launches"],
          ["cinema", "Cinema"], ["rental", "Rental"], ["music", "Single"],
          ["cartoons", "Kids TV"], ["wwe", "Wrestling"]
        ];
        const state = context.getState();

        function getFilterCount(key) {
          if (key === "all") return rows.length;
          if (key === "games") return rows.reduce((total, row) => total + row.games.length, 0);
          if (key === "launches") return rows.reduce((total, row) => total + row.launches.length, 0);
          return rows.reduce((total, row) => total + row.cultureCategories
            .filter((category) => category.key === key)
            .reduce((categoryTotal, category) => categoryTotal + category.items.length, 0), 0);
        }

        function isFilterFeedAvailable(key) {
          if (key === "all" || key === "games") return true;
          if (key === "launches") return state.dataAvailability?.console !== false;
          return state.dataAvailability?.[key] !== false;
        }

        function renderRows() {
          timeline.innerHTML = "";
          const filteredRows = rows.filter((row) => {
            if (activeFilter === "all") return true;
            if (activeFilter === "games") return row.games.length;
            if (activeFilter === "launches") return row.launches.length;
            return row.cultureCategories.some((category) => category.key === activeFilter && category.items.length);
          });
          filteredRows.forEach((row) => timeline.appendChild(createBirthdayTimelineCard(row, activeFilter, presentStore)));
          if (!filteredRows.length) {
            const empty = document.createElement("div");
            empty.className = "empty birthday-filter-empty";
            empty.textContent = "Nothing in this category for your birthday month yet.";
            timeline.appendChild(empty);
          }
        }

        filterOptions.forEach(([key, label]) => {
          const count = getFilterCount(key);
          const feedAvailable = isFilterFeedAvailable(key);
          const feedLoading = state.dataAvailability?.[key === "launches" ? "console" : key] === null;
          const filter = document.createElement("button");
          filter.type = "button";
          filter.className = key === activeFilter ? "is-active" : "";
          filter.textContent = key === "all"
            ? label
            : feedLoading ? `${label} loading` : feedAvailable ? `${label} (${count})` : `${label} unavailable`;
          filter.disabled = feedLoading || !feedAvailable || (key !== "all" && count === 0);
          if (!feedAvailable) filter.title = `${label} data did not load. Reload the page to try again.`;
          filter.setAttribute("aria-pressed", String(key === activeFilter));
          filter.addEventListener("click", () => {
            activeFilter = key;
            if (jumps) jumps.hidden = key !== "all";
            filters.querySelectorAll("button").forEach((button) => {
              const selected = button === filter;
              button.classList.toggle("is-active", selected);
              button.setAttribute("aria-pressed", String(selected));
            });
            renderRows();
          });
          filters.appendChild(filter);
        });
        timelineWrap.appendChild(filters);
        timelineWrap.appendChild(timeline);
        renderRows();
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        renderTimeline();
      });

      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(form);
      card.appendChild(timelineWrap);
      resultsEl.appendChild(card);
      if (options.showTimeline) {
        renderTimeline({ updateHistory: false });
      }
      context.scrollResultViewToTop();
      if (options.focusInput !== false) {
        dateInput.focus();
      }
    }

    return {
      renderBirthdayList
    };
  }

  window.GameRewindBirthday = {
    createBirthdayFeature
  };
})();
