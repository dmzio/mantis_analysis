import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import router from './router';
import './main.css';

const app = createApp({ template: '<router-view></router-view>' });
app.use(PrimeVue);
app.use(router);
app.mount('#app');
