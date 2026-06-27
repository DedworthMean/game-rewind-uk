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

    function createBirthdayTimelineCard(row) {
      const card = document.createElement("div");
      card.className = "birthday-year-card";

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

      const meta = document.createElement("div");
      meta.className = "birthday-year-meta";
      meta.textContent = `${row.games.length} game${row.games.length === 1 ? "" : "s"} / ${row.totalCount} archive item${row.totalCount === 1 ? "" : "s"}`;

      body.appendChild(title);
      body.appendChild(meta);

      if (row.launches.length) {
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

      if (row.games.length) {
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

        row.games.slice(0, 5).forEach(addGameRow);
        body.appendChild(gamesList);

        if (row.games.length > 5) {
          const more = document.createElement("button");
          more.type = "button";
          more.className = "birthday-more";
          more.textContent = `+ ${row.games.length - 5} more game${row.games.length - 5 === 1 ? "" : "s"}`;
          more.addEventListener("click", () => {
            row.games.slice(5).forEach(addGameRow);
            more.remove();
          });
          body.appendChild(more);
        }
      }

      const cultureLine = document.createElement("div");
      cultureLine.className = "birthday-culture-line";
      cultureLine.textContent = row.cultureCategories
        .map((category) => `${category.label}: ${category.items.length}`)
        .join(" / ");
      body.appendChild(cultureLine);

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

      statusEl.textContent = "Enter a birthday to build a month-by-month culture timeline.";

      const card = document.createElement("div");
      card.className = "card birthday-card";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = "Birthday list";

      const subtitle = document.createElement("div");
      subtitle.className = "card-subtitle";
      subtitle.textContent = "Enter a birth date and see archive releases from that birthday month across the years.";

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
        summary.textContent = rows.length
          ? `${formatBirthdayLabel(birthday.day, birthday.month)}: ${rows.length} archive year${rows.length === 1 ? "" : "s"} found from ${rows[0].year} to ${rows[rows.length - 1].year}.`
          : `No archive matches found for ${formatBirthdayLabel(birthday.day, birthday.month)} from ${birthday.year} onward.`;
        timelineWrap.appendChild(summary);

        statusEl.textContent = `Birthday List for ${formatBirthdayLabel(birthday.day, birthday.month)}.`;
        if (updateHistory && !options.skipHistory) {
          context.writeViewHistory({ type: "birthday", date: dateInput.value });
        }

        if (!rows.length) return;

        const timeline = document.createElement("div");
        timeline.className = "birthday-timeline";
        rows.forEach((row) => timeline.appendChild(createBirthdayTimelineCard(row)));
        timelineWrap.appendChild(timeline);
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
