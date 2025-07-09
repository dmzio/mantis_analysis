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
The app's layout is based on the free **Sakai** PrimeVue template. Use it for
all themes with a topbar (menubar), left sidebar and a main container.
All icons must come from the PrimeVue [Material Design icon set](https://primevue.org/customicons/#material) using the `useCustomIcon` helper. Other widgets (tables, buttons, etc.) should use the PrimeVue component equivalents whenever possible.
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
