# Game Rewind UK

Game Rewind UK is a static nostalgia site for UK retro gamers. Search for a game release and the site rewinds to the same month in British pop culture, including games, cinema, music, video rentals, kids TV, and wrestling.

Live site: https://gamerewind.uk/

## Project Structure

- `index.html` - main app shell
- `app.js` - home page interaction and rendering logic
- `game-rewind-data.js` - Google Sheet loading, parsing, search helpers, and cover lookup
- `styles.css` - site layout, visual styles, and responsive rules
- `about.html` - project explanation and credits
- `404.html` - lightweight missing page for GitHub Pages
- `HANDOFF.md` - transfer notes for future setup

## Data

The app loads data from a Google Sheet through OpenSheet and Google Visualization endpoints. Expected tabs include:

- `Games`
- `Cinema`
- `Music`
- `WWE`
- `Rental`
- `Cartoons`

The Games sheet is required. Other sections are treated as optional so the site can still load if one supporting tab is temporarily unavailable.

## Local Use

No build step is required. Open `index.html` in a browser, or serve the folder with any simple static file server.

## Deployment

The repository is set up for GitHub Pages with the custom domain in `CNAME`:

```text
gamerewind.uk
```

Keep secrets and API keys out of the public repo. The IGDB cover lookup currently goes through a proxy URL in `game-rewind-data.js`.
