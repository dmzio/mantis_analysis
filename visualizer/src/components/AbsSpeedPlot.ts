import { defineComponent, ref, watch } from 'vue';
import Chart from 'primevue/chart';
import zoomPlugin from 'chartjs-plugin-zoom';
import { ProcessedShot, speedArraysMm, absSpeedArray } from '../shotProcessor';

export default defineComponent({
  name: 'AbsSpeedPlot',
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
      },
      plugins: {
        zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
      }
    });
    const chartPlugins = ref<any[]>([]);

    const build = () => {
      if (!props.shot.rel_pitch_moa || !props.shot.rel_yaw_moa) return;
      const sr = props.shot.sample_rate ?? 400;
      const start = props.shot.start_index ?? 0;
      const arr = (props.shot.abs_speed_mm_s ?? (() => {
        const sp = speedArraysMm(props.shot.rel_pitch_moa, props.shot.rel_yaw_moa, sr);
        return absSpeedArray(sp.pitch, sp.yaw);
      })()).slice(start);
      const shotIdx = (props.shot.shot_index ?? arr.length - 1) - start;
      const pullIdx = (props.shot.pull_index_calc ?? 0) - start;
      const labels = arr.map((_, i) => ((i - shotIdx) / sr).toFixed(2));
      const minY = Math.min(...arr);
      const maxY = Math.max(...arr);
      const vertLine = {
        id: 'shot-line',
        afterDraw(chart: any) {
          const x = chart.scales.x.getPixelForValue(shotIdx);
          const pullX = chart.scales.x.getPixelForValue(pullIdx);
          const ctx = chart.ctx;
          ctx.save();
          ctx.strokeStyle = '#888';
          ctx.beginPath();
          ctx.moveTo(x, chart.scales.y.getPixelForValue(minY));
          ctx.lineTo(x, chart.scales.y.getPixelForValue(maxY));
          ctx.stroke();
          ctx.fillStyle = 'rgba(200,200,200,0.1)';
          ctx.fillRect(pullX, chart.scales.y.getPixelForValue(maxY), x - pullX, chart.scales.y.getPixelForValue(minY) - chart.scales.y.getPixelForValue(maxY));
          ctx.restore();
        }
      };
      chartPlugins.value = [vertLine, zoomPlugin];
      chartData.value = {
        labels,
        datasets: [{ label: 'Speed', data: arr, borderColor: '#f59f00', fill: false, pointRadius: 0 }]
      };
    };

    watch(() => props.shot, build, { deep: true, immediate: true });
    return { chartData, chartOptions, chartPlugins };
  },
  template: `
    <div class="abs-speed-plot">
      <h4>Absolute speed</h4>
      <Chart type="line" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
    </div>
  `
});
