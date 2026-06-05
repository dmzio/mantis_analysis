import { defineComponent, nextTick } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Popover from 'primevue/popover';
import { useRouter } from 'vue-router';
import { SESSION_METRICS, SessionMetricDefinition, formatMetricValue } from '../sessionMetrics';
import { ensureSessionPhoto } from '../dataLoader';
import SessionPreviewCard from './SessionPreviewCard';

const TABLE_METRICS = SESSION_METRICS.filter(metric => metric.key !== 'postShotMax');

export default defineComponent({
  name: 'SessionListing',
  components: { DataTable, Column, Popover, SessionPreviewCard },
  props: {
    sessions: { type: Array, required: true },
    activeSessionPks: { type: Array, required: true },
    photos: { type: Object as () => Record<number, string>, default: () => ({}) }
  },
  emits: ['toggle-session'],
  setup() {
    const router = useRouter();
    return {
      router,
      metricDefinitions: SESSION_METRICS,
      tableMetricDefinitions: TABLE_METRICS
    };
  },
  data() {
    return {
      previewSession: null as Record<string, any> | null,
      previewHideTimer: null as ReturnType<typeof setTimeout> | null
    };
  },
  computed: {
    activeSessionSet(): Set<number> {
      const ids = (this.activeSessionPks as number[]) || [];
      return new Set(ids.filter(pk => typeof pk === 'number'));
    },
    previewPhoto(): string {
      const pk = this.previewSession?.pk;
      return pk ? (this.photos as Record<number, string>)[pk] || '' : '';
    }
  },
  methods: {
    toDetails(row: any) {
      this.router.push(`/session/${row.pk}`);
    },
    sessionHref(row: any) {
      return row?.pk ? this.router.resolve(`/session/${row.pk}`).href : '#';
    },
    metricValue(row: any, metric: SessionMetricDefinition) {
      const stat = row.metrics?.[metric.key];
      const formatted = formatMetricValue(stat?.median ?? stat?.mean ?? null, metric.decimals);
      return formatted ?? '—';
    },
    metricTooltip(row: any, metric: SessionMetricDefinition) {
      const stat = row.metrics?.[metric.key];
      if (!stat || (stat.median == null && stat.mean == null)) {
        return `${metric.label}: —`;
      }
      const medianStr = formatMetricValue(stat.median ?? stat.mean, metric.decimals);
      const q1Str = formatMetricValue(stat.q1 ?? null, metric.decimals);
      const q3Str = formatMetricValue(stat.q3 ?? null, metric.decimals);
      if (medianStr && q1Str && q3Str) {
        return `${metric.label}: median ${medianStr} (IQR ${q1Str}-${q3Str})`;
      }
      const meanStr = formatMetricValue(stat.mean ?? null, metric.decimals);
      const sdStr = formatMetricValue(stat.sd ?? null, metric.decimals);
      if (meanStr && sdStr) {
        return `${metric.label}: mean ${meanStr} ± ${sdStr}`;
      }
      if (medianStr) {
        return `${metric.label}: ${medianStr}`;
      }
      return `${metric.label}: —`;
    },
    metricColumnClass(metric: SessionMetricDefinition) {
      return `no-wrap-cell align-right session-listing__col-metric session-listing__col-${metric.key}`;
    },
    shouldShowPreview(event: Event) {
      if (typeof window === 'undefined') return true;
      if (window.innerWidth <= 768) return false;
      if (event.type === 'mouseenter' && window.matchMedia?.('(hover: none)').matches) return false;
      return true;
    },
    alignPreviewToRight(event: Event, containerOverride?: HTMLElement) {
      const target = event.currentTarget as HTMLElement | null;
      const popover = this.$refs.sessionPreviewPopover as any;
      const container = containerOverride || (popover?.container as HTMLElement | undefined);
      if (!target || !container) return;
      const targetRect = target.getBoundingClientRect();
      const popoverRect = container.getBoundingClientRect();
      const gap = 14;
      const margin = 10;
      const left = Math.min(
        targetRect.right + gap,
        Math.max(margin, window.innerWidth - popoverRect.width - margin)
      );
      const centeredTop = targetRect.top + targetRect.height / 2 - popoverRect.height / 2;
      const top = Math.min(
        Math.max(margin, centeredTop),
        Math.max(margin, window.innerHeight - popoverRect.height - margin)
      );
      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.removeAttribute('data-p-popover-flipped');
      container.classList.remove('p-popover-flipped');
    },
    async showPreview(row: any, event: Event) {
      if (!row?.pk) return;
      if (!this.shouldShowPreview(event)) return;
      if (this.previewHideTimer) {
        clearTimeout(this.previewHideTimer);
        this.previewHideTimer = null;
      }
      this.previewSession = row;
      (this.$refs.sessionPreviewPopover as any)?.show(event);
      await nextTick();
      this.alignPreviewToRight(event);
      await ensureSessionPhoto(row.pk);
      await nextTick();
      this.alignPreviewToRight(event);
    },
    schedulePreviewHide() {
      if (this.previewHideTimer) {
        clearTimeout(this.previewHideTimer);
      }
      this.previewHideTimer = setTimeout(() => {
        (this.$refs.sessionPreviewPopover as any)?.hide();
        this.previewSession = null;
        this.previewHideTimer = null;
      }, 80);
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
              aria-label="Session details"
              @mouseenter="showPreview(slotProps.data, $event)"
              @mouseleave="schedulePreviewHide"
              @focus="showPreview(slotProps.data, $event)"
              @blur="schedulePreviewHide"
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
            <span
              class="session-listing__cell session-listing__preview-trigger"
              tabindex="0"
              @mouseenter="showPreview(slotProps.data, $event)"
              @mouseleave="schedulePreviewHide"
              @focus="showPreview(slotProps.data, $event)"
              @blur="schedulePreviewHide"
            >
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
          v-for="metric in tableMetricDefinitions"
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
      <Popover ref="sessionPreviewPopover" class="session-preview-popover" :dismissable="false">
        <SessionPreviewCard
          v-if="previewSession"
          :session="previewSession"
          :photo="previewPhoto"
        />
      </Popover>
    </div>
  `
});
