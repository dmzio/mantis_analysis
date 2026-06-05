import { computed, defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import ProgressSpinner from 'primevue/progressspinner';
import store from '../store';
import {
  aggregateSeries,
  aggregateFields,
  SeriesPoint,
  buildScatterPoints,
  bucketMetricByElapsedTime
} from '../sessionAggregates';
import { computeSessionMetrics } from '../sessionMetrics';
import { getActiveDriftMode } from '../appSettings';

function toBandChartData(series: SeriesPoint[], label: string) {
  const labels = series.map(point => point.x.toFixed(2));
  const lower = series.map(point => point.mean - point.sd);
  const upper = series.map(point => point.mean + point.sd);
  const mean = series.map(point => point.mean);
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
      {
        data: upper,
        borderColor: 'transparent',
        backgroundColor: 'rgba(120,120,120,0.2)',
        fill: '-1',
        pointRadius: 0,
        borderWidth: 0
      },
      { label, data: mean, borderColor: '#37b24d', fill: false, pointRadius: 0 }
    ]
  };
}

function seriesOptions(yLabel: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Time (s)' } },
      y: { title: { display: true, text: yLabel } }
    }
  };
}

function scatterChartData(points: ReturnType<typeof buildScatterPoints>, label: string, color: string) {
  return {
    datasets: [
      {
        label,
        data: points.map(point => ({
          x: point.x,
          y: point.y,
          shotIndex: point.shotIndex,
          shotPk: point.shotPk,
          score: point.score,
          elapsedS: point.elapsedS
        })),
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: color,
        showLine: false
      }
    ]
  };
}

function scatterOptions(xLabel: string, yLabel: string, decimals = 2) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { type: 'linear', title: { display: true, text: xLabel } },
      y: { title: { display: true, text: yLabel } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => {
            const raw = items?.[0]?.raw;
            return raw?.shotIndex ? `Shot #${raw.shotIndex}` : '';
          },
          label: (context: any) => {
            const raw = context.raw || {};
            const lines = [
              `${xLabel}: ${Number(raw.x).toFixed(2)}`,
              `${yLabel}: ${Number(raw.y).toFixed(decimals)}`
            ];
            if (typeof raw.score === 'number') {
              lines.push(`Score: ${raw.score.toFixed(2)}`);
            }
            if (typeof raw.elapsedS === 'number') {
              lines.push(`Elapsed: ${(raw.elapsedS / 60).toFixed(2)} min`);
            }
            return lines;
          }
        }
      }
    }
  };
}

function bucketChartData(points: ReturnType<typeof bucketMetricByElapsedTime>, label: string) {
  return {
    labels: points.map(point => point.label),
    datasets: [
      {
        label: `${label} (Q3)`,
        data: points.map(point => point.q3),
        borderColor: 'transparent',
        backgroundColor: 'rgba(77, 171, 247, 0.2)',
        pointRadius: 0,
        borderWidth: 0,
        fill: false
      },
      {
        label: `${label} (Q1)`,
        data: points.map(point => point.q1),
        borderColor: 'transparent',
        backgroundColor: 'rgba(77, 171, 247, 0.2)',
        pointRadius: 0,
        borderWidth: 0,
        fill: '-1'
      },
      {
        label,
        data: points.map(point => point.median),
        borderColor: '#4dabf7',
        backgroundColor: '#4dabf7',
        tension: 0.25,
        pointRadius: 4
      }
    ]
  };
}

function bucketOptions(yLabel: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Elapsed session time' } },
      y: { title: { display: true, text: yLabel } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => items?.[0]?.label || '',
          label: (context: any) => {
            const bucket = context.chart?.$bucketMeta?.[context.dataIndex];
            if (!bucket) return '';
            return [
              `Shots: ${bucket.count}`,
              `Q1: ${bucket.q1.toFixed(1)}`,
              `Median: ${bucket.median.toFixed(1)}`,
              `Q3: ${bucket.q3.toFixed(1)}`
            ];
          }
        }
      }
    }
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
    const aimStabilityVsTimeData = ref<any>(null);
    const displacementVsTimeData = ref<any>(null);
    const postShotVsTimeData = ref<any>(null);
    const elapsedAimStabilityData = ref<any>(null);
    const elapsedAimStabilityMeta = ref<any[]>([]);
    const stats = ref<Record<string, { mean: number; sd: number }>>({});
    const labelMap: Record<string, string> = {
      length_1s: 'Aim path 1 s (mm)',
      delta_pull: 'Pre-shot displacement 250 ms (mm)',
      percent_10: '∈10 (%)',
      hold_duration_s: 'Hold (s)',
      split_s: 'Split (s)',
      score_numeric: 'Score',
      post_shot_stability_500ms_mm: 'Post-shot stability 500 ms (mm)',
      post_shot_max_excursion_500ms_mm: 'Post-shot max excursion 500 ms (mm)',
      ellipse_area_mm2: 'Hold area (mm²)',
      ellipse_major_mm: 'Ellipse major (mm)',
      ellipse_minor_mm: 'Ellipse minor (mm)'
    };
    const valueTransforms: Record<string, (value: number) => number> = {
      percent_10: value => value * 100
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
          ctx.fillRect(
            pullX,
            yScale.getPixelForValue(yScale.max),
            shotX - pullX,
            yScale.getPixelForValue(yScale.min) - yScale.getPixelForValue(yScale.max)
          );
          ctx.restore();
        }
      };
    }

    function build() {
      const shots = props.shots as any[];
      if (!shots.length) return;
      sampleRate = shots[0].sample_rate ?? 400;
      pullDiff = shots.reduce((sum, shot) => sum + ((shot.pull_index_calc ?? 0) - (shot.shot_index ?? 0)), 0) / shots.length;
      const diffSec = pullDiff / sampleRate;
      const marker = makeMarker(diffSec);
      absDevData.value = toBandChartData(aggregateSeries(shots, 'abs_deviation_moa'), 'Deviation');
      absSpeedData.value = toBandChartData(aggregateSeries(shots, 'abs_speed_mm_s'), 'Speed');
      ringData.value = toBandChartData(aggregateSeries(shots, 'ring_position'), 'Ring');
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
        'post_shot_stability_500ms_mm',
        'post_shot_max_excursion_500ms_mm',
        'ellipse_area_mm2',
        'ellipse_major_mm',
        'ellipse_minor_mm'
      ]);
      const metrics = computeSessionMetrics(shots);
      const mode = getActiveDriftMode();
      const currentAggregate = store.aggregates[props.sessionPk] || { stats: {}, metrics: {} };
      const statsByMode = currentAggregate.statsByMode || {};
      const metricsByMode = currentAggregate.metricsByMode || {};
      store.aggregates[props.sessionPk] = {
        stats: summary,
        metrics,
        statsByMode: { ...statsByMode, [mode]: summary },
        metricsByMode: { ...metricsByMode, [mode]: metrics }
      };
      stats.value = summary;

      const hold = summary.hold_duration_s?.mean ?? 0;
      const avgDeviceDuration = (key: 'trigger_hold_s' | 'trigger_pull_s') => {
        const vals = shots
          .map(shot => (typeof shot[key] === 'number' ? shot[key] : null))
          .filter((value): value is number => value != null && Number.isFinite(value));
        if (!vals.length) return 0;
        return vals.reduce((sum, value) => sum + value, 0) / vals.length;
      };
      const phases = [
        { label: 'Hold (computed)', value: hold, color: '#4dabf7' },
        { label: 'Trigger hold (device)', value: avgDeviceDuration('trigger_hold_s'), color: '#f59f00' },
        { label: 'Trigger pull (device)', value: avgDeviceDuration('trigger_pull_s'), color: '#82c91e' }
      ].filter(phase => phase.value > 0);
      timelineData.value = phases.length
        ? {
            labels: phases.map(phase => phase.label),
            datasets: [
              {
                label: 'Duration',
                data: phases.map(phase => phase.value),
                backgroundColor: phases.map(phase => phase.color)
              }
            ]
          }
        : null;

      const scoreValues = shots
        .map((shot, index) => ({ idx: index + 1, val: shot.score_numeric ?? parseFloat(shot.score ?? '') }))
        .map(item => ({ ...item, val: typeof item.val === 'number' && Number.isFinite(item.val) ? item.val : null }));
      scoreData.value = scoreValues.some(value => value.val !== null)
        ? {
            labels: scoreValues.map(value => `#${value.idx}`),
            datasets: [
              {
                label: 'Score',
                data: scoreValues.map(value => value.val),
                borderColor: '#f783ac',
                backgroundColor: 'rgba(247,131,172,0.3)',
                tension: 0.3,
                fill: false
              }
            ]
          }
        : null;

      const splitValues = shots
        .map((shot, index) => ({ idx: index + 1, val: shot.split_s ?? null }))
        .map(item => ({ ...item, val: typeof item.val === 'number' && Number.isFinite(item.val) ? item.val : null }));
      splitData.value = splitValues.some(value => value.val !== null)
        ? {
            labels: splitValues.map(value => `#${value.idx}`),
            datasets: [
              {
                label: 'Split (s)',
                data: splitValues.map(value => value.val),
                borderColor: '#12b886',
                backgroundColor: 'rgba(18,184,134,0.3)',
                tension: 0.3,
                fill: false
              }
            ]
          }
        : null;

      aimStabilityVsTimeData.value = scatterChartData(
        buildScatterPoints(shots, 'hold_duration_s', 'length_1s'),
        'Aim path 1 s',
        '#74c0fc'
      );
      displacementVsTimeData.value = scatterChartData(
        buildScatterPoints(shots, 'hold_duration_s', 'delta_pull'),
        'Pre-shot displacement 250 ms',
        '#ffd43b'
      );
      postShotVsTimeData.value = scatterChartData(
        buildScatterPoints(shots, 'hold_duration_s', 'post_shot_stability_500ms_mm'),
        'Post-shot stability 500 ms',
        '#ff8787'
      );

      const elapsedBuckets = bucketMetricByElapsedTime(shots, 'length_1s', 300);
      elapsedAimStabilityData.value = elapsedBuckets.length
        ? bucketChartData(elapsedBuckets, 'Aim path 1 s')
        : null;
      elapsedAimStabilityMeta.value = elapsedBuckets;
    }

    watch(() => props.shots, build, { deep: true, immediate: true });

    const absDevOptions = seriesOptions('MOA');
    const absSpeedOptions = seriesOptions('mm/s');
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
    const scoreOptions = seriesOptions('Score');
    const splitOptions = seriesOptions('Seconds');
    const aimStabilityVsTimeOptions = scatterOptions('Aiming time (s)', 'Aim path 1 s (mm)', 1);
    const displacementVsTimeOptions = scatterOptions('Aiming time (s)', 'Pre-shot displacement 250 ms (mm)', 1);
    const postShotVsTimeOptions = scatterOptions('Aiming time (s)', 'Post-shot stability 500 ms (mm)', 1);
    const elapsedAimStabilityOptions = computed(() => {
      const options = bucketOptions('Aim path 1 s (mm)');
      return {
        ...options,
        plugins: {
          ...options.plugins,
          tooltip: {
            ...options.plugins.tooltip
          }
        }
      };
    });

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

    const elapsedAimStabilityPlugins = computed(() => [
      {
        id: 'elapsed-bucket-meta',
        beforeInit(chart: any) {
          chart.$bucketMeta = elapsedAimStabilityMeta.value;
        },
        beforeUpdate(chart: any) {
          chart.$bucketMeta = elapsedAimStabilityMeta.value;
        }
      }
    ]);

    return {
      absDevData,
      absSpeedData,
      ringData,
      timelineData,
      scoreData,
      splitData,
      aimStabilityVsTimeData,
      displacementVsTimeData,
      postShotVsTimeData,
      elapsedAimStabilityData,
      absDevOptions,
      absSpeedOptions,
      ringOptions,
      timelineOptions,
      scoreOptions,
      splitOptions,
      aimStabilityVsTimeOptions,
      displacementVsTimeOptions,
      postShotVsTimeOptions,
      elapsedAimStabilityOptions,
      elapsedAimStabilityPlugins,
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
          <h4>Aiming stability vs aiming time</h4>
          <Chart type="scatter" :data="aimStabilityVsTimeData" :options="aimStabilityVsTimeOptions" />
        </div>
        <div class="card">
          <h4>Pre-shot displacement vs aiming time</h4>
          <Chart type="scatter" :data="displacementVsTimeData" :options="displacementVsTimeOptions" />
        </div>
      </div>
      <div class="plot-row">
        <div class="card">
          <h4>Post-shot stability vs aiming time</h4>
          <Chart type="scatter" :data="postShotVsTimeData" :options="postShotVsTimeOptions" />
        </div>
        <div class="card" v-if="elapsedAimStabilityData">
          <h4>Aiming stability over session time</h4>
          <Chart
            type="line"
            :data="elapsedAimStabilityData"
            :options="elapsedAimStabilityOptions"
            :plugins="elapsedAimStabilityPlugins"
          />
        </div>
      </div>
    </div>
  `
});
