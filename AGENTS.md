# Contributor Guide

## Dev Environment Tips

There are two independent parts: Python data downloading and processing scripts
and the HTML/JS visualizer.

### Data downloader

Python scripts.

### Visualizer

A no-bundle Vue 3 app located in `./visualizer`.
Components live under `js/components` and are wrapped in UMD format so Node
tests can import them while the browser uses global Vue variables.
Visual elements in this app should utilize the **PrimeVue UI Suite**.
The entry file `visualize_session.html` can be opened directly via the
`file://` scheme.

```
visualizer/
├─ visualize_session.html
├─ css/
│   └─ main.css
├─ js/
│   ├─ app.js
│   ├─ router.js
│   └─ components/
│       └─ SessionViewer.js
├─ tests/
│   ├─ unit/      ← Vitest + Vue Test Utils
│   └─ e2e/       ← Playwright
├─ .github/workflows/ci.yml
└─ package.json
```

#### Running tests

From the `visualizer` directory:

```
npm install
npm run test        # unit/component tests
npm run test:e2e    # full browser checks
```

CI executes the same commands via `.github/workflows/ci.yml`.
