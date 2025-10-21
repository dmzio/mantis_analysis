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
    const timelineData = ref<any>(null);
    const scoreData = ref<any>(null);
    const splitData = ref<any>(null);
    const stats = ref<Record<string, { mean: number; sd: number }>>({});
    const labelMap: Record<string, string> = {
      length_1s: 'L₁s (mm)',
      delta_pull: 'Δpull (mm)',
      percent_10: '∈10 (%)',
      hold_duration_s: 'Hold (s)',
      split_s: 'Split (s)',
      score_numeric: 'Score',
      ellipse_area_mm2: 'Hold area (mm²)',
      ellipse_major_mm: 'Ellipse major (mm)',
      ellipse_minor_mm: 'Ellipse minor (mm)'
    };
    const valueTransforms: Record<string, (value: number) => number> = {
      percent_10: v => v * 100
    };
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
      const summary = aggregateFields(shots, [
        'length_1s',
        'delta_pull',
        'percent_10',
        'hold_duration_s',
        'split_s',
        'score_numeric',
        'ellipse_area_mm2',
        'ellipse_major_mm',
        'ellipse_minor_mm'
      ]);
      store.aggregates[props.sessionPk] = { stats: summary };
      stats.value = summary;
      const hold = summary.hold_duration_s?.mean ?? 0;
      const avgDeviceDuration = (key: 'trigger_hold_s' | 'trigger_pull_s') => {
        const vals = shots
          .map(sh => (typeof sh[key] === 'number' ? sh[key] : null))
          .filter((v): v is number => v != null && Number.isFinite(v));
        if (!vals.length) return 0;
        return vals.reduce((sum, v) => sum + v, 0) / vals.length;
      };
      const holdRecorded = avgDeviceDuration('trigger_hold_s');
      const triggerRecorded = avgDeviceDuration('trigger_pull_s');
      const phases = [
        { label: 'Hold (computed)', value: hold, color: '#4dabf7' },
        { label: 'Trigger hold (device)', value: holdRecorded, color: '#f59f00' },
        { label: 'Trigger pull (device)', value: triggerRecorded, color: '#82c91e' }
      ].filter(phase => phase.value > 0);
      if (phases.length) {
        timelineData.value = {
          labels: phases.map(p => p.label),
          datasets: [
            {
              label: 'Duration',
              data: phases.map(p => p.value),
              backgroundColor: phases.map(p => p.color)
            }
          ]
        };
      } else {
        timelineData.value = null;
      }
      const scoreValues = shots
        .map((s, idx) => ({ idx: idx + 1, val: s.score_numeric ?? parseFloat(s.score ?? '') }))
        .map(item => ({ ...item, val: typeof item.val === 'number' && Number.isFinite(item.val) ? item.val : null }));
      if (scoreValues.some(v => v.val !== null)) {
        scoreData.value = {
          labels: scoreValues.map(v => `#${v.idx}`),
          datasets: [
            {
              label: 'Score',
              data: scoreValues.map(v => v.val),
              borderColor: '#f783ac',
              backgroundColor: 'rgba(247,131,172,0.3)',
              tension: 0.3,
              fill: false
            }
          ]
        };
      } else {
        scoreData.value = null;
      }
      const splitValues = shots
        .map((s, idx) => ({ idx: idx + 1, val: s.split_s ?? null }))
        .map(item => ({ ...item, val: typeof item.val === 'number' && Number.isFinite(item.val) ? item.val : null }));
      if (splitValues.some(v => v.val !== null)) {
        splitData.value = {
          labels: splitValues.map(v => `#${v.idx}`),
          datasets: [
            {
              label: 'Split (s)',
              data: splitValues.map(v => v.val),
              borderColor: '#12b886',
              backgroundColor: 'rgba(18,184,134,0.3)',
              tension: 0.3,
              fill: false
            }
          ]
        };
      } else {
        splitData.value = null;
      }
    }

    watch(() => props.shots, build, { deep: true, immediate: true });

    const absDevOptions = options('MOA');
    const absSpeedOptions = options('mm/s');
    const timelineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: true, title: { display: true, text: 'Seconds' } },
        y: { stacked: true }
      }
    };
    const scoreOptions = options('Score');
    const splitOptions = options('Seconds');

    const loading = computed(() => !absDevData.value);

    const summaryRows = computed(() => {
      return Object.entries(stats.value).map(([key, value]) => ({
        key: labelMap[key] ?? key,
        value: {
          mean: valueTransforms[key] ? valueTransforms[key](value.mean) : value.mean,
          sd: valueTransforms[key] ? valueTransforms[key](value.sd) : value.sd
        }
      }));
    });

    return {
      absDevData,
      absSpeedData,
      ringData,
      timelineData,
      scoreData,
      splitData,
      stats,
      absDevOptions,
      absSpeedOptions,
      ringOptions,
      timelineOptions,
      scoreOptions,
      splitOptions,
      loading,
      absDevPlugins,
      absSpeedPlugins,
      ringPlugins,
      summaryRows
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
        <div class="card" v-if="timelineData">
          <h4>Shot timeline</h4>
          <Chart type="bar" :data="timelineData" :options="timelineOptions" />
        </div>
      </div>
      <div class="plot-row" v-if="scoreData || splitData">
        <div class="card" v-if="scoreData"><h4>Score progression</h4><Chart type="line" :data="scoreData" :options="scoreOptions" /></div>
        <div class="card" v-if="splitData"><h4>Shot cadence</h4><Chart type="line" :data="splitData" :options="splitOptions" /></div>
      </div>
      <div class="plot-row">
        <div class="card">
          <h3>Shot Summary</h3>
          <table class="stats-table">
            <tr v-for="row in summaryRows" :key="row.key">
              <td>{{ row.key }}</td>
              <td>{{ row.value.mean.toFixed(2) }}</td>
              <td>± {{ row.value.sd.toFixed(2) }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `
});
