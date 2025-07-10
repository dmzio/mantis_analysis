# Contributor Guide

## Dev Environment Tips

There are two independent parts: Python data downloading and the Visualizer web app.

### References and sample data

sample data file exist at `samples/sessions` - use during visualisation and analysis development

`mantisweb_src` dir contains original MantisX web code, as a reference implementation, not for direct reuse.


### Data downloader

Python scripts.

### Visualizer

A Vite powered Vue 3 app written in **TypeScript** located in `./visualizer`.
Components live under `src/components` and are standard ES modules.
Visual elements should utilize the **PrimeVue UI Suite**.
The app's layout is based on the free **Sakai** PrimeVue template. Use the same
layout classes (`.layout-topbar`, `.layout-sidebar`, `.layout-main-container` and
`.layout-main`) so that any theme will match the template's style. The menubar
is placed in the topbar, the router sidebar view goes into the sidebar and the
main router view is rendered inside the main container.
It uses PrimeVue's **styled** mode with the `lara-dark-blue` theme and keeps
dark mode enabled by applying the `.p-dark` class on the document body.
The compiled layout CSS is loaded from the Sakai template site.
All icons must come from the PrimeVue [Material Design icon set](https://primevue.org/customicons/#material) using the `useCustomIcon` helper. Other widgets (tables, buttons, etc.) should use the PrimeVue component equivalents whenever possible.
For installation commands and Sakai usage tips see `docs/primevue_sakai.md`.
Run the app through Vite's dev server or build it via `npm run build`.

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
npm run test:e2e    # full browser checks
```

CI executes the same commands via `.github/workflows/ci.yml`.
All new features and components must include appropriate unit or end-to-end tests.
