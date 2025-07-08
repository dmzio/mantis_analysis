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
    const progress = ref(1);
    let timer: d3.Timer | null = null;
    let segsInfo: any[] = [];

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .on('zoom', event => {
        d3.select(svgRef.value).select('g').attr('transform', event.transform.toString());
      });

    function updatePaths() {
      segsInfo.forEach(info => {
        const total = info.holdLen + info.pullLen + info.recoilLen;
        const len = total * progress.value;
        const holdDraw = Math.min(len, info.holdLen);
        const pullDraw = Math.min(Math.max(0, len - info.holdLen), info.pullLen);
        const recoilDraw = Math.max(0, len - info.holdLen - info.pullLen);
        info.hold.attr('stroke-dasharray', info.holdLen).attr('stroke-dashoffset', info.holdLen - holdDraw);
        info.pull.attr('stroke-dasharray', info.pullLen).attr('stroke-dashoffset', info.pullLen - pullDraw);
        info.recoil.attr('stroke-dasharray', info.recoilLen).attr('stroke-dashoffset', info.recoilLen - recoilDraw);
        info.pullDot.attr('opacity', len >= info.holdLen ? 1 : 0);
        info.shotMark.attr('opacity', len >= info.holdLen + info.pullLen ? 1 : 0);
      });
    }

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

      segsInfo = [];
      props.shots.forEach(shot => {
        const coords = toRelativeCoords(shot);
        const scale = makeScale(coords.flat(), size);
        const scaled = coords.map(([x, y]) => [scale(x) + size / 2, scale(y) + size / 2]);
        const pullIdx = shot.pull_index ?? 0;
        const shotIdx = shot.shot_index ?? scaled.length - 1;
        const segs = splitSegments(scaled, { pull_index: pullIdx, shot_index: shotIdx });
        const line = d3.line().curve(d3.curveBasis);
        const holdPath = root.append('path').attr('d', line(segs.hold)!)
          .attr('fill', 'none').attr('stroke', 'var(--trace-hold)').attr('stroke-width', 2)
          .attr('data-seg', 'hold');
        const pullPath = root.append('path').attr('d', line(segs.pull)!)
          .attr('fill', 'none').attr('stroke', 'var(--trace-pull)').attr('stroke-width', 2)
          .attr('data-seg', 'pull');
        const recoilPath = root.append('path').attr('d', line(segs.recoil)!)
          .attr('fill', 'none').attr('stroke', 'var(--trace-trigger)').attr('stroke-width', 2)
          .attr('data-seg', 'recoil');
        const pullDot = root.append('circle').attr('cx', segs.pull[0][0]).attr('cy', segs.pull[0][1])
          .attr('r', 4).attr('fill', 'var(--marker-pull)').attr('opacity', 0).attr('data-marker', 'pull');
        const [sx, sy] = segs.recoil[0];
        const shotMark = root.append('text').attr('x', sx).attr('y', sy)
          .attr('fill', 'var(--marker-shot)').attr('font-size', 14)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('opacity', 0).attr('data-marker', 'shot').text('✕');
        segsInfo.push({ hold: holdPath, pull: pullPath, recoil: recoilPath, pullDot, shotMark,
                        holdLen: (holdPath.node() as SVGPathElement).getTotalLength(),
                        pullLen: (pullPath.node() as SVGPathElement).getTotalLength(),
                        recoilLen: (recoilPath.node() as SVGPathElement).getTotalLength() });
      });
      progress.value = 1;
      updatePaths();
    }

    function play() {
      if (playing.value) return;
      playing.value = true;
      const start = Date.now();
      timer = d3.timer(() => {
        const p = Math.min((Date.now() - start) / 3000, 1);
        progress.value = p;
        if (p >= 1) {
          playing.value = false;
          timer?.stop();
        }
      });
    }

    onMounted(() => {
      draw();
      d3.select(svgRef.value).call(zoom as any);
    });

    watch(() => props.shots, draw);
    watch(progress, updatePaths);

    return { svgRef, play, progress };
  },
  template: `
    <div class="trace-visualizer">
      <svg ref="svgRef" style="width:100%;height:400px"></svg>
      <div style="display:flex;align-items:center;gap:.5rem;margin-top:.5rem;width:100%;">
        <input type="range" min="0" max="1" step="0.01" v-model.number="progress" data-testid="timeline" style="flex:1;" />
        <Button @click="play" class="p-button-sm" data-testid="play-btn">
          <template #icon><PlayIcon /></template>
        </Button>
      </div>
    </div>
  `
});
