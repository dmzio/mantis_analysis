import { defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import { ProcessedShot } from '../shotProcessor';

export default defineComponent({
  name: 'ProcessedSpeedPlot',
  components: { Chart },
  props: { shot: { type: Object as () => ProcessedShot, required: true } },
  setup(props) {
    const chartData = ref<any>(null);
    const chartOptions = ref<any>({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Time (s)' } },
        y: { title: { display: true, text: 'mm/s' } }
      }
    });
    const chartPlugins = ref<any[]>([]);

    const build = () => {
      if (!props.shot.speed_pitch_mm_s || !props.shot.speed_yaw_mm_s) return;
      const sr = props.shot.sample_rate ?? 400;
      const pitch = props.shot.speed_pitch_mm_s;
      const yaw = props.shot.speed_yaw_mm_s;
      const shotIdx = props.shot.shot_index ?? Math.min(pitch.length, yaw.length) - 1;
      const n = Math.min(pitch.length, yaw.length);
      const labels = Array.from({ length: n }, (_, i) => ((i - shotIdx) / sr).toFixed(2));
      chartPlugins.value = [];
      chartData.value = {
        labels,
        datasets: [
          {
            label: 'Vertical speed',
            data: pitch,
            borderColor: getComputedStyle(document.body).getPropertyValue('--trace-hold') || '#3185fc',
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Horizontal speed',
            data: yaw,
            borderColor: getComputedStyle(document.body).getPropertyValue('--trace-trigger') || '#ff334b',
            fill: false,
            pointRadius: 0
          }
        ]
      };
    };

    watch(() => props.shot, build, { deep: true, immediate: true });
    return { chartData, chartOptions, chartPlugins };
  },
  template: `
    <div class="processed-speed-plot">
      <Chart type="line" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
    </div>
  `
});
