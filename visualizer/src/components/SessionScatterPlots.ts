import { defineComponent, computed } from 'vue';
import Chart from 'primevue/chart';
import store from '../store';
import { aggregateFields } from '../sessionAggregates';
import { formatDate, formatDateShort } from '../dateFmt';

/**
 * Render scatter plots for basic session metrics including
 * percentage of shots in the 10 ring, one second trace length
 * and pull distance.
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

    function buildData(field: string, transform?: (v: number) => number) {
      // sort sessions chronologically so x-axis shows oldest to newest
      const sorted = props.sessions.slice().sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });
      const labels: string[] = [];
      const fullLabels: string[] = [];
      const values: (number | null)[] = [];
      sorted.forEach((s: any) => {
        const longLabel = s.fmtDate || (s.date ? formatDate(s.date) : '');
        const shortLabel = s.date ? formatDateShort(s.date) : longLabel;
        labels.push(shortLabel);
        fullLabels.push(longLabel);
        const processed = store.processed[s.pk]?.shots || [];
        const stats = aggregateFields(processed, [field])[field];
        let val: number | null = stats ? stats.mean : null;
        if (val !== null && transform) val = transform(val);
        values.push(val);
      });
      return {
        chartData: {
          labels,
          datasets: [
            {
              label: field,
              data: values,
              showLine: false,
              borderColor: '#37b24d',
              backgroundColor: '#37b24d',
              pointRadius: 3
            }
          ]
        },
        fullLabels
      };
    }
    const charts = computed(() => {
      const configs: Array<{
        label: string;
        field: string;
        yLabel: string;
        transform?: (v: number) => number;
      }> = [
        { label: '% in 10', field: 'percent_10', transform: (v: number) => v * 100, yLabel: '%' },
        { label: 'L₁s (mm)', field: 'length_1s', yLabel: 'mm' },
        { label: 'Δpull (mm)', field: 'delta_pull', yLabel: 'mm' },
        { label: 'Score', field: 'score_numeric', yLabel: 'Score' },
        { label: 'Split (s)', field: 'split_s', yLabel: 'Seconds' }
      ];
      return configs.map(cfg => {
        const { chartData, fullLabels } = buildData(cfg.field, cfg.transform);
        return {
          label: cfg.label,
          data: chartData,
          yLabel: cfg.yLabel,
          fullLabels
        };
      });
    });
    const options = (y: string, fullLabels: string[]) => ({
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
            text: y,
            color: textColor
          },
          grid: {
            color: gridColor
          }
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
              return fullLabels[idx] || items[0].label;
            }
          }
        }
      }
    });
    return { charts, options };
  },
  template: `
    <div class="session-scatter-plots">
      <div
        v-for="chart in charts"
        :key="chart.label"
        class="card session-scatter-plots__chart"
      >
        <h4>{{ chart.label }}</h4>
        <Chart type="line" :data="chart.data" :options="options(chart.yLabel, chart.fullLabels)" />
      </div>
    </div>
  `
});
