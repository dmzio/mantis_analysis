import { defineComponent, onMounted, ref, watch } from 'vue';
import * as d3 from 'd3';
import Button from 'primevue/button';
import { useCustomIcon } from '../icons';
import { toRelativeCoords, makeScale, splitSegments, ShotData } from '../traceUtils';

const PlayIcon = useCustomIcon('play_arrow');

export default defineComponent({
  name: 'TraceVisualizer',
  components: { Button, PlayIcon },
  props: {
    shots: { type: Array as () => ShotData[], required: true }
  },
  setup(props) {
    const svgRef = ref<SVGSVGElement | null>(null);
    const playing = ref(false);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .on('zoom', event => {
        d3.select(svgRef.value).select('g').attr('transform', event.transform.toString());
      });

    function draw() {
      if (!svgRef.value) return;
      const size = svgRef.value.clientWidth || 400;
      const svg = d3.select(svgRef.value);
      svg.attr('viewBox', `0 0 ${size} ${size}`);
      svg.selectAll('*').remove();
      const root = svg.append('g');

      const rings = d3.range(1, 6).map(i => (i / 5) * (size / 2));
      root.selectAll('circle.ring').data(rings).enter().append('circle')
        .attr('class', 'ring').attr('cx', size / 2).attr('cy', size / 2)
        .attr('r', d => d).attr('fill', 'none')
        .attr('stroke', 'var(--ring)').attr('stroke-width', 1);
      root.append('line').attr('x1', 0).attr('x2', size).attr('y1', size / 2).attr('y2', size / 2)
        .attr('stroke', 'var(--cross)').attr('stroke-width', 1);
      root.append('line').attr('y1', 0).attr('y2', size).attr('x1', size / 2).attr('x2', size / 2)
        .attr('stroke', 'var(--cross)').attr('stroke-width', 1);

      props.shots.forEach(shot => {
        const coords = toRelativeCoords(shot);
        const scale = makeScale(coords.flat(), size);
        const scaled = coords.map(([x, y]) => [scale(x) + size / 2, scale(y) + size / 2]);
        const segs = splitSegments(scaled, shot);
        const line = d3.line().curve(d3.curveBasis);
        root.append('path').attr('d', line(segs.hold)!)
          .attr('fill', 'none').attr('stroke', 'var(--trace-hold)').attr('stroke-width', 2);
        root.append('path').attr('d', line(segs.trigger)!)
          .attr('fill', 'none').attr('stroke', 'var(--trace-trigger)').attr('stroke-width', 2);
        const [sx, sy] = segs.trigger[segs.trigger.length - 1];
        root.append('text').attr('x', sx).attr('y', sy)
          .attr('fill', 'var(--marker-shot)').attr('font-size', 14)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').text('✕');
      });
    }

    function play() {
      if (playing.value) return;
      playing.value = true;
      const root = d3.select(svgRef.value).select('g');
      root.selectAll('path')
        .attr('stroke-dasharray', function () { return (this as SVGPathElement).getTotalLength(); })
        .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength(); })
        .transition()
        .duration(3000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .on('end', () => { playing.value = false; });
    }

    onMounted(() => {
      draw();
      d3.select(svgRef.value).call(zoom as any);
    });

    watch(() => props.shots, draw);

    return { svgRef, play };
  },
  template: `
    <div class="trace-visualizer">
      <svg ref="svgRef" style="width:100%;height:400px"></svg>
      <Button @click="play" class="p-button-sm" data-testid="play-btn">
        <template #icon><PlayIcon /></template>
      </Button>
    </div>
  `
});
