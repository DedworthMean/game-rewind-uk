(function () {
  function createResultRenderer(context) {
    function renderResults(matches, query, options = {}) {
      const resultsEl = document.getElementById("results");
      context.setLandingChromeVisible(false);
      context.clearShareModals();
      resultsEl.innerHTML = "";
      const sharedGameKey = options.game ? context.getGameKey(options.game) : matches.length === 1 ? context.getGameKey(matches[0]) : "";
      if (!options.skipHistory) {
        if (matches.length === 1) {
          context.writeViewHistory(context.getGameHistoryState(matches[0]));
        } else {
          context.writeViewHistory({ type: "search", query });
        }
      }

      if (!matches.length) {
        const div = document.createElement("div");
        div.className = "no-results";
        div.textContent = `No games found for "${query}". Check the spelling or your Games sheet.`;
        resultsEl.appendChild(div);
        context.scrollResultViewToTop();
        return;
      }

      matches.forEach(game => {
        const releaseSummary = document.createElement("div");
        releaseSummary.className = "card release-summary";

        const releaseLine = document.createElement("div");
        releaseLine.className = "release-summary-line";
        releaseLine.textContent =
          `${game.title} - ${context.monthNameFromNumber(game.month)} ${game.year}` +
          (game.console ? ` - ${game.console}` : "");

        releaseSummary.appendChild(releaseLine);
        resultsEl.appendChild(releaseSummary);

        const card = document.createElement("div");
        card.className = "card";

        const bg = document.createElement("div");
        bg.className = "card-bg";
        card.appendChild(bg);

        context.getCoverUrlForGame(game).then((url) => {
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

        const cultureCategories = context.getCultureCategoryDefinitions(game.month, game.year);
        const defaultSelections = context.getDefaultRetroWeekendSelections(game);
        const isSharedGame = sharedGameKey && context.getGameKey(game) === sharedGameKey;
        let savedSelections = isSharedGame ? { ...(options.initialSelections || {}) } : {};
        let effectiveSelections = context.mergeRetroWeekendSelections(defaultSelections, savedSelections);
        const retroWeekendController = context.renderRetroWeekendCard(
          game,
          effectiveSelections,
          isSharedGame ? options.includedCategories : null
        );
        resultsEl.appendChild(retroWeekendController.card);

        function renderSections() {
          card.replaceChildren(bg, header);
          context.appendCultureSections(card, cultureCategories, savedSelections, toggleCustomSelection);
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

          effectiveSelections = context.mergeRetroWeekendSelections(defaultSelections, savedSelections);
          preserveScrollPosition(() => {
            retroWeekendController.update(effectiveSelections);
            updatePickButtonStates();
          }, anchorEl);
        }

        renderSections();

        resultsEl.appendChild(card);
      });
      context.scrollResultViewToTop();
    }

    return {
      renderResults
    };
  }

  window.GameRewindResultRenderer = {
    createResultRenderer
  };
})();
