import { defineComponent, computed } from 'vue';
import Chart from 'primevue/chart';
import { formatDate, formatDateShort } from '../dateFmt';
import { SESSION_METRICS, SessionMetricDefinition } from '../sessionMetrics';
import { perfNow, recordPerf } from '../perfMetrics';

interface ChartBuildResult {
  key: string;
  label: string;
  data: any;
  options: any;
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

    function buildOptions(chartDef: ChartBuildResult) {
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
            min: chartDef.metric.min ?? undefined,
            max: chartDef.metric.max ?? undefined
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

      const chartDef: ChartBuildResult = {
        key: metric.key,
        label: metric.label,
        yLabel: metric.axisLabel,
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
      chartDef.options = buildOptions(chartDef);
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
        <Chart type="line" :data="chart.data" :options="chart.options" />
      </div>
    </div>
  `
});
