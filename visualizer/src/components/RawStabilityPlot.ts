import { defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import { ShotData } from '../traceUtils';

export default defineComponent({
  name: 'RawStabilityPlot',
  components: { Chart },
  props: {
    shot: { type: Object as () => ShotData, required: true }
  },
  setup(props) {
    const chartData = ref<any>(null);
    const chartOptions = ref<any>({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Time (s)' } },
        y: { title: { display: true, text: 'Degrees' } }
      }
    });

    const build = () => {
      if (!props.shot.pitch || !props.shot.yaw) return;
      const sr = props.shot.sample_rate ?? 400;
      const shotIdx = props.shot.shot_index ?? props.shot.pitch.length - 1;
      const n = Math.min(props.shot.pitch.length, props.shot.yaw.length);
      const labels = Array.from({ length: n }, (_, i) => ((i - shotIdx) / sr).toFixed(2));
      chartData.value = {
        labels,
        datasets: [
          {
            label: 'Pitch',
            data: props.shot.pitch.slice(0, n),
            borderColor: getComputedStyle(document.body).getPropertyValue('--trace-hold') || '#3185fc',
            fill: false
          },
          {
            label: 'Yaw',
            data: props.shot.yaw.slice(0, n),
            borderColor: getComputedStyle(document.body).getPropertyValue('--trace-trigger') || '#ff334b',
            fill: false
          }
        ]
      };
    };

    watch(() => props.shot, build, { deep: true, immediate: true });
    return { chartData, chartOptions };
  },
  template: `
    <div class="raw-stability-plot">
      <Chart type="line" :data="chartData" :options="chartOptions" />
    </div>
  `
});
