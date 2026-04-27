# trackfolio

A small, single-file worklog viewer. Two views — a chronological feed and a project-by-day columns view — over the same data. No build step, no backend; React loads from a CDN and Babel transpiles JSX in the browser.

**Live**: https://ilstar.github.io/trackfolio/

## Run locally

Any static server works. From the repo root:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Data

The app starts with sample data from `data.js`. Your own data lives in two places:

- **Browser localStorage** — autosaved on every change. Survives reloads.
- **A JSON file on disk** — opt-in via the **Connect** button (uses the File System Access API on Chromium browsers). Once connected, every change is written through to the file.

If your browser doesn't support FSA (Safari, Firefox), use **Import** / **Export** instead — same JSON format.

### JSON shape

```json
{
  "projects": [
    { "id": "p1", "name": "Atlas Migration", "color": "oklch(0.62 0.14 250)" }
  ],
  "entries": [
    { "id": "e1", "date": "2026-04-20", "type": "info", "project": "p1", "text": "..." }
  ]
}
```

- `entries[].type` is one of `info`, `issue`, `milestone`.
- `entries[].project` is a project `id`, or `null` for unaffiliated entries.
- `entries[].date` is `YYYY-MM-DD`.

## Files

- `index.html` — entry point; pulls React + Babel from unpkg.
- `app.jsx` — top-level shell, persistence, import/export, file connect.
- `worklog-core.jsx` — the feed view.
- `worklog-columns.jsx` — the project-columns view.
- `utils.js` — date helpers and small utilities.
- `styles.css` — all styling.
- `data.js` — sample data used on first run.

## Deploying

The site is served from `main` at the repo root via GitHub Pages. Pushing to `main` redeploys.
