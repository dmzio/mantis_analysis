import { defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import store from '../store';
import { aggregateSeries, aggregateFields, SeriesPoint } from '../sessionAggregates';

function toChartData(series: SeriesPoint[], label: string, unit: string) {
  const labels = series.map(p => p.x.toFixed(2));
  const lower = series.map(p => p.mean - p.sd);
  const upper = series.map(p => p.mean + p.sd);
  const mean = series.map(p => p.mean);
  return {
    labels,
    datasets: [
      { data: lower, borderColor: 'transparent', fill: false },
      { data: upper, borderColor: 'transparent', backgroundColor: 'rgba(120,120,120,0.2)', fill: '-1' },
      { label, data: mean, borderColor: '#37b24d', fill: false, pointRadius: 0 }
    ]
  };
}

function options(yLabel: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { title: { display: true, text: 'Time (s)' } }, y: { title: { display: true, text: yLabel } } }
  };
}

export default defineComponent({
  name: 'SessionAggregates',
  components: { Chart },
  props: { shots: { type: Array, required: true }, sessionPk: { type: Number, required: true } },
  setup(props) {
    const absDevData = ref<any>(null);
    const absSpeedData = ref<any>(null);
    const ringData = ref<any>(null);
    const stats = ref<Record<string, { mean: number; sd: number }>>({});

    const ringOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Time (s)' } },
        y: { title: { display: true, text: 'Ring' }, reverse: true, ticks: { stepSize: 1, min: 0, max: 10 } }
      }
    };

    function build() {
      const shots = props.shots as any[];
      absDevData.value = toChartData(aggregateSeries(shots, 'abs_deviation_moa'), 'Deviation', 'MOA');
      absSpeedData.value = toChartData(aggregateSeries(shots, 'abs_speed_mm_s'), 'Speed', 'mm/s');
      ringData.value = toChartData(aggregateSeries(shots, 'ring_position'), 'Ring', '');
      stats.value = aggregateFields(shots, ['length_1s', 'delta_pull', 'percent_10']);
      store.aggregates[props.sessionPk] = { stats: stats.value };
    }

    watch(() => props.shots, build, { deep: true, immediate: true });

    const absDevOptions = options('MOA');
    const absSpeedOptions = options('mm/s');

    return { absDevData, absSpeedData, ringData, stats, absDevOptions, absSpeedOptions, ringOptions };
  },
  template: `
    <div class="shot-layout">
      <div class="plot-row">
        <Chart type="line" :data="absDevData" :options="absDevOptions" />
        <Chart type="line" :data="absSpeedData" :options="absSpeedOptions" />
      </div>
      <div class="plot-row">
        <Chart type="line" :data="ringData" :options="ringOptions" />
        <div class="card">
          <h3>Shot Summary</h3>
          <table class="stats-table">
            <tr v-for="(val, key) in stats" :key="key">
              <td>{{ key }}</td>
              <td>{{ val.mean.toFixed(2) }}</td>
              <td>± {{ val.sd.toFixed(2) }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `
});
