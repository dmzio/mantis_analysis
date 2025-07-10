# PrimeVue + Sakai Quick Guide

This guide collects the basic setup steps for PrimeVue projects using the **Sakai** template. Follow it together with the instructions in `AGENTS.md` when working on the Visualizer app.

## Installing PrimeVue

```bash
# npm
npm install primevue @primeuix/themes

# yarn
yarn add primevue @primeuix/themes

# pnpm
pnpm add primevue @primeuix/themes
```

Then install the PrimeVue plugin inside your Vue application and configure a theme.

```ts
import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

const app = createApp(App)
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
})
```

To verify the setup, register a component and render it:

```ts
import Button from 'primevue/button'

app.component('Button', Button)
```

Check the [primevue-examples](https://github.com/primefaces/primevue-examples) repository for more sample projects.

## Sakai Template Basics

Sakai provides a prebuilt layout for Vite powered Vue projects. Clone the template and install dependencies:

```bash
git clone https://github.com/primefaces/sakai-vue
cd sakai-vue
npm install
npm run dev
```

Important directories:

- `src/layout` – main layout files
- `src/views` – demo pages (e.g. Dashboard)
- `public/demo` – demo assets
- `src/assets/demo` – demo styles
- `src/assets/layout` – SCSS for layout styling

The main menu is defined in `src/layout/AppMenu.vue`. Update its `model` to customize navigation. Layout state such as dark mode, theme and menu options is managed by the composable in `src/layout/composables/layout.js`.

Template CSS variables live under `assets/layout/_variables.scss` and can be customized. Demo pages rely on Tailwind CSS while the core layout uses custom CSS.



