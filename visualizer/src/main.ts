import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import router from './router';
import AppRoot from './App';
import './main.css';

const app = createApp(AppRoot);
app.use(PrimeVue);
app.use(router);
app.mount('#app');
