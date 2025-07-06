import { defineComponent } from 'vue';
import store from '../store';

export default defineComponent({
  name: 'DashboardPage',
  template: `
      <div class="dashboard-page">
        <header>Sessions</header>
        <ul>
          <li v-for="(s, i) in store.sessions" :key="i">{{ s.session?.name || s.name || 'session '+(i+1) }}</li>
        </ul>
      </div>
    `,
  computed: {
    store() {
      return store;
    }
  }
});
