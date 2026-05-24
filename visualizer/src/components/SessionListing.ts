import { defineComponent } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useRouter } from 'vue-router';
import { SESSION_METRICS, SessionMetricDefinition, formatMetricValue } from '../sessionMetrics';

export default defineComponent({
  name: 'SessionListing',
  components: { DataTable, Column },
  props: {
    sessions: { type: Array, required: true },
    activeSessionPks: { type: Array, required: true }
  },
  emits: ['toggle-session'],
  setup() {
    const router = useRouter();
    return {
      router,
      metricDefinitions: SESSION_METRICS
    };
  },
  computed: {
    activeSessionSet(): Set<number> {
      const ids = (this.activeSessionPks as number[]) || [];
      return new Set(ids.filter(pk => typeof pk === 'number'));
    }
  },
  methods: {
    toDetails(row: any) {
      this.router.push(`/session/${row.pk}`);
    },
    sessionHref(row: any) {
      return row?.pk ? `/session/${row.pk}` : '#';
    },
    metricValue(row: any, metric: SessionMetricDefinition) {
      const stat = row.metrics?.[metric.key];
      const formatted = formatMetricValue(stat?.mean ?? null, metric.decimals);
      return formatted ?? '—';
    },
    metricTooltip(row: any, metric: SessionMetricDefinition) {
      const stat = row.metrics?.[metric.key];
      if (!stat || stat.mean == null) {
        return `${metric.label}: —`;
      }
      const meanStr = formatMetricValue(stat.mean, metric.decimals);
      const sdStr = formatMetricValue(stat.sd ?? null, metric.decimals);
      if (meanStr && sdStr) {
        return `${metric.label}: ${meanStr} ± ${sdStr}`;
      }
      if (meanStr) {
        return `${metric.label}: ${meanStr}`;
      }
      return `${metric.label}: —`;
    },
    metricColumnClass(metric: SessionMetricDefinition) {
      return `no-wrap-cell align-right session-listing__col-metric session-listing__col-${metric.key}`;
    },
    rowClass(rowData: any) {
      return {
        'session-listing__row--active': this.isActive(rowData)
      };
    },
    isActive(rowData: any) {
      if (!rowData?.pk) return false;
      return this.activeSessionSet.has(rowData.pk);
    },
    handleRowClick(event: { data: any; originalEvent?: MouseEvent }) {
      const target = event?.originalEvent?.target as HTMLElement | undefined;
      if (target?.closest('a')) {
        return;
      }
      this.$emit('toggle-session', event?.data);
    }
  },
  template: `
    <div class="session-listing">
      <DataTable
        :value="sessions"
        data-testid="session-table"
        scrollable
        scrollHeight="flex"
        size="small"
        :tableStyle="{ tableLayout: 'fixed', width: '100%' }"
        :rowClass="rowClass"
        @row-click="handleRowClick"
      >
        <Column
          field="fmtDate"
          header="Date"
          :style="{ width: '8.75rem' }"
          :headerClass="'no-wrap-cell session-listing__col-date'"
          :bodyClass="'no-wrap-cell session-listing__col-date'"
        >
          <template #body="slotProps">
            <a
              class="session-listing__link session-listing__link--date"
              :href="sessionHref(slotProps.data)"
              :title="'Session details'"
              @click.stop.prevent="toDetails(slotProps.data)"
            >
              {{ slotProps.data.fmtDate || '—' }}
            </a>
          </template>
        </Column>
        <Column
          field="drill_label"
          header="Drill"
          :style="{ width: '11rem' }"
          :headerClass="'no-wrap-cell session-listing__col-drill'"
          :bodyClass="'truncate-cell session-listing__col-drill'"
        >
          <template #body="slotProps">
            <span class="session-listing__cell" :title="slotProps.data.drill_label || '—'">
              {{ slotProps.data.drill_label || '—' }}
            </span>
          </template>
        </Column>
        <Column
          field="duration_label"
          header="Duration"
          :style="{ width: '5.75rem' }"
          :headerClass="'no-wrap-cell session-listing__col-duration'"
          :bodyClass="'no-wrap-cell session-listing__col-duration'"
        >
          <template #body="slotProps">
            {{ slotProps.data.duration_label || '—' }}
          </template>
        </Column>
        <Column
          field="shot_count"
          header="Shots"
          :style="{ width: '5.5rem' }"
          :headerClass="'no-wrap-cell session-listing__col-shots'"
          :bodyClass="'no-wrap-cell align-right session-listing__col-shots'"
        >
          <template #body="slotProps">
            {{ slotProps.data.shot_count }}
          </template>
        </Column>
        <Column
          v-for="metric in metricDefinitions"
          :key="metric.key"
          :header="metric.label"
          :style="{ width: metric.columnWidth || '5.5rem' }"
          :headerClass="metricColumnClass(metric)"
          :bodyClass="metricColumnClass(metric)"
        >
          <template #body="slotProps">
            <span
              class="session-listing__cell session-listing__metric"
              :data-testid="'metric-' + metric.key"
              :title="metricTooltip(slotProps.data, metric)"
            >
              {{ metricValue(slotProps.data, metric) }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  `
});
