import { computed, defineComponent } from 'vue';
import Chart from 'primevue/chart';

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

function medianVector(points: VectorPoint[]): VectorPoint | null {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a.magnitude - b.magnitude);
  return sorted[Math.floor(sorted.length / 2)];
}

function chartLimit(points: VectorPoint[], median: VectorPoint | null): number {
  const max = Math.max(
    10,
    ...points.map(point => Math.max(Math.abs(point.x), Math.abs(point.y))),
    median ? Math.max(Math.abs(median.x), Math.abs(median.y)) : 0
  );
  return Math.ceil(max * 1.2);
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
  const median = medianVector(points);
  const limit = chartLimit(points, median);
  const pairData = points.flatMap(point => [
    { x: 0, y: 0, shotIndex: point.shotIndex, shotPk: point.shotPk, score: point.score, magnitude: 0, angleDeg: null },
    point
  ]);
  const medianData = median ? [{ x: 0, y: 0 }, { x: median.x, y: median.y }] : [];
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
          label: 'Median vector',
          data: medianData,
          borderColor: '#37b24d',
          backgroundColor: '#37b24d',
          pointRadius: 4,
          pointHoverRadius: 5,
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
        legend: { display: false },
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
