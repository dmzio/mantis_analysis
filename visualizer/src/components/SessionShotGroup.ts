import { defineComponent, onMounted, onUnmounted, ref, watch, computed } from 'vue';
import * as d3 from 'd3';
import { RING_RADII_MM } from '../shotProcessor';

interface ProcessedPoint {
  impact_pitch_mm?: number;
  impact_yaw_mm?: number;
  ellipse_major_mm?: number | null;
  ellipse_minor_mm?: number | null;
  ellipse_angle_deg?: number | null;
}

export default defineComponent({
  name: 'SessionShotGroup',
  props: {
    shots: { type: Array as () => ProcessedPoint[], required: true }
  },
  setup(props) {
    const svgRef = ref<SVGSVGElement | null>(null);
    const width = 320;
    const height = 320;

    const points = computed(() => {
      return (props.shots || []).map(s => ({
        x: typeof s.impact_yaw_mm === 'number' ? s.impact_yaw_mm : null,
        y: typeof s.impact_pitch_mm === 'number' ? s.impact_pitch_mm : null
      })).filter(p => p.x !== null && p.y !== null) as { x: number; y: number }[];
    });

    const ellipseStats = computed(() => {
      const valid = (props.shots || []).filter(s =>
        typeof s.ellipse_major_mm === 'number' && typeof s.ellipse_minor_mm === 'number' &&
        s.ellipse_major_mm !== null && s.ellipse_minor_mm !== null
      );
      if (!valid.length) return null;
      const meanMajor = valid.reduce((s, v) => s + (v.ellipse_major_mm || 0), 0) / valid.length;
      const meanMinor = valid.reduce((s, v) => s + (v.ellipse_minor_mm || 0), 0) / valid.length;
      const avgAngle = (() => {
        const sum = valid.reduce((acc, v) => {
          const rad = ((v.ellipse_angle_deg ?? 0) * Math.PI) / 180;
          acc.x += Math.cos(rad);
          acc.y += Math.sin(rad);
          return acc;
        }, { x: 0, y: 0 });
        return Math.atan2(sum.y, sum.x);
      })();
      return {
        major: meanMajor,
        minor: meanMinor,
        angle: avgAngle
      };
    });

    const metrics = computed(() => {
      if (!points.value.length) {
        return { meanRadius: 0, extremeSpread: 0 };
      }
      const meanRadius = points.value.reduce((s, p) => s + Math.hypot(p.x, p.y), 0) / points.value.length;
      let extremeSpread = 0;
      for (let i = 0; i < points.value.length; i++) {
        for (let j = i + 1; j < points.value.length; j++) {
          const dist = Math.hypot(points.value[i].x - points.value[j].x, points.value[i].y - points.value[j].y);
          extremeSpread = Math.max(extremeSpread, dist);
        }
      }
      return { meanRadius, extremeSpread };
    });

    function render() {
      if (!svgRef.value) return;
      const svg = d3.select(svgRef.value);
      svg.selectAll('*').remove();
      svg.attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
      const root = svg.append('g');
      const ringMax = RING_RADII_MM[RING_RADII_MM.length - 1];
      const ellipse = ellipseStats.value;
      const ellipseExtent = ellipse ? Math.max(ellipse.major || 0, ellipse.minor || 0) : 0;
      const pointExtent = points.value.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);
      const maxRadius = Math.max(ringMax, ellipseExtent, pointExtent) + 5;
      const scale = d3.scaleLinear().domain([-maxRadius, maxRadius]).range([0, width]);
      const centerX = scale(0);
      const centerY = scale(0);
      root.selectAll('circle.ring').data(RING_RADII_MM).enter().append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', d => Math.abs(scale(d) - centerX))
        .attr('fill', 'none')
        .attr('stroke', 'var(--ring)')
        .attr('stroke-width', 1);
      root.append('line')
        .attr('x1', 0).attr('x2', width)
        .attr('y1', centerY).attr('y2', centerY)
        .attr('stroke', 'var(--cross)')
        .attr('stroke-width', 1);
      root.append('line')
        .attr('x1', centerX).attr('x2', centerX)
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', 'var(--cross)')
        .attr('stroke-width', 1);
      root.selectAll('circle.shot').data(points.value).enter().append('circle')
        .attr('cx', d => scale(d.x))
        .attr('cy', d => scale(-d.y))
        .attr('r', 4)
        .attr('fill', 'var(--trace-pull)')
        .attr('opacity', 0.85);
      if (ellipse) {
        root.append('ellipse')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('rx', Math.abs(scale(ellipse.major) - centerX))
          .attr('ry', Math.abs(scale(ellipse.minor) - centerX))
          .attr('fill', 'rgba(130,201,30,0.1)')
          .attr('stroke', 'var(--trace-trigger)')
          .attr('stroke-width', 2)
          .attr('transform', `rotate(${(ellipse.angle * 180) / Math.PI}, ${centerX}, ${centerY})`);
      }
    }

    onMounted(render);

    watch([points, ellipseStats], render, { deep: true });

    onUnmounted(() => {
      if (svgRef.value) {
        d3.select(svgRef.value).selectAll('*').remove();
      }
    });

    return {
      svgRef,
      metrics,
      ellipseStats
    };
  },
  template: `
    <div class="session-shot-group">
      <svg ref="svgRef" class="group-chart"></svg>
      <div class="group-stats">
        <p><strong>Mean radial distance:</strong> {{ metrics.meanRadius.toFixed(1) }} mm</p>
        <p><strong>Extreme spread:</strong> {{ metrics.extremeSpread.toFixed(1) }} mm</p>
        <p v-if="ellipseStats"><strong>Avg hold ellipse:</strong> {{ ellipseStats.major.toFixed(1) }} × {{ ellipseStats.minor.toFixed(1) }} mm</p>
      </div>
    </div>
  `
});
