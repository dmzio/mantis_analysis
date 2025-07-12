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
    function buildData(field: string, transform?: (v: number) => number) {
      const labels: string[] = [];
      const values: (number | null)[] = [];
      props.sessions.forEach((s: any) => {
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
      { label: 'Δpull (mm)', data: buildData('delta_pull'), yLabel: 'mm' }
    ]);
    const options = (y: string) => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'category', title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: y } }
      }
    });
    return { charts, options };
  },
  template: `
    <div class="session-scatter-plots">
      <div v-for="chart in charts" :key="chart.label" class="card">
        <h4>{{ chart.label }}</h4>
        <Chart type="line" :data="chart.data" :options="options(chart.yLabel)" />
      </div>
    </div>
  `
});
