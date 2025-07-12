import { defineComponent, ref, watch, computed } from 'vue';
import Chart from 'primevue/chart';
import ProgressSpinner from 'primevue/progressspinner';
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
      {
        label: 'stdev',
        data: lower,
        borderColor: 'transparent',
        backgroundColor: 'rgba(120,120,120,0.2)',
        fill: false,
        pointRadius: 0,
        borderWidth: 0
      },
      { data: upper, borderColor: 'transparent', backgroundColor: 'rgba(120,120,120,0.2)', fill: '-1', pointRadius: 0, borderWidth: 0 },
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
  components: { Chart, ProgressSpinner },
  props: { shots: { type: Array, required: true }, sessionPk: { type: Number, required: true } },
  setup(props) {
    const absDevData = ref<any>(null);
    const absSpeedData = ref<any>(null);
    const ringData = ref<any>(null);
    const stats = ref<Record<string, { mean: number; sd: number }>>({});
    const absDevPlugins = ref<any[]>([]);
    const absSpeedPlugins = ref<any[]>([]);
    const ringPlugins = ref<any[]>([]);
    let sampleRate = 400;
    let pullDiff = 0;

    const ringOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Time (s)' } },
        y: {
          title: { display: true, text: 'Ring' },
          reverse: true,
          min: 0,
          max: 10,
          ticks: { stepSize: 1 }
        }
      }
    };

    function makeMarker(diffSec: number) {
      return {
        id: 'session-shot-line',
        afterDraw(chart: any) {
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          const shotX = xScale.getPixelForValue(0);
          const pullX = xScale.getPixelForValue(diffSec);
          const ctx = chart.ctx;
          ctx.save();
          ctx.strokeStyle = '#888';
          ctx.beginPath();
          ctx.moveTo(shotX, yScale.getPixelForValue(yScale.min));
          ctx.lineTo(shotX, yScale.getPixelForValue(yScale.max));
          ctx.stroke();
          ctx.fillStyle = 'rgba(200,200,200,0.1)';
          ctx.fillRect(pullX, yScale.getPixelForValue(yScale.max), shotX - pullX,
            yScale.getPixelForValue(yScale.min) - yScale.getPixelForValue(yScale.max));
          ctx.restore();
        }
      };
    }

    function build() {
      const shots = props.shots as any[];
      if (!shots.length) return;
      sampleRate = shots[0].sample_rate ?? 400;
      pullDiff = shots.reduce((s, sh) => s + ((sh.pull_index_calc ?? 0) - (sh.shot_index ?? 0)), 0) / shots.length;
      const diffSec = pullDiff / sampleRate;
      const marker = makeMarker(diffSec);
      absDevData.value = toChartData(aggregateSeries(shots, 'abs_deviation_moa'), 'Deviation', 'MOA');
      absSpeedData.value = toChartData(aggregateSeries(shots, 'abs_speed_mm_s'), 'Speed', 'mm/s');
      ringData.value = toChartData(aggregateSeries(shots, 'ring_position'), 'Ring', '');
      absDevPlugins.value = [marker];
      absSpeedPlugins.value = [marker];
      ringPlugins.value = [marker];
      stats.value = store.aggregates[props.sessionPk]?.stats ||
        aggregateFields(shots, ['length_1s', 'delta_pull', 'percent_10']);
      if (!store.aggregates[props.sessionPk]) {
        store.aggregates[props.sessionPk] = { stats: stats.value };
      }
    }

    watch(() => props.shots, build, { deep: true, immediate: true });

    const absDevOptions = options('MOA');
    const absSpeedOptions = options('mm/s');

    const loading = computed(() => !absDevData.value);

    return {
      absDevData,
      absSpeedData,
      ringData,
      stats,
      absDevOptions,
      absSpeedOptions,
      ringOptions,
      loading,
      absDevPlugins,
      absSpeedPlugins,
      ringPlugins
    };
  },
  template: `
    <div v-if="loading" class="card flex justify-content-center p-4">
      <ProgressSpinner />
    </div>
    <div v-else class="shot-layout">
      <div class="plot-row">
        <div class="card"><h4>Absolute deviation</h4><Chart type="line" :data="absDevData" :options="absDevOptions" :plugins="absDevPlugins" /></div>
        <div class="card"><h4>Absolute speed</h4><Chart type="line" :data="absSpeedData" :options="absSpeedOptions" :plugins="absSpeedPlugins" /></div>
      </div>
      <div class="plot-row">
        <div class="card"><h4>Ring stability</h4><Chart type="line" :data="ringData" :options="ringOptions" :plugins="ringPlugins" /></div>
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
