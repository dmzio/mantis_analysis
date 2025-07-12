import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import * as d3 from 'd3';
import Button from 'primevue/button';
import { useCustomIcon } from '../icons';
import { makeScale, splitSegments, ShotData } from '../traceUtils';
import { degToMoa } from '../shotProcessor';

const PlayIcon = useCustomIcon('play_arrow');
const PauseIcon = useCustomIcon('pause');

export type PrepareFn<T> = (shots: T[]) => ShotData[];

export function createTraceVisualizer<T>(name: string, prepare: PrepareFn<T>, useMoa = false) {
  return defineComponent({
    name,
    components: { Button, PlayIcon, PauseIcon },
    props: {
      shots: { type: Array as () => T[], required: true },
      title: { type: String, default: '' }
    },
    setup(props) {
      const svgRef = ref<SVGSVGElement | null>(null);
      const playing = ref(false);
      const progress = ref(1);
      let timer: d3.Timer | null = null;
      let segsInfo: any[] = [];
      let maxDuration = 0;

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 10])
        .on('zoom', event => {
          d3.select(svgRef.value).select('g').attr('transform', event.transform.toString());
        });

      function updatePaths() {
        const globalTime = progress.value * maxDuration;
        segsInfo.forEach(info => {
          const t = Math.min(globalTime, info.totalDur);
          const holdTime = Math.min(t, info.holdMs);
          const pullTime = Math.min(Math.max(t - info.holdMs, 0), info.pullMs);
          const recoilTime = Math.max(t - info.holdMs - info.pullMs, 0);

          const holdP = info.holdMs ? holdTime / info.holdMs : 1;
          const pullP = info.pullMs ? pullTime / info.pullMs : 1;
          const recoilP = info.recoilMs ? recoilTime / info.recoilMs : 1;

          info.hold
            .attr('stroke-dasharray', info.holdLen)
            .attr('stroke-dashoffset', info.holdLen - info.holdLen * holdP);
          info.pull
            .attr('stroke-dasharray', info.pullLen)
            .attr('stroke-dashoffset', info.pullLen - info.pullLen * pullP);
          info.recoil
            .attr('stroke-dasharray', info.recoilLen)
            .attr('stroke-dashoffset', info.recoilLen - info.recoilLen * recoilP);

          const holdIdx = Math.floor(holdTime / info.msPerSample);
          const pullIdx = Math.floor(pullTime / info.msPerSample);
          const recoilIdx = Math.floor(recoilTime / info.msPerSample);

          info.holdPts.attr('opacity', (_: any, i: number) => (i <= holdIdx ? 1 : 0));
          info.pullPts.attr('opacity', (_: any, i: number) => (i <= pullIdx ? 1 : 0));
          info.recoilPts.attr('opacity', (_: any, i: number) => (i <= recoilIdx ? 1 : 0));

          info.pullDot.attr('opacity', t >= info.holdMs ? 1 : 0);
          info.shotMark.attr('opacity', t >= info.holdMs + info.pullMs ? 1 : 0);
        });
      }

      function draw() {
        if (!svgRef.value) return;
        const prepared = prepare(props.shots);
        const rect = svgRef.value.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) || 400;
        const svg = d3.select(svgRef.value);
        svg.attr('viewBox', `0 0 ${size} ${size}`)
          .attr('preserveAspectRatio', 'xMidYMid meet');
        svg.selectAll('*').remove();
        const root = svg.append('g');

        const ringDeg = [1/16, 3/16, 5/16, 7/16, 9/16];
        const ringVals = useMoa ? ringDeg.map(degToMoa) : ringDeg;

        const allVals: number[] = [];
        prepared.forEach(shot => {
          if (!shot.pitch?.length || !shot.yaw?.length) return;
          const pullIdx = shot.pull_index ?? 0;
          const shotIdx = shot.shot_index ?? Math.min(shot.pitch.length, shot.yaw.length) - 1;
          for (let i = pullIdx; i <= shotIdx; i++) {
            allVals.push(Math.abs(shot.pitch[i]));
            allVals.push(Math.abs(shot.yaw[i]));
          }
        });
        const maxVal = Math.max(d3.max(allVals) ?? 0, ringVals[ringVals.length - 1]);
        const scale = makeScale([], size, maxVal);
        const rings = ringVals.map(d => scale(d));
        root.selectAll('circle.ring').data(rings).enter().append('circle')
          .attr('class', 'ring').attr('cx', size / 2).attr('cy', size / 2)
          .attr('r', d => d).attr('fill', 'none')
          .attr('stroke', 'var(--ring)').attr('stroke-width', 1);
        const ringMoa = ringDeg.map(degToMoa);
        root.selectAll('text.ring-label').data(rings).enter().append('text')
          .attr('class', 'ring-label')
          .attr('x', d => size / 2 + d + 2)
          .attr('y', size / 2 - 2)
          .text((d, i) => `${ringMoa[i].toFixed(1)} MOA`);
        root.append('line').attr('x1', 0).attr('x2', size).attr('y1', size / 2).attr('y2', size / 2)
          .attr('stroke', 'var(--cross)').attr('stroke-width', 1);
        root.append('line').attr('y1', 0).attr('y2', size).attr('x1', size / 2).attr('x2', size / 2)
          .attr('stroke', 'var(--cross)').attr('stroke-width', 1);

        segsInfo = [];
        maxDuration = 0;
        prepared.forEach(shot => {
          if (!shot.pitch?.length || !shot.yaw?.length) return;
          const coords = shot.pitch.map((p, i) => [shot.yaw[i], -p]) as [number, number][];
          const pullIdx = shot.pull_index ?? 0;
          const shotIdx = shot.shot_index ?? coords.length - 1;
          const scaled = coords.map(([x, y]) => [scale(x) + size / 2, scale(y) + size / 2]);
          const segs = splitSegments(scaled, { pull_index: pullIdx, shot_index: shotIdx });
          const line = d3.line().curve(d3.curveLinear);

          const holdPath = root.append('path').attr('d', line(segs.hold)!)
            .attr('fill', 'none').attr('stroke', 'var(--trace-hold)').attr('stroke-width', 2)
            .attr('data-seg', 'hold');
          const pullPath = root.append('path').attr('d', line(segs.pull)!)
            .attr('fill', 'none').attr('stroke', 'var(--trace-pull)').attr('stroke-width', 2)
            .attr('data-seg', 'pull');
          const recoilPath = root.append('path').attr('d', line(segs.recoil)!)
            .attr('fill', 'none').attr('stroke', 'var(--trace-trigger)').attr('stroke-width', 2)
            .attr('data-seg', 'recoil');

          const holdPts = root.append('g').selectAll('circle')
            .data(segs.hold).enter().append('circle')
            .attr('cx', d => d[0]).attr('cy', d => d[1])
            .attr('r', 2).attr('fill', 'var(--trace-hold)')
            .attr('opacity', 0).attr('data-point', 'hold');
          const pullPts = root.append('g').selectAll('circle')
            .data(segs.pull).enter().append('circle')
            .attr('cx', d => d[0]).attr('cy', d => d[1])
            .attr('r', 2).attr('fill', 'var(--trace-pull)')
            .attr('opacity', 0).attr('data-point', 'pull');
          const recoilPts = root.append('g').selectAll('circle')
            .data(segs.recoil).enter().append('circle')
            .attr('cx', d => d[0]).attr('cy', d => d[1])
            .attr('r', 2).attr('fill', 'var(--trace-trigger)')
            .attr('opacity', 0).attr('data-point', 'recoil');

          const pullDot = root.append('circle').attr('cx', segs.pull[0][0]).attr('cy', segs.pull[0][1])
            .attr('r', 4).attr('fill', 'var(--marker-pull)').attr('opacity', 0).attr('data-marker', 'pull');
          const [sx, sy] = segs.recoil[0];
          const shotMark = root.append('text').attr('x', sx).attr('y', sy)
            .attr('fill', 'var(--marker-shot)')
            .attr('font-size', 20)
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('opacity', 0)
            .attr('data-marker', 'shot')
            .text('✕');

          const msPerSample = 1000 / (shot.sample_rate ?? 400);
          const holdMs = segs.hold.length * msPerSample;
          const pullMs = segs.pull.length * msPerSample;
          const recoilMs = segs.recoil.length * msPerSample;
          const totalDur = holdMs + pullMs + recoilMs;
          maxDuration = Math.max(maxDuration, totalDur);

          segsInfo.push({
            hold: holdPath,
            pull: pullPath,
            recoil: recoilPath,
            pullDot,
            shotMark,
            holdPts,
            pullPts,
            recoilPts,
            holdLen: (holdPath.node() as SVGPathElement).getTotalLength(),
            pullLen: (pullPath.node() as SVGPathElement).getTotalLength(),
            recoilLen: (recoilPath.node() as SVGPathElement).getTotalLength(),
            msPerSample,
            holdMs,
            pullMs,
            recoilMs,
            totalDur
          });
        });
        progress.value = 1;
        updatePaths();
      }

      function play() {
        if (playing.value || maxDuration === 0) return;
        playing.value = true;
        const start = Date.now() - progress.value * maxDuration;
        timer = d3.timer(() => {
          const p = Math.min((Date.now() - start) / maxDuration, 1);
          progress.value = p;
          if (p >= 1) {
            playing.value = false;
            timer?.stop();
          }
        });
      }

      function pause() {
        if (!playing.value) return;
        playing.value = false;
        timer?.stop();
      }

      function toggle() {
        if (playing.value) pause(); else play();
      }

      onMounted(() => {
        draw();
        d3.select(svgRef.value).call(zoom as any);
      });

      onUnmounted(() => {
        timer?.stop();
        d3.select(svgRef.value).on('.zoom', null);
      });

      watch(() => props.shots, draw, { deep: true, immediate: true });
      watch(progress, updatePaths);

      return { svgRef, toggle, play, pause, progress, playing, zoom };
    },
    template: `
      <div class="trace-visualizer">
        <h4 v-if="title">{{ title }}</h4>
        <svg ref="svgRef" class="trace-svg" data-testid="trace-svg"></svg>
        <div class="trace-controls">
          <input type="range" min="0" max="1" step="0.01" v-model.number="progress" data-testid="timeline" class="timeline" />
          <Button @click="toggle" class="p-button-sm" data-testid="play-btn">
            <template #icon>
              <PlayIcon v-if="!playing" />
              <PauseIcon v-else />
            </template>
          </Button>
        </div>
      </div>
    `
  });
}
