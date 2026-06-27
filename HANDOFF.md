# Game Rewind UK Handoff

## Active Project

Use this folder:

`C:\Users\deana\OneDrive\Documents\App\Game Rewind\game-rewind-uk`

This is the active repo/site folder. Do not work from the older `Documents\App\Game Rewind\game-rewind-uk` or `App` folders unless the user explicitly asks.

Remote:

`https://github.com/DedworthMean/game-rewind-uk.git`

Branch:

`main`

Latest pushed commit at the time of this handoff:

`662c282 Use rendered share preview on mobile`

Current local git state:

Local branch may be ahead of GitHub with handoff/navigation commits if they have not been pushed yet.

## Current Local Server

The local site has been tested at:

`http://127.0.0.1:8097/index.html`

If it is not running, start it from the active project folder with Python HTTP server on port `8097`.

## Current Feature State

### JavaScript File Layout

The app is still mostly run from `app.js`, but the first low-risk split has been done.

Current supporting feature files:

- `game-rewind-data.js`: Google Sheet loading, parsing, and cover lookup helpers.
- `share-card-backgrounds.js`: embedded share-card template backgrounds.
- `share-card-templates.js`: share-card template configuration data.
- `birthday.js`: Birthday List rendering and timeline logic.
- `app.js`: main app wiring, search, browse, console launches, result rendering, share-card rendering, and history routing.

The page loads these scripts in `index.html` before `app.js`. Keep that order unless the dependencies are changed.

Suggested next JavaScript split:

- Move share-card rendering/export logic into `share-card.js`.
- Then move console launch helpers/pages into `console-launches.js`.
- Then move browse views into `browse.js`.

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

Console launch image files live in:

`C:\Users\deana\OneDrive\Documents\App\Game Rewind\game-rewind-uk\console`

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

### Music/Single YouTube Logic

Music sheet rows now read a `Link` column.

Rules:

- If an `Image` value exists, it takes priority for artwork.
- If `Image` is blank and `Link` is a YouTube URL, the app derives the artwork from the YouTube video thumbnail.
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
Start-Process -FilePath 'C:\Users\deana\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -ArgumentList '-m','http.server','8097','--bind','127.0.0.1' -WorkingDirectory 'C:\Users\deana\OneDrive\Documents\App\Game Rewind\game-rewind-uk' -WindowStyle Hidden
```

Check git state:

```powershell
git status --short
git log -5 --oneline
```

## Current User Preferences

- Keep changes local until the user explicitly says to push.
- Use the active OneDrive repo path above.
- The console launch artwork is designed as 1600 x 900 and should remain wide, not cropped into vertical box-art shape.
- Console launch pages should feel like standalone special results.
- Date browse should force console launches to the top when that launch month/year is selected.
- Launch-window game logic should use launch month plus following month.
- Visible launch date text in the hero and bottom rest-of-month area should use launch month only.
- For mobile sharing, keep the output phone-friendly as JPG.
- Be prepared to roll back experimental ideas if they do not feel right.

## Useful First Prompt For Next Window

```text
Read HANDOFF.md and continue from the current pushed Game Rewind UK state. Use the OneDrive repo path. Do not push unless I ask.
```
