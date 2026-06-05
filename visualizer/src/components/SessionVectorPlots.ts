import { computed, defineComponent } from 'vue';
import Chart from 'primevue/chart';
import { RING_RADII_MM } from '../shotProcessor';

interface VectorPoint {
  x: number;
  y: number;
  magnitude: number;
  angleDeg: number | null;
  shotIndex: number;
  shotPk?: number;
  score: number | null;
}

interface VectorChart {
  key: string;
  title: string;
  data: any;
  options: any;
  plugins: any[];
}

interface SummaryVector {
  x: number;
  y: number;
  magnitude: number;
  angleDeg: number | null;
  sdX: number;
  sdY: number;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function scoreNumber(shot: any): number | null {
  const numeric = finiteNumber(shot?.score_numeric);
  if (numeric !== null) return numeric;
  if (typeof shot?.score === 'string' && shot.score.trim()) {
    const parsed = Number(shot.score);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function vectorPoints(
  shots: any[],
  xField: string,
  yField: string,
  magnitudeField: string,
  angleField: string
): VectorPoint[] {
  return shots
    .map((shot, index) => {
      const x = finiteNumber(shot?.[xField]);
      const y = finiteNumber(shot?.[yField]);
      const magnitude = finiteNumber(shot?.[magnitudeField]);
      if (x === null || y === null || magnitude === null) return null;
      return {
        x,
        y,
        magnitude,
        angleDeg: finiteNumber(shot?.[angleField]),
        shotIndex: index + 1,
        shotPk: typeof shot?.pk === 'number' ? shot.pk : undefined,
        score: scoreNumber(shot)
      } as VectorPoint;
    })
    .filter((point): point is VectorPoint => point !== null);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function meanVector(points: VectorPoint[]): SummaryVector | null {
  if (!points.length) return null;
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const x = mean(xs);
  const y = mean(ys);
  const magnitude = Math.hypot(x, y);
  return {
    x,
    y,
    magnitude,
    angleDeg: magnitude > 0 ? (Math.atan2(y, x) * 180) / Math.PI : null,
    sdX: standardDeviation(xs, x),
    sdY: standardDeviation(ys, y)
  };
}

function chartLimit(points: VectorPoint[], summary: SummaryVector | null): number {
  const max = Math.max(
    10,
    ...points.map(point => Math.max(Math.abs(point.x), Math.abs(point.y))),
    summary ? Math.max(Math.abs(summary.x) + summary.sdX, Math.abs(summary.y) + summary.sdY) : 0
  );
  return Math.ceil(max * 1.2);
}

function equalAspectScalePlugin(baseLimit: number) {
  return {
    id: 'equal-aspect-scale',
    beforeLayout(chart: any) {
      const width = chart.width;
      const height = chart.height;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      const aspect = width / height;
      const xLimit = baseLimit * Math.max(1, aspect);
      const yLimit = baseLimit * Math.max(1, 1 / aspect);
      const key = `${xLimit.toFixed(3)}:${yLimit.toFixed(3)}`;
      if (chart.$equalAspectScaleKey === key) return;
      chart.$equalAspectScaleKey = key;
      chart.options.scales.x.min = -xLimit;
      chart.options.scales.x.max = xLimit;
      chart.options.scales.y.min = -yLimit;
      chart.options.scales.y.max = yLimit;
    }
  };
}

function targetRingsPlugin() {
  return {
    id: 'target-rings',
    targetRingRadiiMm: RING_RADII_MM,
    beforeDatasetsDraw(chart: any) {
      const xScale = chart.scales?.x;
      const yScale = chart.scales?.y;
      if (!xScale || !yScale) return;
      const ctx = chart.ctx;
      const { left, right, top, bottom } = chart.chartArea;
      const centerX = xScale.getPixelForValue(0);
      const centerY = yScale.getPixelForValue(0);
      if (centerX < left || centerX > right || centerY < top || centerY > bottom) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(150, 160, 200, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      RING_RADII_MM.forEach(radius => {
        if (radius > Math.abs(xScale.max || 0) || radius > Math.abs(yScale.max || 0)) return;
        const radiusPx = Math.abs(xScale.getPixelForValue(radius) - centerX);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(212, 218, 239, 0.35)';
      ctx.beginPath();
      ctx.moveTo(left, centerY);
      ctx.lineTo(right, centerY);
      ctx.moveTo(centerX, top);
      ctx.lineTo(centerX, bottom);
      ctx.stroke();
      ctx.restore();
    }
  };
}

function summarySpreadPlugin(datasetIndex: number, color: string) {
  return {
    id: `summary-spread-${datasetIndex}`,
    beforeDatasetsDraw(chart: any) {
      const xScale = chart.scales?.x;
      const yScale = chart.scales?.y;
      const summary = chart.data?.datasets?.[datasetIndex]?.data?.[1];
      if (!xScale || !yScale || !summary) return;
      if (!summary.sdX && !summary.sdY) return;
      const ctx = chart.ctx;
      const centerX = xScale.getPixelForValue(summary.x);
      const centerY = yScale.getPixelForValue(summary.y);
      const radiusX = Math.max(3, Math.abs(xScale.getPixelForValue(summary.x + summary.sdX) - centerX));
      const radiusY = Math.max(3, Math.abs(yScale.getPixelForValue(summary.y + summary.sdY) - centerY));
      ctx.save();
      ctx.fillStyle = color.replace('1)', '0.06)');
      ctx.strokeStyle = color.replace('1)', '0.5)');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };
}

function vectorDrawPlugin(datasetIndex: number, color: string, width: number) {
  return {
    id: `vector-draw-${datasetIndex}-${width}`,
    afterDatasetsDraw(chart: any) {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta?.data?.length) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.fillStyle = color;
      for (let i = 0; i < meta.data.length - 1; i += 2) {
        const start = meta.data[i];
        const end = meta.data[i + 1];
        if (!start || !end) continue;
        const sx = start.x;
        const sy = start.y;
        const ex = end.x;
        const ey = end.y;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        const angle = Math.atan2(ey - sy, ex - sx);
        const size = width > 1 ? 7 : 5;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - size * Math.cos(angle - Math.PI / 6), ey - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - size * Math.cos(angle + Math.PI / 6), ey - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };
}

function buildChart(key: string, title: string, points: VectorPoint[], color: string): VectorChart {
  const summary = meanVector(points);
  const limit = chartLimit(points, summary);
  const pairData = points.flatMap(point => [
    { x: 0, y: 0, shotIndex: point.shotIndex, shotPk: point.shotPk, score: point.score, magnitude: 0, angleDeg: null },
    point
  ]);
  const summaryData = summary ? [{ x: 0, y: 0 }, summary] : [];
  return {
    key,
    title,
    data: {
      datasets: [
        {
          label: title,
          data: pairData,
          borderColor: 'transparent',
          backgroundColor: color,
          pointRadius: (ctx: any) => (ctx.dataIndex % 2 === 0 ? 0 : 3),
          pointHoverRadius: (ctx: any) => (ctx.dataIndex % 2 === 0 ? 0 : 5),
          showLine: false
        },
        {
          label: 'Mean vector',
          data: summaryData,
          borderColor: '#37b24d',
          backgroundColor: '#37b24d',
          pointRadius: 4,
          pointHoverRadius: 5,
          showLine: false
        },
        {
          label: 'Mean endpoint ±1 SD',
          data: [],
          borderColor: 'rgba(55, 178, 77, 0.5)',
          backgroundColor: 'rgba(55, 178, 77, 0.06)',
          pointRadius: 0,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: -limit,
          max: limit,
          title: { display: true, text: 'Horizontal (mm)' }
        },
        y: {
          min: -limit,
          max: limit,
          title: { display: true, text: 'Vertical (mm)' }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#d4daef',
            boxWidth: 16,
            boxHeight: 8,
            filter: (item: any) => item.text === 'Mean vector' || item.text === 'Mean endpoint ±1 SD'
          }
        },
        tooltip: {
          filter: (item: any) => item.datasetIndex === 0 && item.dataIndex % 2 === 1,
          callbacks: {
            title: (items: any[]) => {
              const raw = items?.[0]?.raw;
              return raw?.shotIndex ? `Shot #${raw.shotIndex}` : '';
            },
            label: (context: any) => {
              const raw = context.raw || {};
              const lines = [
                `X: ${Number(raw.x).toFixed(1)} mm`,
                `Y: ${Number(raw.y).toFixed(1)} mm`,
                `Magnitude: ${Number(raw.magnitude).toFixed(1)} mm`
              ];
              if (typeof raw.angleDeg === 'number') {
                lines.push(`Angle: ${raw.angleDeg.toFixed(1)}°`);
              }
              if (typeof raw.score === 'number') {
                lines.push(`Score: ${raw.score.toFixed(2)}`);
              }
              return lines;
            }
          }
        }
      }
    },
    plugins: [
      equalAspectScalePlugin(limit),
      targetRingsPlugin(),
      summarySpreadPlugin(1, 'rgba(55, 178, 77, 1)'),
      vectorDrawPlugin(0, color.replace('1)', '0.35)'), 1),
      vectorDrawPlugin(1, '#37b24d', 2)
    ]
  };
}

export default defineComponent({
  name: 'SessionVectorPlots',
  components: { Chart },
  props: {
    shots: { type: Array, required: true }
  },
  setup(props) {
    const charts = computed<VectorChart[]>(() => {
      const shots = props.shots as any[];
      return [
        buildChart(
          'pull',
          'Pull displacement vectors',
          vectorPoints(shots, 'delta_pull_x_mm', 'delta_pull_y_mm', 'delta_pull', 'delta_pull_angle_deg'),
          'rgba(255, 212, 59, 1)'
        ),
        buildChart(
          'postShot',
          'Post-shot max excursion vectors',
          vectorPoints(
            shots,
            'post_shot_max_excursion_500ms_x_mm',
            'post_shot_max_excursion_500ms_y_mm',
            'post_shot_max_excursion_500ms_mm',
            'post_shot_max_excursion_500ms_angle_deg'
          ),
          'rgba(255, 135, 135, 1)'
        )
      ].filter(chart => chart.data.datasets[0].data.length > 0);
    });
    return { charts };
  },
  template: `
    <div v-if="charts.length" class="session-vector-plots">
      <div
        v-for="chart in charts"
        :key="chart.key"
        class="session-stats__panel session-vector-plots__chart"
        :data-testid="'vector-' + chart.key"
      >
        <h4>{{ chart.title }}</h4>
        <Chart type="scatter" :data="chart.data" :options="chart.options" :plugins="chart.plugins" />
      </div>
    </div>
  `
});
