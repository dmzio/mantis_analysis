import { defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import { ProcessedShot } from '../shotProcessor';

export default defineComponent({
  name: 'ProcessedStabilityPlot',
  components: { Chart },
  props: {
    shot: { type: Object as () => ProcessedShot, required: true },
    trimPreShot: { type: Boolean, default: false }
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
    const chartPlugins = ref<any[]>([]);

    const build = () => {
      if (!props.shot.rel_pitch_moa || !props.shot.rel_yaw_moa) return;
      const sr = props.shot.sample_rate ?? 400;
      const start = props.trimPreShot
        ? props.shot.pre_shot_1s_index ?? props.shot.start_index ?? 0
        : props.shot.start_index ?? 0;
      const end = undefined;
      const pitch = props.shot.rel_pitch_moa.slice(start, end);
      const yaw = props.shot.rel_yaw_moa.slice(start, end);
      const shotIdx = (props.shot.shot_index ?? pitch.length - 1) - start;
      const n = Math.min(pitch.length, yaw.length);
      const labels = Array.from({ length: n }, (_, i) => ((i - shotIdx) / sr).toFixed(2));
      const minY = Math.min(...pitch, ...yaw);
      const maxY = Math.max(...pitch, ...yaw);
      const vertLine = {
        id: 'zero-line',
        afterDraw(chart: any) {
          const x = chart.scales.x.getPixelForValue(shotIdx);
          const ctx = chart.ctx;
          ctx.save();
          ctx.strokeStyle = '#888';
          ctx.beginPath();
          ctx.moveTo(x, chart.scales.y.getPixelForValue(minY));
          ctx.lineTo(x, chart.scales.y.getPixelForValue(maxY));
          ctx.stroke();
          ctx.restore();
        }
      };
      chartPlugins.value = [vertLine];
      chartData.value = {
        labels,
        datasets: [
          {
            label: 'Pitch',
            data: pitch,
            borderColor: getComputedStyle(document.body).getPropertyValue('--trace-hold') || '#3185fc',
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Yaw',
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
    <div class="processed-stability-plot">
      <Chart type="line" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
    </div>
  `
});
