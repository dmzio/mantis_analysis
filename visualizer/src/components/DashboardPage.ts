import { defineComponent } from 'vue';
import { formatDate } from '../dateFmt';
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
      return Object.values(store.sessions).map((s: any) => ({
        ...s,
        fmtDate: s.date ? formatDate(s.date) : '',
        shot_count: s.shot_count ?? (Array.isArray(s.shots) ? s.shots.length : 0)
      }));
    }
  }
});
