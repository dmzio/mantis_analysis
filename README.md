![Visualizer CI](https://github.com/dmzio/mantis_analysis/actions/workflows/ci.yml/badge.svg)
![Python CI](https://github.com/dmzio/mantis_analysis/actions/workflows/python.yml/badge.svg)

# Deep Mantis

**Deep Mantis** transforms MantisX session exports into a local analytics workspace. The Python downloader saves session JSON exports for a configured account, and the Vue visualizer loads those exports in the browser for session trends, shot traces, drift review, and stability analysis.

The project focuses on **ISSF Air Pistol** dry-fire training analysis and helps track athlete progress from shot traces, hold behavior, trigger movement, cadence, and stability metrics.

Deep Mantis is an independent project and is not affiliated with, endorsed by, or sponsored by MantisX.

## Repository structure

- `python/`: CLI scripts, data models, and tests for ingesting MantisX session JSON exports.
- `visualizer/`: Vite + Vue 3 application (TypeScript) built with PrimeVue components and custom layouts.
- `samples/`: anonymized sample sessions used by the downloader tests and for reference in the visualizer.
- `mantisweb_src/`: original MantisX web artifacts kept for reference only and excluded from this repository's MIT license.

## Getting started

1. **Install prerequisites** – Node.js 20.x, `npm`, and the `uv` Python package manager. If you need to re-sync dependencies, run:
   ```bash
   cd python
   uv sync
   ```
   Keep setup commands scoped to this repository.
2. **Bootstrap the repository** – execute `make setup` at the root. It installs Visualizer dependencies (including Playwright) and syncs the Python environment via `uv`.
3. **Fetch data** – copy `python/config.json.example` to `python/config.json`, fill in your API credentials, and run the downloader from the repository root with:
   ```bash
   (cd python && uv --cache-dir .uv_cache run python scripts/data_download.py)
   ```
   Resulting JSON files and session photos are stored under `data/sessions/`.

## Data and credentials

- `python/config.json` contains account credentials and is ignored by Git.
- Downloaded session exports and session photos are stored under `data/sessions/` and are ignored by Git.
- Session exports can contain personal training metadata, notes, comments, and media references. Review any data before sharing it.
- Sample sessions under `samples/sessions/` are anonymized fixtures for tests and visualizer development.

## Local Visualizer

The visualizer is a browser-based workspace for inspecting exported MantisX session JSON files. It runs from `visualizer/` and processes data locally in the browser.

Use it to:

- load a folder of session exports;
- review session summaries, shot cadence, stability, and accuracy trends;
- inspect individual shot traces;
- compare raw and processed trace views;
- keep training data on the local machine during analysis.

To run locally, use `npm run dev` from `visualizer/` or build with `npm run build`. Playwright tests should execute inside the official Playwright container.

## Testing & linting

Aligning with CI:

- **Python**
  ```bash
  uv --project python run ruff format --check python
  uv --project python run ruff check python
  uv --project python run pytest -q
  ```
- **Visualizer**
  ```bash
  cd visualizer
  npm run test
  ```
  Run browser checks inside the official Playwright container with the version that matches `@playwright/test` in `visualizer/package.json`:
  ```bash
  docker run --rm \
    -v "$PWD":/workspace \
    -w /workspace/visualizer \
    mcr.microsoft.com/playwright:v1.53.2-jammy \
    /bin/bash -lc "npm install --no-fund --no-audit && npm run test:e2e"
  ```

## Samples & reference assets

- Sample sessions under `samples/sessions/` are used by the downloader tests and can guide exploratory analysis in the visualizer.
- The `mantisweb_src/` directory holds upstream MantisX assets for comparison only; it is **not covered by this repository’s MIT license** (see `mantisweb_src/README.md` for details).

## License

The project is distributed under the [MIT License](LICENSE), except for third-party reference files under `mantisweb_src/`.
