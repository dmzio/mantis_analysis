import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Lara from '@primevue/themes/lara';
import 'primeicons/primeicons.css';
import router from './router';
import AppRoot from './App';
import './main.css';
import { hydrateStoreFromCache } from './cacheBootstrap';

const dark = (localStorage.getItem('darkMode') ?? 'true') === 'true';
document.body.classList.toggle('p-dark', dark);
document.body.setAttribute('data-theme', dark ? 'lara-dark-blue' : 'lara-light-blue');

(async () => {
  await hydrateStoreFromCache();
  const app = createApp(AppRoot);
  app.use(PrimeVue, {
    theme: {
      preset: Lara,
      options: {
        darkModeSelector: '.p-dark'
      }
    }
  });
  app.use(router);
  app.mount('#app');
})();
