import { defineComponent } from 'vue';
import store from '../store';
import router from '../router';
import { ensureData } from '../dataLoader';
import SessionListing from './SessionListing';

export default defineComponent({
  name: 'DashboardPage',
  components: { SessionListing },
  async mounted() {
    const ok = await ensureData();
    if (!ok) {
      router.push('/');
    }
  },
  template: `
      <div class="dashboard-page">
        <div class="card">
          <header>Sessions</header>
          <SessionListing :sessions="sessionList" />
        </div>
      </div>
    `,
  computed: {
    store() {
      return store;
    },
    sessionList() {
      return Object.values(store.sessions);
    }
  }
});
