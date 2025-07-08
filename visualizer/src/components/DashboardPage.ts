import { defineComponent } from 'vue';
import store from '../store';
import router from '../router';
import SessionListing from './SessionListing';

export default defineComponent({
  name: 'DashboardPage',
  components: { SessionListing },
  mounted() {
    if (!Object.keys(store.sessions).length) {
      router.push('/');
    }
  },
  template: `
      <div class="dashboard-page">
        <header>Sessions</header>
        <SessionListing :sessions="sessionList" />
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
