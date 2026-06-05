import { defineComponent } from 'vue';
import Button from 'primevue/button';
import { formatDate } from '../dateFmt';
import store from '../store';
import { ensureDashboardData } from '../dataLoader';
import SessionListing from './SessionListing';
import SessionScatterPlots from './SessionScatterPlots';
import DataAccessPrompt from './DataAccessPrompt';
import { computeMeanPullVector, computeSessionMetrics, SESSION_METRICS } from '../sessionMetrics';
import { getProcessedShots } from '../sessionData';
import { formatSessionDuration } from '../durationFmt';
import { perfNow, recordPerf } from '../perfMetrics';
import { getActiveDriftMode } from '../appSettings';

interface DateFilterPreset {
  key: string;
  label: string;
  months: number | null;
}

const DATE_FILTER_PRESETS: DateFilterPreset[] = [
  { key: '1m', label: 'last month', months: 1 },
  { key: '3m', label: '3 months', months: 3 },
  { key: '6m', label: '6 months', months: 6 },
  { key: 'all', label: 'all', months: null }
];

export default defineComponent({
  name: 'DashboardPage',
  components: { SessionListing, SessionScatterPlots, DataAccessPrompt, Button },
  async mounted() {
    await this.loadDashboard();
  },
  data() {
    return {
      dateFilter: '6m',
      activeSessionMap: {} as Record<number, boolean>,
      filters: DATE_FILTER_PRESETS,
      filterInitialized: false,
      autoFilterEnabled: true,
      loadingDashboard: true,
      needsDataAccess: false,
      dataAccessMessage: '',
      loadError: ''
    };
  },
  watch: {
    sessionList: {
      handler() {
        if (!this.sessionList.length) return;
        if (!this.filterInitialized) {
          this.applyDateFilter(this.dateFilter);
          return;
        }
        if (this.autoFilterEnabled) {
          this.applyDateFilter(this.dateFilter, { keepAuto: true });
        }
      },
      deep: false
    }
  },
  template: `
      <div class="dashboard-page">
        <section class="dashboard-page__sessions card">
          <div class="dashboard-panel-header">
            <h3>Sessions</h3>
            <div class="dashboard-filters" aria-label="Session filters" role="group">
              <span class="dashboard-filters__label">Filters</span>
              <div class="dashboard-filters__controls">
                <Button
                  v-for="preset in filters"
                  :key="preset.key"
                  size="small"
                  :label="preset.label"
                  :severity="dateFilter === preset.key ? 'secondary' : 'contrast'"
                  :outlined="dateFilter !== preset.key"
                  @click="setDateFilter(preset.key)"
                />
              </div>
            </div>
          </div>
          <SessionListing
            :sessions="sessionList"
            :activeSessionPks="activeSessionIds"
            :photos="store.photos"
            @toggle-session="toggleSessionActivity"
          />
        </section>
        <section class="dashboard-page__charts">
          <div v-if="loadingDashboard" class="session-view__loading" data-testid="dashboard-loading">Loading dashboard</div>
          <DataAccessPrompt
            v-else-if="needsDataAccess"
            :message="dataAccessMessage"
            @loaded="loadDashboard"
          />
          <div v-else-if="loadError" class="session-view__error" data-testid="dashboard-error">{{ loadError }}</div>
          <SessionScatterPlots v-else-if="chartsReady" :sessions="activeSessions" />
        </section>
      </div>
    `,
  computed: {
    store() {
      return store;
    },
    activeSessionIds(): number[] {
      return Object.entries(this.activeSessionMap)
        .filter(([, enabled]) => enabled)
        .map(([pk]) => Number(pk));
    },
    activeSessions() {
      if (!this.activeSessionIds.length) return [];
      const activeSet = new Set(this.activeSessionIds);
      return this.sessionList.filter(session => activeSet.has(session.pk));
    },
    chartsReady(): boolean {
      return !store.loading;
    },
    sessionList() {
      const start = perfNow();
      const mode = getActiveDriftMode();
      const sessions = Object.values(store.sessions).slice();
      try {
        sessions.sort((a: any, b: any) => {
          const da = typeof a.timestamp === 'number' ? a.timestamp : (a.date ? new Date(a.date).getTime() : 0);
          const db = typeof b.timestamp === 'number' ? b.timestamp : (b.date ? new Date(b.date).getTime() : 0);
          return db - da;
        });
        return sessions.map((s: any) => {
          const shotCount = s.shot_count ?? 0;
          const firearm = s.firearm_label || '';
          const drill = s.drill_label || '';
          const avgScore = typeof s.avg_score === 'number' ? s.avg_score : null;
          const aggregate = store.aggregates[s.pk];
          const aggregateMetrics = aggregate?.metrics;
          const sessionMetrics = s.metrics;
          const hasModeMetrics =
            !!aggregate?.metricsByMode ||
            !!s.metricsByMode ||
            !!aggregateMetrics?.original ||
            !!aggregateMetrics?.corrected ||
            !!sessionMetrics?.original ||
            !!sessionMetrics?.corrected;
          let metricStats =
            aggregate?.metricsByMode?.[mode] ||
            s.metricsByMode?.[mode] ||
            aggregateMetrics?.[mode] ||
            sessionMetrics?.[mode] ||
            (!hasModeMetrics && aggregateMetrics?.percent10 ? aggregateMetrics : null) ||
            (!hasModeMetrics && sessionMetrics?.percent10 ? sessionMetrics : null) ||
            {};
          if ((!metricStats || !Object.keys(metricStats).length) && s.ready) {
            const processedShots = getProcessedShots(s.pk, mode);
            if (processedShots.length) {
              metricStats = computeSessionMetrics(processedShots);
            }
          }
          if (s.ready && !metricStats?.meanPullVector) {
            const processedShots = getProcessedShots(s.pk, mode);
            const meanPullVector = computeMeanPullVector(processedShots);
            if (meanPullVector) {
              metricStats = {
                ...metricStats,
                meanPullVector
              };
            }
          }
          const metrics: Record<string, {
            mean: number | null;
            sd: number | null;
            median: number | null;
            q1: number | null;
            q3: number | null;
          }> = {};
          SESSION_METRICS.forEach(def => {
            const stat = metricStats?.[def.key];
            metrics[def.key] = {
              mean: stat?.mean ?? null,
              sd: stat?.sd ?? null,
              median: stat?.median ?? stat?.mean ?? null,
              q1: stat?.q1 ?? null,
              q3: stat?.q3 ?? null
            };
          });
          const rawDuration = s.duration_label || s.time_display || s.time_bars;
          const durationLabel = formatSessionDuration(rawDuration);
          return {
            ...s,
            fmtDate: s.fmtDate || (s.date ? formatDate(s.date) : ''),
            shot_count: shotCount,
            drill_label: drill,
            firearm_label: firearm,
            avg_score: avgScore,
            duration_label: durationLabel,
            metrics,
            meanPullVector: metricStats?.meanPullVector ?? null
          };
        });
      } finally {
        recordPerf('dashboard:sessionList', perfNow() - start, { sessions: sessions.length });
      }
    }
  },
  methods: {
    async loadDashboard() {
      this.loadingDashboard = true;
      this.needsDataAccess = false;
      this.loadError = '';
      const result = await ensureDashboardData();
      this.loadingDashboard = false;
      if (result.status === 'needs-user-action') {
        this.needsDataAccess = true;
        this.dataAccessMessage = result.message;
        return;
      }
      if (result.status !== 'ready') {
        this.loadError = result.message || 'Dashboard data is not available.';
        return;
      }
      this.ensureActiveSessions();
    },
    setDateFilter(key: string) {
      if (this.dateFilter === key) {
        this.applyDateFilter(key);
        return;
      }
      this.dateFilter = key;
      this.applyDateFilter(key);
    },
    applyDateFilter(key: string, options: { keepAuto?: boolean } = {}) {
      const { keepAuto = false } = options;
      const preset = DATE_FILTER_PRESETS.find(p => p.key === key) || DATE_FILTER_PRESETS[2];
      const cutoff = preset.months ? this.monthsAgo(preset.months) : null;
      const nextMap: Record<number, boolean> = {};
      this.sessionList.forEach((session: any) => {
        if (!cutoff) {
          nextMap[session.pk] = true;
          return;
        }
        if (!session.date) return;
        const time = new Date(session.date).getTime();
        if (Number.isNaN(time)) return;
        if (time >= cutoff.getTime()) {
          nextMap[session.pk] = true;
        }
      });
      this.activeSessionMap = nextMap;
      this.filterInitialized = true;
      if (!keepAuto) {
        this.autoFilterEnabled = true;
      }
    },
    monthsAgo(months: number) {
      const today = new Date();
      const cutoff = new Date(today);
      cutoff.setMonth(cutoff.getMonth() - months);
      return cutoff;
    },
    toggleSessionActivity(session: any) {
      this.autoFilterEnabled = false;
      const pk = session?.pk;
      if (!pk) return;
      const next = { ...this.activeSessionMap };
      if (next[pk]) {
        delete next[pk];
      } else {
        next[pk] = true;
      }
      this.activeSessionMap = next;
    },
    ensureActiveSessions() {
      if (!this.sessionList.length) return;
      if (!this.filterInitialized) {
        this.applyDateFilter(this.dateFilter);
      }
    }
  }
});
