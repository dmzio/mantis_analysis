![Visualizer CI](https://github.com/dmzio/mantis_analysis/actions/workflows/ci.yml/badge.svg)
![Python CI](https://github.com/dmzio/mantis_analysis/actions/workflows/python.yml/badge.svg)

# Deep Mantis

**Deep Mantis** transforms raw MantisX exports into an analytics workspace: the Python downloader ingests and caches every available session, and the Vue-powered visualizer lets you explore accuracy, drift, shot-level traces, and session stability reports with a professional dashboard.

Currently intended for deep analysis of trainings for **ISSF Air Pistol** discipline. Allows to derive deep analytics from shot traces and tracking the athletes' progress.

## Repository structure

- `python/`: CLI scripts, data models, and tests for ingesting MantisX session JSON exports.
- `visualizer/`: Vite + Vue 3 application (TypeScript) built with PrimeVue components and custom layouts.
- `samples/`: civic sample sessions used by the downloader tests and for reference in the visualizer.
- `mantisweb_src/`: original MantisX web artifacts kept for reference only (see below).

## Getting started

1. **Install prerequisites** – Node.js 20.x, `npm`, and the `uv` Python package manager. If you need to re-sync dependencies, run:
   ```bash
   uv sync
   ```
   Keep that command scoped to `/python`; the repository tracks all changes locally.
2. **Bootstrap the repository** – execute `make setup` at the root. It installs Visualizer dependencies (including Playwright) and syncs the Python environment via `uv`.
3. **Fetch data** – populate `python/config.json` with your API credentials, optionally adjusting `history_months`, `history_window_months`, or `history_start`. Run the downloader from the repository root with:
   ```bash
   (cd python && uv --cache-dir .uv_cache run python scripts/data_download.py)
   ```
   Resulting JSON files and session photos are stored under `data/sessions/`.

## Visualizer overview

- Developed in `./visualizer`, the app targets a 50 px top bar, a 400 px sidebar, and a flexible main canvas. PrimeVue’s styled mode with `lara-dark-blue` keeps the UI consistent with the project theme; icons come from the Material Design set via `useCustomIcon`.
- The sidebar and menubar render router views, while session and shot screens rely on cached session data from `sessionData.ts`.
- Session analytics include aiming stability versus aiming time, pre-shot displacement versus aiming time, post-shot stability versus aiming time, and 5-minute aiming-stability trends over the session.
- To run locally, use `npm run dev` from `visualizer/` or build with `npm run build`. Playwright tests should execute inside the official Playwright container (see `docs/primevue_sakai.md` for layout details).

## Testing & linting

Aligning with CI:

- **Python**
  ```bash
  uv run ruff format --check .
  uv run ruff check .
  uv --project python run pytest -q
  ```
- **Visualizer**
  ```bash
  cd visualizer
  npm run test
  ```
  (If your host lacks the right ICU libraries, run the tests inside a container such as `docker run --rm -v "$PWD":/workspace -w /workspace/visualizer node:20-bullseye /bin/bash -lc "npm install --no-fund --no-audit && npm run test"`.)

## Samples & reference assets

- Sample sessions under `samples/sessions/` are used by the downloader tests and can guide exploratory analysis in the visualizer.
- The `mantisweb_src/` directory holds upstream MantisX assets for comparison only; it is **not covered by this repository’s MIT license** (see `mantisweb_src/README.md` for details).

## License

The project is distributed under the [MIT License](LICENSE).
