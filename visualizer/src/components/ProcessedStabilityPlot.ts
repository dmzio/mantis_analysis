import { defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import { ProcessedShot } from '../shotProcessor';

export default defineComponent({
  name: 'ProcessedStabilityPlot',
  components: { Chart },
  props: {
    shot: { type: Object as () => ProcessedShot, required: true }
  },
  setup(props) {
    const chartData = ref<any>(null);
    const chartOptions = ref<any>({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Time (s)' } },
        y: { title: { display: true, text: 'MOA' } }
      }
    });

    const build = () => {
      if (!props.shot.rel_pitch_moa || !props.shot.rel_yaw_moa) return;
      const sr = props.shot.sample_rate ?? 400;
      const start = props.shot.start_index ?? 0;
      const pitch = props.shot.rel_pitch_moa.slice(start);
      const yaw = props.shot.rel_yaw_moa.slice(start);
      const shotIdx = (props.shot.shot_index ?? pitch.length - 1) - start;
      const n = Math.min(pitch.length, yaw.length);
      const labels = Array.from({ length: n }, (_, i) => ((i - shotIdx) / sr).toFixed(2));
      chartData.value = {
        labels,
        datasets: [
          {
            label: 'Pitch',
            data: pitch,
            borderColor: getComputedStyle(document.body).getPropertyValue('--trace-hold') || '#3185fc',
            fill: false
          },
          {
            label: 'Yaw',
            data: yaw,
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
    <div class="processed-stability-plot">
      <Chart type="line" :data="chartData" :options="chartOptions" />
    </div>
  `
});
