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
        <section class="dashboard-page__sessions card">
          <div class="dashboard-panel-header">
            <h3>Sessions</h3>
          </div>
          <SessionListing :sessions="sessionList" />
        </section>
        <section class="dashboard-page__charts">
          <SessionScatterPlots :sessions="sessionList" />
        </section>
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
      return sessions.map((s: any) => {
        const shotCount = s.shot_count ?? (Array.isArray(s.shots) ? s.shots.length : 0);
        const firearm = (() => {
          if (s.firearm_name) return s.firearm_name;
          if (s.gun_display) return s.gun_display;
          if (s.firearm && (s.firearm.make || s.firearm.model)) {
            return [s.firearm.make, s.firearm.model].filter(Boolean).join(' ');
          }
          return '';
        })();
        const drill = s.drill_name || s.course_number || s.fire_type_display || '';
        const avgScore = typeof s.average_score === 'number' ? s.average_score : null;
        return {
          ...s,
          fmtDate: s.date ? formatDate(s.date) : '',
          shot_count: shotCount,
          drill_label: drill,
          firearm_label: firearm,
          avg_score: avgScore,
          duration_label: s.time_display || ''
        };
      });
    }
  }
});
