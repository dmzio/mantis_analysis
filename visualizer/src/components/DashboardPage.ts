import { defineComponent } from 'vue';
import { formatDate } from '../dateFmt';
import store from '../store';
import router from '../router';
import { ensureData } from '../dataLoader';
import SessionListing from './SessionListing';
import SessionScatterPlots from './SessionScatterPlots';

export default defineComponent({
  name: 'DashboardPage',
  components: { SessionListing, SessionScatterPlots },
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
        <SessionScatterPlots :sessions="sessionList" />
      </div>
    `,
  computed: {
    store() {
      return store;
    },
    sessionList() {
      const sessions = Object.values(store.sessions).slice();
      sessions.sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
      return sessions.map((s: any) => ({
        ...s,
        fmtDate: s.date ? formatDate(s.date) : '',
        shot_count: s.shot_count ?? (Array.isArray(s.shots) ? s.shots.length : 0)
      }));
    }
  }
});
