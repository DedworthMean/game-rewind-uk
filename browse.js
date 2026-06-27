(function () {
  function createBrowseFeature(context) {
    function renderBrowseByDate(options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      const state = context.getState();
      context.setLandingChromeVisible(false);
      resultsEl.innerHTML = "";
      if (!options.skipHistory) {
        context.writeViewHistory({ type: "browse-date" });
      }

      if (!context.isLoaded()) {
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

      const monthSelect = document.createElement("select");
      monthSelect.className = "browse-select";
      monthSelect.setAttribute("aria-label", "Month");

      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement("option");
        opt.value = String(m);
        opt.textContent = context.monthNameFromNumber(m);
        monthSelect.appendChild(opt);
      }
      if (options.month) {
        monthSelect.value = String(options.month);
      }

      const years = [...new Set(state.games.map(g => g.year))].sort((a, b) => b - a);
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
          context.showSpecificGame(g, { populateInput: true });
        });

        li.appendChild(link);
        list.appendChild(li);
      }

      function renderList({ updateHistory = true } = {}) {
        list.innerHTML = "";
        const month = parseInt(monthSelect.value, 10);
        const year = parseInt(yearSelect.value, 10);
        if (updateHistory && !options.skipHistory) {
          context.writeViewHistory({ type: "browse-date", month, year });
        }

        const group = state.games
          .filter(g => g.month === month && g.year === year)
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        const launchMatches = context.getConsoleLaunchesForMonth(month, year);

        if (!group.length && !launchMatches.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = `No games found for ${context.monthNameFromNumber(month)} ${year}.`;
          listWrap.innerHTML = "";
          listWrap.appendChild(empty);
          return;
        }

        listWrap.innerHTML = "";
        launchMatches.forEach((launch) => {
          listWrap.appendChild(context.createConsoleLaunchPromo(launch));
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
      context.scrollResultViewToTop();
    }

    function renderBrowseByConsole(options = {}) {
      const statusEl = document.getElementById("status");
      const resultsEl = document.getElementById("results");
      const state = context.getState();
      context.setLandingChromeVisible(false);
      resultsEl.innerHTML = "";
      if (!options.skipHistory) {
        context.writeViewHistory({ type: "browse-console" });
      }

      if (!context.isLoaded()) {
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

      const consoles = [...new Set(state.games.map(g => (g.console || "").trim()).filter(Boolean))]
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
        link.textContent = `${g.title} - ${context.monthNameFromNumber(g.month)} ${g.year}`;

        link.addEventListener("click", (event) => {
          event.preventDefault();
          context.showSpecificGame(g, { populateInput: true });
        });

        li.appendChild(link);
        list.appendChild(li);
      }

      function renderList({ updateHistory = true } = {}) {
        list.innerHTML = "";
        const selected = consoleSelect.value;
        if (updateHistory && !options.skipHistory) {
          context.writeViewHistory({ type: "browse-console", console: selected });
        }

        const group = state.games
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
      context.scrollResultViewToTop();
    }

    return {
      renderBrowseByConsole,
      renderBrowseByDate
    };
  }

  window.GameRewindBrowse = {
    createBrowseFeature
  };
})();
