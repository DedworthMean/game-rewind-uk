# Game Rewind UK Handoff

## Active Project

Use this folder:

`C:\Users\deana\Documents\App\Game Rewind\game-rewind-uk`

This is the active repo/site folder, confirmed by the user on 4 October 2026. The previous OneDrive location is unavailable.

Remote:

`https://github.com/DedworthMean/game-rewind-uk.git`

Reliability/security work:

- Development branch: `agent/reliability-security-proofing`
- Merged into `main` through [PR #1](https://github.com/DedworthMean/game-rewind-uk/pull/1) on 4 August 2026.
- Merge commit: `aeb7f06`.
- Main site hardening: `0fa82e0`.
- Versioned Worker and initial Worker tests: `5527abc`.
- Production deployment settings: `71f014a`.
- Final Worker upstream-access, token-cache, and rate-limit hardening: `635e83d`.

Current git baseline:

Use `main`, tracking `origin/main`, as the completed reliability/security baseline. Always run `git status --short --branch` before making changes rather than assuming the working tree is clean.

## August 2026 Reliability And Security Pass

- Sheet and proxy artwork URLs are accepted only when they are bounded HTTP(S) URLs.
- IGDB cover lookups now bound title/console inputs, validate the year, time out, deduplicate concurrent requests, and allow retries after failures.
- Sheet requests time out and retry once; optional feeds degrade independently while the required Games feed fails clearly when it has no usable rows.
- Search suggestions are relevance-ranked, deduplicated, capped at 12, and keyboard accessible.
- URL-restored application state and external links are validated before use.
- Core regression coverage lives in `tests/core.test.js` and `tests/worker.test.js`; run both with `node --test tests/*.test.js`.

The IGDB Worker source is versioned in `cloudflare-worker/worker.js`, with its Wrangler configuration alongside it. The hardened version enforces `GET`/`OPTIONS`, bounds and normalises titles, safely escapes IGDB searches, canonicalises cache keys, validates upstream responses, applies upstream timeouts, and avoids returning upstream error details. Twitch client credentials are sent in the form-encoded token-request body rather than the URL. Valid Twitch access tokens are reused for up to one hour. Successful cover lookups are cached for seven days and negative lookups for one hour. The Cloudflare `COVER_RATE_LIMITER` binding allows 120 uncached cover lookups per 60 seconds per location.

The current production deployment is Cloudflare version `faadd224-4ad8-48b0-bc6d-82b37c52ac7b` at `https://igdb-cover-proxy.deanagacy.workers.dev`. Existing Twitch secrets were preserved during deployment. Live checks confirmed `OPTIONS` returns 204, missing titles return 400, and a normal `Doom` lookup returns 200 with a valid IGDB cover URL and seven-day cache header. Wrangler recognises the rate-limit binding, preview URLs remain disabled, and `wrangler.jsonc` records `preview_urls: false` and `keep_vars: true` for future deploys.

Wrangler and GitHub CLI are authorised locally using credentials protected by the Windows keyring. No Cloudflare, Twitch, or GitHub credentials are committed to the repository.

The live data audit found 77 undated SNES game rows, seven undated cartoon rows, one dated rental row without a title, two game duplicate candidates, 23 cartoon duplicate candidates, and one WWE image cell containing a TMDB page URL rather than an image URL. Duplicate candidates were not removed because repeat releases/broadcasts may be intentional.

## Current Local Server

No local preview server should currently be running. The final post-merge smoke test used a temporary Node `http-server` at `http://127.0.0.1:8765/`; it was stopped after testing.

For future checks, start a local server from the active project folder using the bundled Python runtime on port `8097`, or use a temporary Node `http-server` if preferred.

## Current Feature State

### JavaScript File Layout

The app is still mostly run from `app.js`, but the first low-risk split has been done.

Current supporting feature files:

- `game-rewind-data.js`: Google Sheet loading, parsing, and cover lookup helpers.
- `share-card-backgrounds.js`: embedded share-card template backgrounds.
- `share-card-templates.js`: share-card template configuration data.
- `share-card.js`: share-card text generation, HTML preview, canvas rendering, PNG/JPG export, and mobile share helpers.
- `console-launches.js`: console aliases, launch artwork lookup, launch-window logic, console launch promos, and console launch result pages.
- `browse.js`: Browse by Date and Browse by Console screens, including selected-list history states.
- `birthday.js`: Birthday List rendering and timeline logic.
- `render-results.js`: main game result rendering, culture-section rendering coordination, Retro Weekend pick updates, and result history state writes.
- `app.js`: main app wiring, data loading, search, random picks, homepage month issue, culture data helpers, Retro Weekend card shell, and history routing.

The page loads these scripts in `index.html` before `app.js`. Keep that order unless the dependencies are changed.

Suggested next JavaScript split:

- Move the remaining Retro Weekend card shell/tile UI into `share-card.js`, or leave it until the UI is redesigned.
- Move search/autocomplete into `search.js`.
- Move homepage month issue and random game logic into their own module if `app.js` needs to shrink further.

### Console Launch Pages

A Google Sheet tab named `Console` is loaded by `game-rewind-data.js`.

The app parses console launch rows and exposes them as `consoleLaunches`.

Searching for a console launch, for example `NES`, `Master System`, `Mega Drive`, `Super Nintendo`, `PS2`, etc., opens a standalone console launch page.

The page shows:

- 1600 x 900 console launch artwork in a wide 16:9 panel.
- Console launch headline.
- Launch month only in the hero meta line, for example `September 1986 / NINTENDO ENTERTAINMENT SYSTEM`.
- A launch-window games section.
- A bottom section labelled `THE REST OF THIS MONTH'S RELEASES`.
- Launch-month culture sections for cinema, rental, single, kids TV, and wrestling.

The launch window means launch month plus the following month. This wider window is used for the launch-window games section and rest-of-releases list. Visible launch date text still shows only the actual launch month.

If someone browses to a month/year that has a console launch, the console launch promo appears at the top of the date result list, above ordinary game releases.

If someone uses Browse by Console and selects a console with a matching launch row, the same console launch promo appears above that console's game list. This uses console alias matching, so `NES` can match `Nintendo Entertainment System`.

Console launch image files live in:

`C:\Users\deana\Documents\App\Game Rewind\game-rewind-uk\console`

Aliases in `app.js` map sheet console names like `SONY PLAYSTATION`, `XBOX LAUNCH`, and `SONY PSP` to the right file.

Known data note: Nintendo DS currently has `0` launch-window games because the Games sheet has not yet been updated with March/April 2005 DS games. The feature is ready; once those rows are added, they should appear automatically.

### Better Empty States

Missing or failed images now show a consistent `Image pending` placeholder across the site, including:

- Game art.
- Console launch art.
- Launch game thumbnails.
- Retro Weekend culture tiles.
- Share-card previews and exports.

### Birthday List

The nav includes a `Birthday list` tool.

The user enters a full birth date. The app uses the birthday month and birth year to build a year-by-year archive timeline from that year onward.

Each timeline year shows:

- Age.
- Game links.
- Console launches when present.
- Culture counts for cinema, rental, single, kids TV, and wrestling.

Hidden extra games are expandable through clickable `+ more games` text.

The feature was treated as experimental when added, but the user liked it and it is now pushed live.

### Music Is Displayed As Single

The internal category key is still `music`, but visible labels in the UI are now `Single`.

This applies to:

- Include-in-card toggles.
- Result category labels.
- Share-card labels.
- Culture sections where music rows are displayed.

This was done so album chart content can be added later without the visible wording feeling too narrow.

### Music/Single Sheet Format And Artwork

The production `Music` Google Sheet tab now uses the newer split-column format:

- `Month`: date text, for example `September 1986`.
- `Existing Title`: display title used by the app, for example `Communards - Don't Leave Me This Way`.
- `Artist`: artist name used during music metadata cleanup.
- `Title`: song title used during music metadata cleanup.
- `Link`: YouTube/direct link used as the click target.
- `Image`: manual artwork override.
- `Cover Art URL`: MusicBrainz / Cover Art Archive artwork URL.

The old `Music` tab was renamed to a backup sheet, and the enriched former `Copy of Music` tab was renamed to `Music`.

The app still reads the production `Music` tab. `game-rewind-data.js` parses both the old and new music shapes, but the live sheet should use the new format.

Rules:

- If an `Image` value exists, it takes priority for artwork.
- If `Image` is blank and `Cover Art URL` exists, the app uses that MusicBrainz / Cover Art Archive artwork.
- If both are blank and `Link` is a YouTube URL, the app derives the artwork from the YouTube video thumbnail.
- If `Link` exists, clicking the result opens that direct link instead of the generic YouTube search.
- If no direct link exists, the old YouTube search behavior is used.

The Best Of / Retro Weekend sheet follows the same logic for `Music Link`:

- A YouTube link becomes the click target and thumbnail source.
- A non-YouTube link is still treated as artwork.

### Share Cards

Share card templates currently include:

- Standard
- Magazine
- 80's Movie
- Game Box
- Web Y2K
- Teletext
- VHS Tape

Desktop behavior:

- The share card preview remains the live HTML preview.
- The download button exports PNG.

Mobile behavior:

- The share card preview now uses the same rendered canvas/JPG as the exported result, so the phone preview matches the real output instead of looking squashed.
- The button says `Share JPG`.
- It uses the native mobile share sheet when available.
- It falls back to downloading a JPG when native sharing is unavailable.

Single artwork behavior:

- YouTube thumbnails are horizontal, while result cards are portrait.
- Single tiles now use a blurred background fill with a foreground image, keeping the main image at the intended scale and avoiding harsh black bars.
- Mobile share-card JPG exports clip the zoomed Single foreground image to its tile, matching the desktop HTML preview and preventing the image from spilling outside the boundary.

VHS template note:

- VHS share-card preview tile/image backgrounds were changed from grey to black. The downloaded card already looked right; this fixed the on-page preview.

### Scroll Position

Result views should scroll to the top when opened from searches, browse selections, console launch links, Birthday List links, random picks, and similar entry points.

This uses the shared `scrollResultViewToTop()` helper.

### Browser Back / Forward Navigation

The app now writes lightweight browser-history entries for major in-site views so the phone/browser Back button stays inside Game Rewind before leaving the site.

Covered views:

- Home.
- Search results and multiple-console chooser screens.
- Individual game result pages.
- Console launch pages.
- Browse by date, including selected month/year result lists.
- Browse by console, including selected console result lists.
- Birthday List, including built timelines.

Normal in-app history uses hash markers such as `#view=browse-date&month=9&year=1986`. Shareable Retro Weekend URLs still use their existing query-string format and should continue to work.

## Existing Features To Preserve

Keep these earlier features intact:

- Shareable Retro Weekend URLs.
- Share card modal and downloads.
- Month issue homepage mode.
- Randomized `this month` picks.
- Home button next to About.
- Category pick/remove controls for Retro Weekend cards.
- Console launch browse priority for launch months.
- Birthday List timeline.
- Direct YouTube links and thumbnails for Single results.

## Tested Recently

Final reliability/security checks on 4 August 2026:

- `node --test tests/*.test.js`: all 18 tests passed.
- `npx wrangler deploy --dry-run`: passed and recognised `COVER_RATE_LIMITER` at 120 requests per 60 seconds.
- Production Worker lookup: `Doom` returned 200 with a valid IGDB cover URL.
- Missing-title request returned 400; `OPTIONS` returned 204; CORS and cache headers were present.
- Local browser smoke test loaded 7,116 games plus all optional culture feeds without page errors.
- Search suggestions, multiple-console selection, Browse by Date, Browse by Console, Random Game, Birthday List, About navigation, and share-card preview all worked.
- Browser Back restored the previous Doom result after a random pick.
- Refresh restored the hash-routed Doom result.
- The Doom PS1 cover and culture artwork rendered successfully.
- No browser/JavaScript errors appeared during the smoke test.
- A true phone-sized viewport was not emulated during this final smoke test; the earlier mobile-sized checks below remain the latest direct mobile-layout coverage.

Recent checks included:

- `node --check app.js`
- Local browser checks on `http://127.0.0.1:8097/index.html`
- Browser Back checks on mobile-sized and desktop-sized viewports:
  - Browse by Date list -> game -> Back returns to the selected date list.
  - Browse by Date selected list -> Back returns to base Browse by Date.
  - Birthday List timeline -> game -> Back returns to the built timeline.
  - Browse by Console list -> game -> Back returns to the selected console list.
  - Search result -> Back returns to Home.
  - Console launch result -> Back returns to Home.
  - Direct loading `#view=browse-date&month=9&year=1986` restores the selected list.
- Desktop share modal:
  - HTML preview is used.
  - Button says `Download PNG`.
- Mobile share modal:
  - Rendered JPG preview is used.
  - HTML preview is not used.
  - Button says `Share JPG`.
  - Preview ratio closely matches the rendered result ratio.
- No page errors during the mobile/desktop share preview checks.

Earlier smoke tests confirmed:

- Site loads on `8097`.
- Console sheet loads.
- 20 console launch rows load.
- All 20 launch rows have matching artwork after alias fixes.
- NES launch page uses `console/NES.png`.
- `Mega Drive 32x` correctly rolls from January 1995 to February 1995.
- Mobile and desktop checks kept console launch art at 16:9.
- Normal game result pages still show the Retro Weekend card and category pick controls.

## Useful Commands

Start a local server from the active project folder:

```powershell
Start-Process -FilePath 'C:\Users\deana\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -ArgumentList '-m','http.server','8097','--bind','127.0.0.1' -WorkingDirectory 'C:\Users\deana\Documents\App\Game Rewind\game-rewind-uk' -WindowStyle Hidden
```

Run the regression tests and validate the Worker configuration:

```powershell
node --test tests/*.test.js
Set-Location cloudflare-worker
npx wrangler deploy --dry-run
```

Check git state:

```powershell
git status --short
git log -5 --oneline
```

## Current User Preferences

- Keep changes local until the user explicitly says to push.
- Treat `main` as the current completed reliability/security baseline; PR #1 is already merged.
- Use the user-confirmed Documents repo path above.
- The console launch artwork is designed as 1600 x 900 and should remain wide, not cropped into vertical box-art shape.
- Console launch pages should feel like standalone special results.
- Date browse should force console launches to the top when that launch month/year is selected.
- Launch-window game logic should use launch month plus following month.
- Visible launch date text in the hero and bottom rest-of-month area should use launch month only.
- For mobile sharing, keep the output phone-friendly as JPG.
- Be prepared to roll back experimental ideas if they do not feel right.

## Useful First Prompt For Next Window

```text
Read HANDOFF.md and continue from the current merged Game Rewind UK main branch. Use the Documents repo path. Do not push unless I ask.
```


## 4 October 2026 Health Check Updates

- Removed eager embedded share-card backgrounds from initial page loading. Sharing uses the selected existing template image.
- Main background and header logo use smaller WebP files; original PNGs remain for social previews.
- Games unlock search/browsing before optional feeds finish. Late culture updates preserve game picks, toggles, scroll and history. Interacted-with Birthday List/browse views stay intact until the next build/browse.
- Preview/export share a versioned render; obsolete styles cannot overwrite the latest canvas. Covers, picks and toggles invalidate exports. Cancelled native shares do not display a failure alert.
- Restored date/console/birthday views record subsequent user selections correctly.
- All 27 Node tests pass. Controlled Edge browser checks covered staged loading, sharing races, real PNG/JPG exports, and Back/Forward/refresh for all three browse tools.
- `remotion-birthday` was abandoned and is excluded from maintenance and Git tracking. The main site's Birthday List remains active.
- See HEALTH-CHECK.md for review findings and validation details. Outstanding items include edition-aware fallback covers and bounded sharing-image fetches.
