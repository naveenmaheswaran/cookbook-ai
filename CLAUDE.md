# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working style

- State assumptions and ask when a request is ambiguous; push back if a simpler approach exists.
- Write the minimum code that solves the problem: no speculative features, abstractions, or configurability.
- Make surgical changes: match existing style, don't refactor or reformat unrelated code, and only remove dead code your own change created.
- Turn tasks into verifiable goals and check them before calling the work done.

## Project: Cookbook website (`cookbook/`)

Plain HTML/CSS/JS front end plus a tiny Node server. No build step, no npm dependencies, no test suite.

- Run: `node cookbook/serve.js`, then open http://localhost:8080. Opening `index.html` directly won't work: recipes load via `fetch`, which browsers block on `file://`, and add/delete need the server's API.

### Architecture

- `serve.js` serves static files from `cookbook/` and exposes a small API:
  - `POST /api/recipes` validates the body, writes `recipes/<slug>.json` (slug from the title, `-2`, `-3`… suffix on collisions) and appends it to `recipes/index.json`.
  - `DELETE /api/recipes/<file>` removes the file and its entry in `index.json`.
- `app.js` reads `recipes/index.json`, fetches each listed file (the filename becomes the recipe `id`), and renders the list, category filter, and detail view. The add form and delete button call the API above. Light/dark theme choice is kept in `localStorage`.

### Recipe data

- One JSON file per recipe in `cookbook/recipes/` with fields: `title`, `category`, `time` (minutes), `servings`, `ingredients` (string array), `steps` (string array).
- The site only loads files listed in `recipes/index.json`. When adding a recipe file by hand, add its filename there too.
