(function () {
  function createConsoleLaunchFeature(context) {
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
      return context.getState().consoleLaunches
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
      return `${context.monthNameFromNumber(launch.month)} ${launch.year} - ${context.monthNameFromNumber(next.month)} ${next.year}`;
    }

    function getLaunchWindowGames(launch) {
      const launchConsole = normalizeConsoleText(launch.console);
      return context.getState().games
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
      return context.getState().games
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

    function findConsoleLaunchMatches(query) {
      const normalizedQuery = context.normalizeGameSearchText(query);
      if (!normalizedQuery) return [];

      return context.getState().consoleLaunches.filter((launch) => {
        const searchText = context.normalizeGameSearchText([
          launch.console,
          launch.headline,
          context.monthNameFromNumber(launch.month),
          launch.year,
          "console launch"
        ].join(" "));
        return searchText.includes(normalizedQuery);
      });
    }

    function findPrimaryConsoleLaunchMatch(query) {
      const normalizedQuery = context.normalizeGameSearchText(query);
      const normalizedConsoleQuery = normalizeConsoleText(query);
      if (!normalizedQuery && !normalizedConsoleQuery) return null;

      return context.getState().consoleLaunches.find((launch) =>
        normalizeConsoleText(launch.console) === normalizedConsoleQuery ||
        context.normalizeGameSearchText(launch.console) === normalizedQuery ||
        context.normalizeGameSearchText(launch.headline) === normalizedQuery
      ) || null;
    }

    function findConsoleLaunchFromHistoryState(viewState = {}) {
      const normalizedConsole = normalizeConsoleText(viewState.console);

      return context.getState().consoleLaunches.find((launch) =>
        normalizeConsoleText(launch.console) === normalizedConsole &&
        Number(launch.month) === Number(viewState.month) &&
        Number(launch.year) === Number(viewState.year)
      ) || null;
    }

    function createConsoleLaunchPromo(launch) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "console-launch-promo";
      button.addEventListener("click", () => context.renderConsoleLaunchResult(launch));

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
          context.setImagePendingPlaceholder(imageWrap, "Console launch");
        }, { once: true });
        imageWrap.appendChild(img);
      } else {
        context.setImagePendingPlaceholder(imageWrap, "Console launch");
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
      meta.textContent = `${context.monthNameFromNumber(launch.month)} ${launch.year} / ${launch.console}`;

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
      button.addEventListener("click", () => context.showSpecificGame(game, { populateInput: true }));

      const cover = document.createElement("div");
      cover.className = "console-launch-game-thumb";
      context.setImagePendingPlaceholder(cover, game.console || "Game");

      context.getCoverUrlForGame(game).then((url) => {
        if (!url) return;
        const img = document.createElement("img");
        img.src = url;
        img.alt = `${game.title} cover`;
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => {
          img.remove();
          context.setImagePendingPlaceholder(cover, game.console || "Game");
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

      context.clearShareableUrl();
      context.clearSuggestions();
      context.clearShareModals();
      context.setLandingChromeVisible(false);
      if (!options.skipHistory) {
        context.writeViewHistory(context.getConsoleLaunchHistoryState(launch));
      }
      context.syncSearchInputs(launch.console);
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
          context.setImagePendingPlaceholder(art, "Console launch");
        }, { once: true });
        art.appendChild(img);
      } else {
        context.setImagePendingPlaceholder(art, "Console launch");
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
      meta.textContent = `${context.monthNameFromNumber(launch.month)} ${launch.year} / ${launch.console}`;

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
      restSubtitle.textContent = `${context.monthNameFromNumber(launch.month)} ${launch.year}`;

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
            context.showSpecificGame(game, { populateInput: true });
          });
          li.appendChild(link);
          list.appendChild(li);
        });
        restCard.appendChild(list);
      } else {
        const empty = document.createElement("div");
        empty.className = "empty console-launch-empty";
        empty.textContent = `No other game releases are listed for ${context.monthNameFromNumber(launch.month)} ${launch.year} yet.`;
        restCard.appendChild(empty);
      }

      resultsEl.appendChild(restCard);

      resultsEl.appendChild(context.createCultureCardForMonth(
        launch.month,
        launch.year,
        "More from this launch month",
        `${context.monthNameFromNumber(launch.month)} ${launch.year} culture picks from cinema, rental, music, kids TV, and wrestling.`
      ));
      context.scrollResultViewToTop();
    }

    return {
      createConsoleLaunchPromo,
      findConsoleLaunchFromHistoryState,
      findConsoleLaunchMatches,
      findPrimaryConsoleLaunchMatch,
      getConsoleLaunchesForMonth,
      normalizeConsoleText,
      renderConsoleLaunchResult
    };
  }

  window.GameRewindConsoleLaunches = {
    createConsoleLaunchFeature
  };
})();
