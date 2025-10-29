import { defineComponent, computed } from 'vue';
import Chart from 'primevue/chart';
import store from '../store';
import { aggregateFields } from '../sessionAggregates';
import { formatDate } from '../dateFmt';

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
      const values: (number | null)[] = [];
      sorted.forEach((s: any) => {
        labels.push(s.fmtDate || (s.date ? formatDate(s.date) : ''));
        const processed = store.processed[s.pk]?.shots || [];
        const stats = aggregateFields(processed, [field])[field];
        let val: number | null = stats ? stats.mean : null;
        if (val !== null && transform) val = transform(val);
        values.push(val);
      });
      return {
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
      };
    }
    const charts = computed(() => [
      { label: '% in 10', data: buildData('percent_10', v => v * 100), yLabel: '%' },
      { label: 'L₁s (mm)', data: buildData('length_1s'), yLabel: 'mm' },
      { label: 'Δpull (mm)', data: buildData('delta_pull'), yLabel: 'mm' },
      { label: 'Score', data: buildData('score_numeric'), yLabel: 'Score' },
      { label: 'Split (s)', data: buildData('split_s'), yLabel: 'Seconds' }
    ]);
    const options = (y: string) => ({
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
          labels: {
            color: textColor
          }
        },
        tooltip: {
          displayColors: false
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
        <Chart type="line" :data="chart.data" :options="options(chart.yLabel)" />
      </div>
    </div>
  `
});
