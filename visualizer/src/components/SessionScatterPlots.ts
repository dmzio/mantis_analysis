import { defineComponent, computed } from 'vue';
import Chart from 'primevue/chart';
import { formatDate, formatDateShort } from '../dateFmt';
import { MeanPullVectorStats, SESSION_METRICS, SessionMetricDefinition } from '../sessionMetrics';
import { perfNow, recordPerf } from '../perfMetrics';

interface VectorItem extends MeanPullVectorStats {
  pk: number;
  value: number;
  dataIndex: number;
}

interface ChartBuildResult {
  key: string;
  label: string;
  data: any;
  options: any;
  plugins: any[];
  vectorItems: VectorItem[];
  yLabel: string;
  fullLabels: string[];
  means: (number | null)[];
  sds: (number | null)[];
  medians: (number | null)[];
  q1s: (number | null)[];
  q3s: (number | null)[];
  metric: SessionMetricDefinition;
}

interface ChartBase {
  sorted: any[];
  labels: string[];
  fullLabels: string[];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function finiteVector(session: any): MeanPullVectorStats | null {
  const vector = session?.meanPullVector;
  if (!vector) return null;
  const xMm = finiteNumber(vector.xMm);
  const yMm = finiteNumber(vector.yMm);
  const magnitudeMm = finiteNumber(vector.magnitudeMm) ?? (xMm !== null && yMm !== null ? Math.hypot(xMm, yMm) : null);
  const shotCount = finiteNumber(vector.shotCount);
  if (xMm === null || yMm === null || magnitudeMm === null || shotCount === null || shotCount <= 0) return null;
  return {
    xMm,
    yMm,
    magnitudeMm,
    angleDeg: finiteNumber(vector.angleDeg),
    shotCount
  };
}

function paddedRange(metric: SessionMetricDefinition, values: (number | null)[]) {
  const finiteValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!finiteValues.length) {
    return {
      min: metric.min ?? undefined,
      max: metric.max ?? undefined
    };
  }
  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const spread = rawMax - rawMin;
  const pad = spread > 0 ? spread * 0.18 : Math.max(1, Math.abs(rawMax) * 0.1);
  const min = metric.min == null ? rawMin - pad : Math.max(metric.min, rawMin - pad);
  const max = metric.max == null ? rawMax + pad : Math.min(metric.max, rawMax + pad);
  return {
    min,
    max: max <= min ? min + Math.max(1, pad) : max
  };
}

function buildVectorOverlayPlugin(items: VectorItem[]) {
  return {
    id: 'delta-pull-vector-overlay',
    afterDatasetsDraw(chart: any) {
      if (!items.length) return;
      const meta = chart.getDatasetMeta(2);
      const points = meta?.data || [];
      const area = chart.chartArea;
      if (!points.length || !area) return;
      const ctx = chart.ctx;
      const maxMagnitude = Math.max(...items.map(item => item.magnitudeMm), 1);
      const maxArrowPx = Math.max(16, Math.min(44, ((area.right - area.left) / Math.max(points.length, 4)) * 0.58));
      const pxPerMm = maxArrowPx / maxMagnitude;
      const activeIndex = chart.tooltip?.dataPoints?.[0]?.dataIndex;
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
      ctx.clip();
      items.forEach(item => {
        const point = points[item.dataIndex];
        if (!point || point.skip) return;
        const startX = point.x;
        const startY = point.y;
        const endX = startX + item.xMm * pxPerMm;
        const endY = startY - item.yMm * pxPerMm;
        const active = item.dataIndex === activeIndex;
        ctx.globalAlpha = active ? 0.95 : 0.34;
        ctx.strokeStyle = '#f9dc5c';
        ctx.fillStyle = '#f9dc5c';
        ctx.lineWidth = active ? 2.2 : 1.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        const angle = Math.atan2(endY - startY, endX - startX);
        const head = active ? 7 : 5;
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

/**
 * Render scatter plots for core session metrics. Means are plotted as points joined
 * by a line while one standard deviation above/below the mean is rendered as a band.
 */
export default defineComponent({
  name: 'SessionScatterPlots',
  components: { Chart },
  props: {
    sessions: { type: Array, required: true }
  },
  setup(props) {
    const styles = typeof window !== 'undefined' ? getComputedStyle(document.body) : null;
    const textColor = styles?.getPropertyValue('--text-color').trim() || '#e9ecef';
    const gridColor = styles?.getPropertyValue('--surface-800').trim() || 'rgba(73, 80, 87, 0.35)';

    function buildBase(): ChartBase {
      const sorted = props.sessions.slice().sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });
      const labels: string[] = [];
      const fullLabels: string[] = [];
      sorted.forEach((session: any) => {
        const longLabel = session.fmtDate || (session.date ? formatDate(session.date) : '');
        const shortLabel = session.date ? formatDateShort(session.date) : longLabel;
        labels.push(shortLabel);
        fullLabels.push(longLabel);
      });
      return { sorted, labels, fullLabels };
    }

    function buildOptions(chartDef: ChartBuildResult, rangeValues: (number | null)[]) {
      const range = paddedRange(chartDef.metric, rangeValues);
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            ticks: {
              color: textColor
            },
            title: {
              display: true,
              text: 'Date',
              color: textColor
            },
            grid: {
              color: gridColor
            }
          },
          y: {
            ticks: {
              color: textColor
            },
            title: {
              display: true,
              text: chartDef.yLabel,
              color: textColor
            },
            grid: {
              color: gridColor
            },
            min: range.min,
            max: range.max
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items: any[]) => {
                if (!items || !items.length) return '';
                const idx = items[0].dataIndex;
                return chartDef.fullLabels[idx] || items[0].label;
              },
              label: (context: any) => {
                const idx = context.dataIndex;
                const mean = chartDef.means[idx];
                const sd = chartDef.sds[idx];
                const median = chartDef.medians[idx];
                const q1 = chartDef.q1s[idx];
                const q3 = chartDef.q3s[idx];
                if (median == null && mean == null) {
                  return `${chartDef.metric.label}: —`;
                }
                const value = median ?? mean;
                const valueStr = value.toFixed(chartDef.metric.decimals);
                if (q1 != null && q3 != null) {
                  return `${chartDef.metric.label}: median ${valueStr} (IQR ${q1.toFixed(chartDef.metric.decimals)}-${q3.toFixed(chartDef.metric.decimals)})`;
                }
                if (mean != null && sd != null) {
                  const meanStr = mean.toFixed(chartDef.metric.decimals);
                  const sdStr = sd.toFixed(chartDef.metric.decimals);
                  return `${chartDef.metric.label}: mean ${meanStr} ± ${sdStr}`;
                }
                return `${chartDef.metric.label}: ${valueStr}`;
              },
              afterLabel: (context: any) => {
                if (chartDef.key !== 'deltaPull') return [];
                const item = chartDef.vectorItems.find(vector => vector.dataIndex === context.dataIndex);
                if (!item) return [];
                const labels = [
                  `Mean pull vector: ${item.magnitudeMm.toFixed(1)} mm`,
                  `X/Y: ${item.xMm.toFixed(1)} / ${item.yMm.toFixed(1)} mm`
                ];
                if (item.angleDeg !== null) {
                  labels.push(`Angle: ${Math.round(item.angleDeg)}°`);
                }
                labels.push(`Vector shots: ${item.shotCount}`);
                return labels;
              }
            }
          }
        }
      };
    }

    function buildData(metric: SessionMetricDefinition, base: ChartBase): ChartBuildResult {
      const meanValues: (number | null)[] = [];
      const sdValues: (number | null)[] = [];
      const medianValues: (number | null)[] = [];
      const q1Values: (number | null)[] = [];
      const q3Values: (number | null)[] = [];
      base.sorted.forEach((session: any) => {
        const stats = session.metrics?.[metric.key];
        meanValues.push(stats?.mean ?? null);
        sdValues.push(stats?.sd ?? null);
        medianValues.push(stats?.median ?? stats?.mean ?? null);
        q1Values.push(stats?.q1 ?? null);
        q3Values.push(stats?.q3 ?? null);
      });

      const upper = medianValues.map((median, index) => {
        if (median == null) return null;
        const q3 = q3Values[index];
        const mean = meanValues[index];
        const sd = sdValues[index];
        const candidate = q3 ?? (mean != null && sd != null ? mean + sd : median);
        if (metric.max != null) {
          return Math.min(candidate, metric.max);
        }
        return candidate;
      });
      const lower = medianValues.map((median, index) => {
        if (median == null) return null;
        const q1 = q1Values[index];
        const mean = meanValues[index];
        const sd = sdValues[index];
        const candidate = q1 ?? (mean != null && sd != null ? mean - sd : median);
        const minBound = metric.min ?? -Infinity;
        return Math.max(candidate, minBound);
      });

      const bandColor = 'rgba(55, 178, 77, 0.18)';
      const vectorItems = metric.key === 'deltaPull'
        ? base.sorted.map((session: any, index) => {
            const vector = finiteVector(session);
            const value = medianValues[index];
            if (!vector || value === null) return null;
            return {
              ...vector,
              pk: session.pk,
              value,
              dataIndex: index
            };
          }).filter((item): item is VectorItem => item !== null)
        : [];

      const chartDef: ChartBuildResult = {
        key: metric.key,
        label: metric.label,
        yLabel: metric.axisLabel,
        plugins: [],
        vectorItems,
        fullLabels: base.fullLabels,
        means: meanValues,
        sds: sdValues,
        medians: medianValues,
        q1s: q1Values,
        q3s: q3Values,
        metric,
        data: {
          labels: base.labels,
          datasets: [
            {
              label: `${metric.label} (upper)`,
              data: upper,
              borderColor: 'transparent',
              backgroundColor: bandColor,
              pointRadius: 0,
              borderWidth: 0,
              fill: false,
              spanGaps: true
            },
            {
              label: `${metric.label} (lower)`,
              data: lower,
              borderColor: 'transparent',
              backgroundColor: bandColor,
              pointRadius: 0,
              borderWidth: 0,
              fill: '-1',
              spanGaps: true
            },
            {
              label: metric.label,
              data: medianValues,
              showLine: true,
              borderColor: '#37b24d',
              backgroundColor: '#37b24d',
              pointRadius: 3,
              spanGaps: true,
              tension: 0.25
            }
          ]
        },
        options: null
      };
      chartDef.plugins = vectorItems.length ? [buildVectorOverlayPlugin(vectorItems)] : [];
      chartDef.options = buildOptions(chartDef, [...upper, ...lower, ...medianValues]);
      return chartDef;
    }

    const charts = computed<ChartBuildResult[]>(() => {
      const start = perfNow();
      try {
        const base = buildBase();
        return SESSION_METRICS.map(metric => buildData(metric, base));
      } finally {
        recordPerf('dashboard:charts', perfNow() - start, {
          sessions: props.sessions.length,
          charts: SESSION_METRICS.length
        });
      }
    });

    return { charts };
  },
  template: `
    <div class="session-scatter-plots">
      <div
        v-for="chart in charts"
        :key="chart.key"
        class="card session-scatter-plots__chart"
        :data-testid="'chart-' + chart.key"
      >
        <h4>{{ chart.label }}</h4>
        <Chart type="line" :data="chart.data" :options="chart.options" :plugins="chart.plugins" />
      </div>
    </div>
  `
});
