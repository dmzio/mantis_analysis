import { computed, defineComponent } from 'vue';
import Chart from 'primevue/chart';
import { formatDate, formatDateShort } from '../dateFmt';
import { MeanPullVectorStats } from '../sessionMetrics';

interface ArrowItem extends MeanPullVectorStats {
  pk: number;
  label: string;
  fullLabel: string;
  firearmLabel: string;
  drillLabel: string;
  originKey: string;
  scaleRatio: number;
}

const ARROW_VERTICAL_SCALE_RATIO = 0.92;

function finiteVector(session: any): MeanPullVectorStats | null {
  const vector = session?.meanPullVector;
  if (!vector) return null;
  const xMm = typeof vector.xMm === 'number' && Number.isFinite(vector.xMm) ? vector.xMm : null;
  const yMm = typeof vector.yMm === 'number' && Number.isFinite(vector.yMm) ? vector.yMm : null;
  const magnitudeMm = typeof vector.magnitudeMm === 'number' && Number.isFinite(vector.magnitudeMm)
    ? vector.magnitudeMm
    : xMm !== null && yMm !== null
      ? Math.hypot(xMm, yMm)
      : null;
  const shotCount = typeof vector.shotCount === 'number' && Number.isFinite(vector.shotCount) ? vector.shotCount : 0;
  if (xMm === null || yMm === null || magnitudeMm === null || shotCount <= 0) return null;
  return {
    xMm,
    yMm,
    magnitudeMm,
    angleDeg: typeof vector.angleDeg === 'number' && Number.isFinite(vector.angleDeg) ? vector.angleDeg : null,
    shotCount
  };
}

function sessionTime(session: any): number {
  return session?.date ? new Date(session.date).getTime() : 0;
}

function originKey(session: any): string {
  if (!session?.date) return `session-${session?.pk ?? 'unknown'}`;
  const time = sessionTime(session);
  if (!Number.isFinite(time)) return `session-${session?.pk ?? 'unknown'}`;
  return new Date(time).toISOString().slice(0, 10);
}

function buildArrowPlugin(items: ArrowItem[], color: string) {
  return {
    id: 'mean-pull-vector-arrows',
    verticalScaleRatio: ARROW_VERTICAL_SCALE_RATIO,
    drawEndpointDots: false,
    afterDatasetsDraw(chart: any) {
      if (!items.length) return;
      const meta = chart.getDatasetMeta(0);
      const points = meta?.data || [];
      if (!points.length) return;
      const pointByOrigin = new Map<string, any>();
      const labels = chart.data?.labels || [];
      labels.forEach((label: string, index: number) => {
        pointByOrigin.set(label, points[index]);
      });
      const ctx = chart.ctx;
      const { left, right, top, bottom } = chart.chartArea || {};
      const width = right - left;
      const height = bottom - top;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      const maxMagnitude = Math.max(...items.map(item => item.magnitudeMm), 1);
      const perItemWidth = width / Math.max(items.length, 1);
      const maxArrowPx = Math.max(18, Math.min(132, height * ARROW_VERTICAL_SCALE_RATIO * 0.5, perItemWidth * 0.78));
      const pxPerMm = maxArrowPx / maxMagnitude;
      const centerY = top + height / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(212, 218, 239, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, centerY);
      ctx.lineTo(right, centerY);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      items.forEach(item => {
        const point = pointByOrigin.get(item.label);
        if (!point) return;
        const startX = point.x;
        const startY = centerY;
        const endX = startX + item.xMm * pxPerMm;
        const endY = startY - item.yMm * pxPerMm;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        const angle = Math.atan2(endY - startY, endX - startX);
        const head = 7;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }
  };
}

/** Timeline chart that compares each selected session's mean pull vector at a shared linear scale. */
export default defineComponent({
  name: 'SessionMeanVectorTimeline',
  components: { Chart },
  props: {
    sessions: { type: Array, required: true }
  },
  setup(props) {
    const styles = typeof window !== 'undefined' ? getComputedStyle(document.body) : null;
    const textColor = styles?.getPropertyValue('--text-color').trim() || '#e9ecef';
    const gridColor = styles?.getPropertyValue('--surface-800').trim() || 'rgba(73, 80, 87, 0.35)';
    const pullColor = styles?.getPropertyValue('--trace-pull').trim() || '#f9dc5c';

    const sortedSessions = computed(() => (props.sessions as any[]).slice().sort((a, b) => sessionTime(a) - sessionTime(b)));

    const scaleReferenceMm = computed(() => {
      const values = sortedSessions.value
        .map(session => finiteVector(session)?.magnitudeMm ?? null)
        .filter((value): value is number => value !== null);
      return values.length ? Math.max(...values) : 0;
    });

    const arrowItems = computed<ArrowItem[]>(() => {
      const reference = scaleReferenceMm.value || 1;
      return sortedSessions.value
        .map(session => {
          const vector = finiteVector(session);
          if (!vector) return null;
          const fullLabel = session.fmtDate || (session.date ? formatDate(session.date) : `Session ${session.pk}`);
          const label = session.date ? formatDateShort(session.date) : fullLabel;
          return {
            ...vector,
            pk: session.pk,
            label,
            fullLabel,
            firearmLabel: session.firearm_label || '',
            drillLabel: session.drill_label || '',
            originKey: originKey(session),
            scaleRatio: vector.magnitudeMm / reference
          } as ArrowItem;
        })
        .filter((item): item is ArrowItem => item !== null);
    });

    const chart = computed(() => ({
      data: {
        labels: Array.from(new Map(arrowItems.value.map(item => [item.originKey, item.label])).values()),
        datasets: [
          {
            label: 'Mean pull vector',
            data: Array.from(new Map(arrowItems.value.map(item => [item.originKey, 0])).values()),
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            pointHoverRadius: 8,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            ticks: { color: textColor },
            grid: { color: gridColor },
            title: { display: true, text: 'Date', color: textColor }
          },
          y: {
            min: -1,
            max: 1,
            display: false,
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items: any[]) => {
                const item = arrowItems.value[items?.[0]?.dataIndex ?? -1];
                return item?.fullLabel || '';
              },
              label: (context: any) => {
                const item = arrowItems.value[context.dataIndex];
                if (!item) return '';
                const labels = [
                  `Mean pull: ${item.magnitudeMm.toFixed(1)} mm`,
                  `X/Y: ${item.xMm.toFixed(1)} / ${item.yMm.toFixed(1)} mm`,
                  `Shots: ${item.shotCount}`
                ];
                if (item.firearmLabel) labels.push(`Firearm: ${item.firearmLabel}`);
                if (item.drillLabel) labels.push(`Drill: ${item.drillLabel}`);
                return labels;
              }
            }
          }
        }
      },
      plugins: [buildArrowPlugin(arrowItems.value, pullColor)]
    }));

    return {
      arrowItems,
      chart,
      scaleReferenceMm
    };
  },
  template: `
    <section class="card session-mean-vector-timeline" data-testid="mean-pull-vector-timeline">
      <div class="session-mean-vector-timeline__header">
        <h4>Mean pull vectors</h4>
        <span v-if="arrowItems.length" class="session-mean-vector-timeline__scale">
          longest selected mean vector = {{ scaleReferenceMm.toFixed(1) }} mm
        </span>
      </div>
      <div v-if="arrowItems.length" class="session-mean-vector-timeline__chart">
        <Chart type="line" :data="chart.data" :options="chart.options" :plugins="chart.plugins" />
      </div>
      <div v-else class="session-mean-vector-timeline__empty">
        No mean pull vectors for the selected sessions.
      </div>
    </section>
  `
});
