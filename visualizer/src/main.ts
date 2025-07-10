import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Lara from '@primevue/themes/lara';
import 'primeicons/primeicons.css';
import router from './router';
import AppRoot from './App';
import './main.css';

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
document.body.setAttribute('data-theme', 'lara-dark-blue');
