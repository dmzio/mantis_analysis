# PrimeVue Quick Guide

This short guide outlines the basic PrimeVue setup used in the Visualizer app.

## Installing PrimeVue

```bash
npm install primevue @primevue/themes primeicons
```

Then install the PrimeVue plugin inside your Vue application and select the **Lara** theme preset.

```ts
import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Lara from '@primevue/themes/lara'

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: Lara,
    options: { darkModeSelector: '.p-dark' }
  }
})
```

To verify the setup, register a component and render it:

```ts
import Button from 'primevue/button'
app.component('Button', Button)
```

## Custom Layout Basics

The app uses a simple layout consisting of a fixed 50&nbsp;px top bar, a 400&nbsp;px sidebar and a main content area. A dark mode switch lives in the top bar and stores its state in `localStorage`.
