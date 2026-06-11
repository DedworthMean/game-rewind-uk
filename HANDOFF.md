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

`72f3f31 Add shareable URLs and card templates`

Current work is local and not pushed.

## Current Local Server

The local site has been tested at:

`http://127.0.0.1:8097/index.html`

If it is not running, start it from the active project folder with Python HTTP server on port `8097`.

## Current Local Git State

Expected local changes:

- Modified:
  - `app.js`
  - `game-rewind-data.js`
  - `index.html`
  - `styles.css`
- Untracked:
  - `console/`

The `console/` folder inside the repo contains the console launch art files copied from:

`C:\Users\deana\OneDrive\Documents\App\Game Rewind\console`

Do not delete this repo `console/` folder; it is needed for the website and eventual GitHub deploy.

## What Was Added Locally

### Console Launch Feature

A new Google Sheet tab named `Console` is now loaded by `game-rewind-data.js`.

The sheet currently has columns like:

- `Date`
- `Console`
- `Headline`
- `Description` optional

The app parses console launch rows and exposes them as `consoleLaunches`.

### Console Launch Result Page

Searching for a console launch, for example `NES`, `Master System`, `Mega Drive`, `Super Nintendo`, `PS2`, etc., opens a standalone console launch page.

The page shows:

- 1600 x 900 console launch artwork in a wide 16:9 panel.
- Console launch headline.
- Launch month only in the hero meta line, for example:
  - `September 1986 / NINTENDO ENTERTAINMENT SYSTEM`
- A launch window games section.
- A bottom section labelled:
  - `THE REST OF THIS MONTH'S RELEASES`
- That bottom section subtitle also shows only the launch month, not the window.
- A final launch-month culture section with:
  - cinema
  - rental
  - music
  - kids TV
  - wrestling

### Launch Window Logic

The launch window means:

Launch month + the following month.

Example:

- NES launch month: `September 1986`
- Launch window: `September 1986 - October 1986`

This wider launch window is used only for collecting games in the launch-window games section and the rest-of-releases list.

The hero date and bottom “rest of this month” date intentionally show only the actual launch month.

### Browse by Date

If someone browses to a month/year that has a console launch, the console launch promo appears at the top of the date result list, above ordinary game releases.

Example:

`September 1986` shows the NES launch promo first.

### Console Art Mapping

All console launch image files are copied into:

`C:\Users\deana\OneDrive\Documents\App\Game Rewind\game-rewind-uk\console`

Current files include:

- `Dreamcast.png`
- `Game Boy.png`
- `GameCube.png`
- `GBA.png`
- `Master System.png`
- `Mega CD.png`
- `Mega Drive 32x.png`
- `Mega Drive.png`
- `N64.png`
- `NES.png`
- `Nintendo DS.png`
- `PS1.png`
- `PS2.png`
- `PS3.png`
- `PSP.png`
- `Sega Saturn.png`
- `Super Nintendo.png`
- `Wii.png`
- `Xbox 360.png`
- `Xbox.png`

Aliases in `app.js` map sheet console names like `SONY PLAYSTATION`, `XBOX LAUNCH`, and `SONY PSP` to the right file.

## Tested

Playwright smoke tests were run locally.

Confirmed:

- Site loads on `8097`.
- `Console` sheet loads.
- 20 console launch rows load.
- All 20 launch rows have matching artwork after alias fixes.
- No page errors in test.
- NES launch page:
  - Uses `console/NES.png`.
  - Shows launch month only in hero meta.
  - Uses launch window for launch-window games.
- `Mega Drive 32x` correctly rolls from January 1995 to February 1995.
- Mobile and desktop checks kept the console launch art at 16:9.
- Console launch pages show the usual launch-month culture sections below the launch games and rest-of-month releases.
- Normal game result pages still show the Retro Weekend card and category pick controls after the shared culture-section renderer change.
- Missing or failed images now show a consistent `Image pending` placeholder for game art, console launch art, launch game thumbnails, Retro Weekend culture tiles, and share-card previews/exports.

Experimental local addition after the live push:

- `Birthday List` nav tool.
- User enters a full birth date.
- The app uses the birthday month and birth year to build a year-by-year archive timeline from that year onward.
- Each timeline year shows age, game links, console launches when present, and culture counts for cinema, rental, music, kids TV, and wrestling.
- This is intentionally self-contained so it can be removed if the feature does not feel right.

Local addition after Birthday List:

- Music sheet rows now read a `Link` column.
- If a music row has a YouTube link and no `Image`, the app derives a thumbnail from the YouTube video ID.
- Music result links now prefer the direct `Link` URL over the generic YouTube search URL.
- Tested with September 1986: `Communards - Don't Leave Me This Way` links to the sheet YouTube URL and uses `img.youtube.com` artwork in the Retro Weekend tile.
- Best Of / Retro Weekend music now follows the same rule for `Music Link`: YouTube links become the click target and thumbnail source; non-YouTube links are still treated as artwork.
- Tested with September 1986 Best Of music: `Run DMC / Aerosmith - Walk This Way` opens the direct YouTube URL and uses the YouTube thumbnail.

Known data note:

- Nintendo DS currently has `0` launch-window games because the Games sheet has not yet been updated with March/April 2005 DS games. The feature is ready; once those rows are added, they should appear automatically.

## Existing Features To Preserve

Keep these earlier features intact:

- Shareable Retro Weekend URLs.
- Share card modal and downloads.
- Share card templates:
  - Standard
  - Magazine
  - 80's Movie
  - Game Box
  - Web Y2K
  - Teletext
  - VHS Tape
- Month issue homepage mode.
- Randomized “this month” picks.
- Home button next to About.
- Category pick/remove controls for Retro Weekend cards.

## Current User Preferences

- Keep changes local until the user explicitly says to push.
- The console launch artwork is designed as 1600 x 900 and should remain wide, not cropped into vertical box-art shape.
- Console launch pages should feel like standalone special results.
- Date browse should force console launches to the top when that launch month/year is selected.
- Launch-window game logic should use launch month plus following month.
- Visible launch date text in the hero and bottom rest-of-month area should use launch month only.

## Suggested Next Steps

1. Let the user visually inspect the full set of console launch pages.
2. When the user is happy, commit and push the local changes to GitHub.

## Useful First Prompt For Next Window

```text
Read HANDOFF.md, inspect the current git diff, and continue from the local console launch work. Do not push unless I ask.
```
