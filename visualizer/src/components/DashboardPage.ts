import { defineComponent } from 'vue';
import store from '../store';
import SessionListing from './SessionListing';

export default defineComponent({
  name: 'DashboardPage',
  components: { SessionListing },
  template: `
      <div class="dashboard-page">
        <header>Sessions</header>
        <SessionListing :sessions="store.sessions" />
      </div>
    `,
  computed: {
    store() {
      return store;
    }
  }
});
