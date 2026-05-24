import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import * as d3 from 'd3';
import Button from 'primevue/button';
import { useCustomIcon } from '../icons';
import { makeScale, type ShotData } from '../traceUtils';
import { degToMoa } from '../shotProcessor';
import { useTraceStyle } from '../traceStyles';
import {
  buildTraceScene,
  computeSegmentCounts,
  type SegmentCounts,
  type ShotRenderData,
  type TraceScene
} from '../traceRenderer';

const PlayIcon = useCustomIcon('play_arrow');
const PauseIcon = useCustomIcon('pause');
const ReplayIcon = useCustomIcon('replay');

const FALLBACK_RING_DEGREES = [1 / 16, 3 / 16, 5 / 16, 7 / 16, 9 / 16];
const MAX_POINTS_PER_STROKE = 3;
const POINT_RADIUS = 2;
const PULL_DOT_RADIUS = 4;
const SHOT_MARK_HALF = 7;
const REWIND_EPS = 1e-3;

interface ShotPlaybackState {
  hold: number;
  pull: number;
  recoil: number;
  pullMarker: boolean;
  shotMarker: boolean;
}

interface TraceColorSet {
  hold: string;
  pull: string;
  recoil: string;
  pullMarker: string;
  shotMarker: string;
  ellipseFill: string;
  ellipseStroke: string;
  lineWidth: number;
  pointRadius: number;
}

const DEFAULT_COLORS: TraceColorSet = {
  hold: '#3185fc',
  pull: '#f9dc5c',
  recoil: '#ff334b',
  pullMarker: '#f9dc5c',
  shotMarker: '#ffffff',
  ellipseFill: 'rgba(130,201,30,0.08)',
  ellipseStroke: '#ff334b',
  lineWidth: 2,
  pointRadius: POINT_RADIUS
};

export type PrepareFn<T> = (shots: T[]) => ShotData[];

export function createTraceVisualizer<T>(name: string, prepare: PrepareFn<T>, useMoa = false) {
  return defineComponent({
    name,
    components: { Button, PlayIcon, PauseIcon, ReplayIcon },
    props: {
      shots: { type: Array as () => T[], required: true },
      title: { type: String, default: '' }
    },
    setup(props) {
      const stageRef = ref<HTMLDivElement | null>(null);
      const svgRef = ref<SVGSVGElement | null>(null);
      const canvasRef = ref<HTMLCanvasElement | null>(null);
      const playing = ref(false);
      const progress = ref(1);
      const sliderStep = ref(0.001);
      const atEnd = computed(() => !playing.value && progress.value >= 0.999);
      const { activeStyle } = useTraceStyle();

      let scene: TraceScene | null = null;
      let shotStates: ShotPlaybackState[] = [];
      let ctx: CanvasRenderingContext2D | null = null;
      let zoomTransform = d3.zoomIdentity;
      let defaultTransform = d3.zoomIdentity;
      let backgroundRoot: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let zoomSelection: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;
      let animationHandle: number | null = null;
      let lastRenderTime = 0;
      let needsFullRedraw = true;
      let currentSize = 0;
      let currentDpr = 1;
      let canvasOffsetX = 0;
      let canvasOffsetY = 0;
      let viewportWidth = 0;
      let viewportHeight = 0;

      const scaleExtent: [number, number] = [0.05, 10];
      const zoom = d3.zoom<HTMLDivElement, unknown>()
        .scaleExtent(scaleExtent)
        .on('zoom', event => {
          zoomTransform = event.transform;
          backgroundRoot?.attr('transform', zoomTransform.toString());
          needsFullRedraw = true;
          renderScene(true);
        });

      function hasCanvasApi(candidate: CanvasRenderingContext2D | null): candidate is CanvasRenderingContext2D {
        if (!candidate) return false;
        const required = ['setTransform', 'clearRect', 'translate', 'scale', 'beginPath', 'lineTo', 'moveTo', 'stroke', 'fill', 'arc'];
        return required.every(key => typeof (candidate as any)[key] === 'function');
      }

      function ensureContext() {
        if (!canvasRef.value) return;
        if (!ctx) {
          const candidate = canvasRef.value.getContext('2d', { alpha: true });
          ctx = hasCanvasApi(candidate) ? candidate : null;
        }
      }

      function updateDimensions() {
        if (!stageRef.value || !canvasRef.value || !svgRef.value) return;
        const rect = stageRef.value.getBoundingClientRect();
        const fallback = rect.width || rect.height || 400;
        viewportWidth = rect.width || fallback;
        viewportHeight = rect.height || fallback;
        currentSize = Math.max(120, Math.min(viewportWidth, viewportHeight));
        currentDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvasOffsetX = Math.max(0, (viewportWidth - currentSize) / 2);
        canvasOffsetY = Math.max(0, (viewportHeight - currentSize) / 2);
        if (canvasRef.value) {
          canvasRef.value.width = Math.round(viewportWidth * currentDpr);
          canvasRef.value.height = Math.round(viewportHeight * currentDpr);
          canvasRef.value.style.width = '100%';
          canvasRef.value.style.height = '100%';
        }
        if (svgRef.value) {
          svgRef.value.style.width = '100%';
          svgRef.value.style.height = '100%';
        }
        const svg = d3.select(svgRef.value);
        svg.attr('viewBox', `0 0 ${currentSize} ${currentSize}`)
          .attr('preserveAspectRatio', 'xMidYMid meet');
      }

      function resolveColors(): TraceColorSet {
        if (typeof window === 'undefined') return DEFAULT_COLORS;
        const target = stageRef.value ?? document.documentElement;
        const styles = window.getComputedStyle(target);
        const read = (token: string, fallback: string) => {
          const val = styles.getPropertyValue(token);
          return val ? val.trim() || fallback : fallback;
        };
        return {
          hold: read('--trace-hold', DEFAULT_COLORS.hold),
          pull: read('--trace-pull', DEFAULT_COLORS.pull),
          recoil: read('--trace-trigger', DEFAULT_COLORS.recoil),
          pullMarker: read('--marker-pull', DEFAULT_COLORS.pullMarker),
          shotMarker: read('--marker-shot', DEFAULT_COLORS.shotMarker),
          ellipseFill: DEFAULT_COLORS.ellipseFill,
          ellipseStroke: read('--trace-trigger', DEFAULT_COLORS.ellipseStroke),
          lineWidth: DEFAULT_COLORS.lineWidth,
          pointRadius: DEFAULT_COLORS.pointRadius
        };
      }

      function ensureShotStates() {
        if (!scene) {
          shotStates = [];
          return;
        }
        if (shotStates.length !== scene.shots.length) {
          shotStates = scene.shots.map(() => ({
            hold: 0,
            pull: 0,
            recoil: 0,
            pullMarker: false,
            shotMarker: false
          }));
        }
      }

      function applyCanvasTransform() {
        if (!ctx) return;
        ctx.setTransform(
          currentDpr,
          0,
          0,
          currentDpr,
          canvasOffsetX * currentDpr,
          canvasOffsetY * currentDpr
        );
        ctx.translate(zoomTransform.x, zoomTransform.y);
        ctx.scale(zoomTransform.k, zoomTransform.k);
      }

      function resetCanvasSurface() {
        if (!ctx || !canvasRef.value) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
        applyCanvasTransform();
      }

      function drawHoldEllipse(shot: ShotRenderData, colors: TraceColorSet) {
        if (!ctx || !shot.holdEllipse) return;
        const cx = currentSize / 2;
        const cy = currentSize / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(shot.holdEllipse.angleRad);
        ctx.beginPath();
        ctx.ellipse(0, 0, shot.holdEllipse.rx, shot.holdEllipse.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = colors.ellipseFill;
        ctx.fill();
        ctx.lineWidth = colors.lineWidth;
        ctx.strokeStyle = colors.ellipseStroke;
        ctx.stroke();
        ctx.restore();
      }

      function drawPoints(buffer: Float32Array, startIndex: number, endIndex: number, color: string, radius: number) {
        if (!ctx || radius <= 0) return;
        ctx.fillStyle = color;
        for (let i = startIndex; i < endIndex; i++) {
          const x = buffer[i * 2];
          const y = buffer[i * 2 + 1];
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function drawSegmentDelta(
        buffer: Float32Array,
        previous: number,
        next: number,
        color: string,
        lineWidth: number,
        pointRadius: number
      ) {
        if (!ctx || buffer.length === 0) return;
        const safeNext = Math.max(0, next);
        const safePrev = Math.max(0, previous);
        if (safeNext <= safePrev) return;
        const coords = buffer;
        const startIndex = Math.max(safePrev - 1, 0);
        const endIndex = safeNext - 1;
        if (endIndex > startIndex) {
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const step = Math.max(1, MAX_POINTS_PER_STROKE - 1);
          for (let start = startIndex; start < endIndex; start += step) {
            const last = Math.min(endIndex, start + MAX_POINTS_PER_STROKE - 1);
            ctx.beginPath();
            ctx.moveTo(coords[start * 2], coords[start * 2 + 1]);
            for (let idx = start + 1; idx <= last; idx++) {
              ctx.lineTo(coords[idx * 2], coords[idx * 2 + 1]);
            }
            ctx.stroke();
          }
        }
        drawPoints(coords, safePrev, safeNext, color, pointRadius);
      }

      function drawPullMarker(point: [number, number] | null, colors: TraceColorSet) {
        if (!ctx || !point) return;
        ctx.beginPath();
        ctx.fillStyle = colors.pullMarker;
        ctx.arc(point[0], point[1], PULL_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawShotMarker(point: [number, number] | null, colors: TraceColorSet) {
        if (!ctx || !point) return;
        ctx.strokeStyle = colors.shotMarker;
        ctx.lineWidth = colors.lineWidth + 0.5;
        ctx.beginPath();
        ctx.moveTo(point[0] - SHOT_MARK_HALF, point[1] - SHOT_MARK_HALF);
        ctx.lineTo(point[0] + SHOT_MARK_HALF, point[1] + SHOT_MARK_HALF);
        ctx.moveTo(point[0] + SHOT_MARK_HALF, point[1] - SHOT_MARK_HALF);
        ctx.lineTo(point[0] - SHOT_MARK_HALF, point[1] + SHOT_MARK_HALF);
        ctx.stroke();
      }

      function applyCounts(targetCounts: SegmentCounts[], colors: TraceColorSet, drawStatics: boolean) {
        if (!scene) return;
        ensureShotStates();
        scene.shots.forEach((shot, idx) => {
          const state = shotStates[idx];
          const counts = targetCounts[idx];
          if (drawStatics) {
            drawHoldEllipse(shot, colors);
          }
          if (shot.hold.length) {
            drawSegmentDelta(shot.hold.coords, drawStatics ? 0 : state.hold, counts.hold, colors.hold, colors.lineWidth, colors.pointRadius);
            state.hold = counts.hold;
          }
          if (shot.pull.length) {
            drawSegmentDelta(shot.pull.coords, drawStatics ? 0 : state.pull, counts.pull, colors.pull, colors.lineWidth, colors.pointRadius);
            state.pull = counts.pull;
          }
          if (shot.recoil.length) {
            drawSegmentDelta(shot.recoil.coords, drawStatics ? 0 : state.recoil, counts.recoil, colors.recoil, colors.lineWidth, colors.pointRadius);
            state.recoil = counts.recoil;
          }
          if (shot.pullMarker && counts.showPullDot && (!state.pullMarker || drawStatics)) {
            drawPullMarker(shot.pullMarker, colors);
            state.pullMarker = true;
          }
          if (shot.shotMarker && counts.showShotMark && (!state.shotMarker || drawStatics)) {
            drawShotMarker(shot.shotMarker, colors);
            state.shotMarker = true;
          }
        });
      }

      function renderScene(forceFullRedraw = false) {
        ensureContext();
        if (!ctx || !canvasRef.value) return;
        const colors = resolveColors();
        const hasShots = !!scene?.shots.length;
        const elapsed = scene && scene.maxDuration ? progress.value * scene.maxDuration : 0;
        const rewinding = elapsed + REWIND_EPS < lastRenderTime;
        const shouldReset = forceFullRedraw || needsFullRedraw || rewinding;

        if (!hasShots) {
          resetCanvasSurface();
          lastRenderTime = 0;
          needsFullRedraw = false;
          return;
        }

        const counts = scene!.shots.map(shot => computeSegmentCounts(shot, elapsed));

        if (shouldReset) {
          needsFullRedraw = false;
          ensureShotStates();
          shotStates.forEach(state => {
            state.hold = 0;
            state.pull = 0;
            state.recoil = 0;
            state.pullMarker = false;
            state.shotMarker = false;
          });
          resetCanvasSurface();
          applyCounts(counts, colors, true);
        } else {
          applyCounts(counts, colors, false);
        }
        lastRenderTime = elapsed;
      }

      function cancelAnimation() {
        if (animationHandle !== null) {
          cancelAnimationFrame(animationHandle);
          animationHandle = null;
        }
      }

      function play() {
        if (!scene || scene.maxDuration === 0) return;
        if (progress.value >= 0.999) {
          progress.value = 0;
        }
        if (playing.value) return;
        playing.value = true;
        cancelAnimation();
        const minStep = scene.minMsPerSample || 1;
        const maxStep = minStep * MAX_POINTS_PER_STROKE;
        const desiredStep = 16;
        const stepMs = Math.max(minStep, Math.min(desiredStep, maxStep));
        const tick = () => {
          if (!playing.value || !scene) {
            animationHandle = null;
            return;
          }
          const nextElapsed = Math.min(scene.maxDuration, progress.value * scene.maxDuration + stepMs);
          progress.value = scene.maxDuration ? nextElapsed / scene.maxDuration : 0;
          if (progress.value >= 0.999) {
            progress.value = 1;
            playing.value = false;
            animationHandle = null;
            return;
          }
          animationHandle = requestAnimationFrame(tick);
        };
        animationHandle = requestAnimationFrame(tick);
      }

      function pause() {
        if (!playing.value) return;
        playing.value = false;
        cancelAnimation();
      }

      function toggle() {
        if (playing.value) pause(); else play();
      }

      function rebuildScene() {
        ensureContext();
        if (!stageRef.value || !svgRef.value || !canvasRef.value) return;
        updateDimensions();
        const style = activeStyle.value;
        const ringDeg = style?.ringDegrees ?? FALLBACK_RING_DEGREES;
        const ringVals = useMoa ? ringDeg.map(degToMoa) : ringDeg;
        const ringMax = ringVals[ringVals.length - 1] || ringVals[0] || 1;
        const scale = makeScale([], currentSize, ringMax);
        const rings = ringVals.map(d => scale(d));
        const ringMoa = ringDeg.map(degToMoa);

        const svg = d3.select(svgRef.value);
        svg.selectAll('*').remove();
        backgroundRoot = svg.append('g').attr('data-trace-style', style?.id ?? 'target');
        style?.renderBackground({
          root: backgroundRoot,
          size: currentSize,
          ringPixels: rings,
          ringDegrees: ringDeg,
          ringMoa,
          useMoa,
          styleMeta: style?.meta
        });

        scene = buildTraceScene(prepare(props.shots), { size: currentSize, scale });
        shotStates = scene.shots.map(() => ({
          hold: 0,
          pull: 0,
          recoil: 0,
          pullMarker: false,
          shotMarker: false
        }));

        const ringRadiusPx = scale(ringMax);
        const targetRadiusPx = (currentSize / 2) * 0.92;
        const clampScale = (val: number) => Math.max(scaleExtent[0], Math.min(scaleExtent[1], val));
        const targetScale = clampScale(Math.min(1, ringRadiusPx ? targetRadiusPx / ringRadiusPx : 1));
        defaultTransform = d3.zoomIdentity
          .translate(currentSize / 2, currentSize / 2)
          .scale(targetScale)
          .translate(-currentSize / 2, -currentSize / 2);

        if (!zoomSelection && stageRef.value) {
          zoomSelection = d3.select(stageRef.value);
          zoomSelection.call(zoom as any);
        }
        if (zoomSelection) {
          zoomSelection.call(zoom.transform, defaultTransform);
        } else {
          zoomTransform = defaultTransform;
        }

        needsFullRedraw = true;
        playing.value = false;
        cancelAnimation();
        progress.value = scene.maxDuration ? 1 : 0;
        lastRenderTime = scene.maxDuration;
        sliderStep.value = scene.maxDuration
          ? Math.max(0.0005, Math.min(0.01, scene.minMsPerSample / Math.max(scene.maxDuration, 1)))
          : 0.0005;
        renderScene(true);
      }

      function bindResizeObserver() {
        if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;
        if (!stageRef.value) return;
        resizeObserver = new ResizeObserver(() => {
          rebuildScene();
        });
        resizeObserver.observe(stageRef.value);
      }

      onMounted(() => {
        bindResizeObserver();
        rebuildScene();
      });

      onUnmounted(() => {
        pause();
        resizeObserver?.disconnect();
        resizeObserver = null;
        zoomSelection?.on('.zoom', null);
        zoomSelection = null;
      });

      watch(() => props.shots, () => rebuildScene(), { deep: true });
      watch(activeStyle, () => rebuildScene());
      watch(progress, (value, oldValue) => {
        if (!scene) return;
        if (value + REWIND_EPS < oldValue) {
          needsFullRedraw = true;
        }
        renderScene(value + REWIND_EPS < oldValue);
      });

      return {
        stageRef,
        svgRef,
        canvasRef,
        toggle,
        play,
        pause,
        progress,
        playing,
        atEnd,
        sliderStep
      };
    },
    template: `
      <div class="trace-visualizer">
        <h4 v-if="title">{{ title }}</h4>
        <div class="trace-stage" ref="stageRef">
          <svg ref="svgRef" class="trace-svg" data-testid="trace-svg"></svg>
          <canvas ref="canvasRef" class="trace-canvas" data-testid="trace-canvas"></canvas>
        </div>
        <div class="trace-controls">
          <input
            type="range"
            min="0"
            max="1"
            :step="sliderStep"
            v-model.number="progress"
            data-testid="timeline"
            class="timeline"
          />
          <Button @click="toggle" class="p-button-sm" data-testid="play-btn">
            <template #icon>
              <ReplayIcon v-if="atEnd" />
              <PlayIcon v-else-if="!playing" />
              <PauseIcon v-else />
            </template>
          </Button>
        </div>
      </div>
    `
  });
}
