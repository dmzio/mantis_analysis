# Contributor Guide

## General guidelines

- Always ensure that all relevant lints and tests pass before finishing the work.
- Never add phrases like 'new, updated, fixed, previous, etc.' in the docs and code comments. All documentation and code should be consistent at current moment, without any references to past states. You can use such phrases **only** in the commit messages.
- Don't forget to add to GIT all created files if they should persist in repository.
- Before commits, run `git status --short --ignored` and confirm that credentials, session exports, photos, editor metadata, generated output, and local caches are not staged or tracked.
- Do not commit `python/config.json`, `data/sessions` exports, `data/sessions/session_photo`, `.idea`, `.codex`, generated visualizer output, Playwright artifacts, local dependency directories, or local cache directories.

## Dev Environment Tips

There are two independent parts: Python data downloading and the Visualizer web app.
All environment setup should alwys be scoped to the current workdir only, no command should be allowed to make changes outside the project directlry.
Take care that any setup command respects this rule. If makes sense or no other option - use Docker to isolate the environment.
Do **not** use `pip` directly. Rely on `uv` for Python dependency management and only introduce additional dependencies through Docker so every change remains within the repository.

### References and sample data

sample data file exist at `samples/sessions` - use during visualisation and analysis development

`mantisweb_src` dir contains original MantisX web code, as a reference implementation, not for direct reuse.


### Data downloader

Python scripts live in `./python`.

### Visualizer

A Vite powered Vue 3 app written in **TypeScript** located in `./visualizer`.
Components live under `src/components` and are standard ES modules.
Visual elements should utilize the **PrimeVue UI Suite**.
The app uses a custom layout consisting of a 50&nbsp;px top bar, a 400&nbsp;px
sidebar and a main content area. The menubar is placed in the top bar, the
router sidebar view goes into the sidebar and the main router view is rendered
inside the main container. It uses PrimeVue's **styled** mode with the
`lara-dark-blue` theme. Dark mode is toggled by adding or removing the
`.p-dark` class on the document body.
All icons must come from the PrimeVue [Material Design icon set](https://primevue.org/customicons/#material) using the `useCustomIcon` helper. Other widgets (tables, buttons, etc.) should use the PrimeVue component equivalents whenever possible.
For installation commands and layout tips see `docs/primevue_sakai.md`.
Run the app through Vite's dev server or build it via `npm run build`.
All components and functions should have clear docstring and be covered by unit and/or e2e tests.

> **Layout hygiene**
>
> Dashboard views must never introduce horizontal scrolling. Always size tables, charts, and grids so content fits the available width while remaining readable on large and small displays. Treat horizontal overflow as a bug to be fixed immediately.  
> **Absolutely no horizontal scroll is permitted anywhere in the UI.** If a change introduces any sideways scrolling, stop and fix before continuing.

```
visualizer/
├─ index.html
├─ src/
│   ├─ main.ts
│   ├─ router.ts
│   ├─ store.ts
│   └─ components/
│       └─ SessionViewer.ts
├─ tests/
│   ├─ unit/      ← Vitest + Vue Test Utils
│   └─ e2e/       ← Playwright
├─ vite.config.ts
├─ vitest.config.ts
└─ package.json
```

#### Running tests

From the `visualizer` directory:

```
npm install
npm run build       # generates `dist/`
npm run test        # unit/component tests
npm run test:coverage  # unit tests with coverage report
```

 ##### Playwright E2E tests and other browser checks

 Some hosts block Chromium's sandbox, causing `npm run test:e2e` to fail. 
 You can run the same suite inside the official Playwright container while keeping all writes inside the repo:
 ```
 docker run --rm \
   -v "$PWD":/workspace \
   -w /workspace/visualizer \
   mcr.microsoft.com/playwright:v1.45.0-jammy \
   /bin/bash -lc "npm install && npm run test:e2e"
 ```
 This uses the container's browsers and respects the "workspace only" rule.

> **Playwright Docker rule**
>
> Whenever Playwright tests or lint steps need to run, always use the official Playwright Docker image (as shown above) unless the user explicitly instructs otherwise.

### Command approvals & timeouts

- Use the Codex escalation workflow (`with_escalated_permissions`) any time a command needs Docker, network access, or other privileged resources. Don’t rely on a verbal request.
- Prefer Playwright container versions that match the `@playwright/test` entry in `package.json` (e.g., if the project depends on `1.53.2`, run `mcr.microsoft.com/playwright:v1.53.2-jammy`).
- Allocate generous timeouts for Docker commands (`timeout_ms` ≥ 240 000) because image pulls and browser downloads can take several minutes.
- If Playwright reports that the Docker image version is out of sync, switch to the suggested tag before retrying rather than rerunning with the old image.

CI executes the same commands via `.github/workflows/ci.yml`.
All new features and components must include appropriate unit or end-to-end tests.
**Always run** the relevant checks above (and any others tied to your change) before handing off work, and report their status in your summary.
