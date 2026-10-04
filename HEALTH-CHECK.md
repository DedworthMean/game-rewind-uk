# Game Rewind UK health check

Reviewed 4 October 2026. Scope: local working tree in C:\Users\deana\Documents\App\Game Rewind\game-rewind-uk, including uncommitted changes. No application code changed or deployed.

## Verification

- All 18 Node regression tests passed (`node --test tests/core.test.js tests/worker.test.js`).
- All top-level JavaScript files passed `node --check`.
- Remotion birthday project passed `npm run lint` (ESLint and TypeScript).
- Source review covered loading, search, routing, browse, birthday, sharing, and the cover Worker.
- No browser/device smoke test or live feed audit was performed. Findings below are source-backed; user-flow failures still deserve browser reproduction. This is not a full security audit.

## Address first

1. **Sharing assets dominate initial load.** `share-card-backgrounds.js` is 9,583,603 bytes; gzip still produces 7,180,481 bytes. `index.html:140` loads it synchronously on every visit, before the application script. This makes every visitor download and parse sharing assets, even if they never create a card. Move backgrounds to individual image assets and load only the selected template when sharing opens. The main background PNG is another 2,005,423 bytes; the logo is 495,888 bytes. Optimize these while preserving appearance. Measurements are local file sizes, not live network timings.

2. **Optional feeds block the whole app.** `game-rewind-data.js:567` awaits all eight feeds before returning; `app.js:1032` only enables the app after that return. Each feed can consume two 10-second attempts, so one unavailable optional feed can delay usable Games data by approximately 20 seconds. Load Games first, make search usable, and hydrate optional categories as they arrive. Preserve explicit unavailable/loading states and refresh the visible view safely. A versioned last-known-good dataset would also protect against complete sheet/provider outages.

3. **Mobile share canvas can revert to an earlier style.** `app.js:1828` assigns the awaited canvas to shared `shareCardCanvas` before checking `sharePreviewRequestId`. Change templates while an earlier render is pending: the newer render can finish first, then the older render overwrites the cached canvas even though its preview is discarded. A subsequent download can use the earlier style. Store the result locally and commit it only after verifying the render is current. Use the same guarded render promise for preview and download. Also invalidate the cached canvas when the cover resolves (`app.js:1983`); currently only tiles update, so a card prepared before the cover arrives can retain the placeholder.

4. **Restored browse/birthday views stop recording later selections.** `app.js:665-691` restores these views with `skipHistory: true`. The event handlers in `browse.js` and `birthday.js` close over that option and continue suppressing history on subsequent Show games / Build list actions. After Back or loading a hash URL, changing the selected date/console/birthday can leave the URL and browser Back history out of sync. Apply skipHistory only to initial restoration; user actions should write fresh entries. Add regression cases for restore -> change selection -> refresh and Back.

5. **Fallback cover lookup ignores game edition.** The client includes console and year (`game-rewind-data.js:510`), but the Worker reads only title and searches IGDB with `limit 1` (`cloudflare-worker/worker.js`). Its cache key also excludes console/year. Same-title remakes or platform editions can receive identical, incorrect cover art. Manual sheet artwork remains unaffected. Match platform and release metadata where possible and include every matching input in the Worker cache key. UK release years can differ from worldwide releases, so year should guide ranking rather than act as an unconditional equality filter.

## Next improvements

- **Bound share-image loading.** `share-card.js:276-326` fetches artwork/template backgrounds without an abort timeout; image decoding also has no deadline. Canvas drawing awaits all image results. A stalled image endpoint can leave mobile preview/download on Preparing indefinitely. Apply bounded fetch/decode deadlines and retain the existing placeholder fallback.
- **Birthday modal lifecycle/accessibility.** `birthday.js` registers a document-level Escape handler, removed only through its own close path. `app.js:61` removes modal elements directly, so history navigation can bypass that cleanup. The birthday dialog also lacks the share dialog's Tab focus loop and return-focus restoration. Centralize modal disposal, restore focus, and test Back/Escape/repeated opening. Reduced-motion CSS shortens animation duration but retains game reveal delays of 3.1 seconds and upwards; remove those delays in reduced-motion mode.
- **Precompute search and date indexes if profiling warrants it.** Search normalizes each game title on each keystroke. Birthday timelines repeatedly scan full arrays for every year, and present builders repeat console/date filtering. Build normalized-title and month/year/console indexes once after loading. The current dataset is modest; measure mobile interaction before adding complexity.
- **Extend meaningful flow coverage.** Existing tests cover parsers, URL validation, cover request behavior, console aliases and Worker behavior. They do not exercise restored-view interaction, mobile render races, or birthday modal lifecycle. Add those targeted checks before a broad refactor. No tracked GitHub Actions workflow was found; automate regression and syntax checks for pushes/PRs.
- **Correct project documentation.** `HANDOFF.md` repeatedly points to the unavailable OneDrive path and labels this user-confirmed folder old. Update the active path and server commands. README's feature/file list also trails the current implementation.

## Suggested order

Fix share rendering and restored-view history, then remove the eager background bundle, then decouple Games loading from optional feeds. Follow with edition-aware covers, bounded image loads, and targeted flow tests. Keep existing local edits intact and review any implementation changes before pushing.


## Local follow-up completed

- Removed the eager share-card background script from the page. Initial local script bytes fell from 9,779,390 to 195,787 before the progressive-loading changes. All seven template render paths were checked with mocked canvas/image APIs; each uses only its selected image file.
- Converted page background and header logo to WebP. Combined local image bytes fell from 2,501,311 to 281,974 (88.7% reduction). Background uses quality 90 at the original size; logo is 474 by 290, four times its 118-pixel desktop display width. Original PNGs remain for social previews and source preservation.
- Startup now begins when scripts execute, without waiting for page images/fonts. Games readiness unlocks the app independently of optional feeds. Optional feeds still finish as a group; active game results then hydrate with preserved custom/shared picks, category toggles, scroll anchoring, and no added history. Interacted-with browse/Birthday List views remain intact and show a notice; the next browse/build includes the new data. Untouched startup views refresh automatically. Initial console-launch deep links wait for their data.
- Regression suite now has 21 passing tests, including early Games readiness, required-feed failure without waiting for optional feeds, and optional-feed failure availability.
- Headless Edge browser checks used controlled feed fixtures: search with blocked optional feeds and blocked background image, late culture hydration without history changes, shared picks and checkbox preservation, Birthday List input/loading labels, and deferred console-launch deep links. These passed without page errors. No production latency claim or live feed audit is implied.
- The abandoned remotion-birthday project is excluded from ongoing maintenance.

These checks were completed locally before publication.


## Sharing correctness follow-up

- Preview and export now share a versioned rendering promise. An obsolete render cannot overwrite the latest canvas; simultaneous preview/export requests reuse the same render.
- Template changes, category toggles, custom-pick updates, and late-arriving game covers invalidate the cached render and export data together. An open preview refreshes for cover arrivals.
- JPG encoding checks that the inputs are still current before invoking native sharing or download. Closing/removing the modal suppresses a pending export. Native share cancellation does not produce a download-failed alert; fallback object URLs are revoked after use.
- All 24 regression tests pass, including out-of-order render completion, late-input invalidation, stale render failures, and retry after a current failure.
- Controlled mobile browser checks passed for rapid style changes, preview/export deduplication, late covers, category toggles, closed-modal export suppression, and stale JPG encoding. Real-artwork checks confirmed the mobile fallback JPG equals its preview byte-for-byte and desktop PNG exports at 1080 by 1920. Native operating-system share sheets were not exercised.

These checks were completed locally before publication.


## Restored navigation follow-up

- Browse by Date, Browse by Console, and Birthday List now suppress history only for the initial restoration. Subsequent Show games / Build list actions write new history entries even when the screen was restored through Back, Forward, or a hash URL.
- Added three focused regressions in tests/navigation.test.js. All 27 tests pass; README now includes every test file through `node --test tests/*.test.js`.
- Headless Edge checks with fixture data passed for all three screens: direct hash URL, change selection, Back/Forward, page refresh, open a game, Back to the selected list, change the selection again, and Back/Forward again. The Birthday List game was opened through its Explore control. No page errors were observed.

The user authorized publishing this reviewed batch on 4 October 2026.
