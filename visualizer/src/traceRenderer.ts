import { splitSegments, type ShotData } from './traceUtils';

export interface SegmentBuffer {
  coords: Float32Array;
  length: number;
}

export interface ShotRenderData {
  hold: SegmentBuffer;
  pull: SegmentBuffer;
  recoil: SegmentBuffer;
  holdEllipse?: {
    rx: number;
    ry: number;
    angleRad: number;
  };
  msPerSample: number;
  holdMs: number;
  pullMs: number;
  recoilMs: number;
  totalMs: number;
  pullMarker: [number, number] | null;
  shotMarker: [number, number] | null;
}

export interface TraceScene {
  shots: ShotRenderData[];
  maxDuration: number;
  minMsPerSample: number;
  size: number;
}

export interface SceneBuildOptions {
  size: number;
  scale: (value: number) => number;
}

export interface SegmentCounts {
  hold: number;
  pull: number;
  recoil: number;
  showPullDot: boolean;
  showShotMark: boolean;
}

const DEFAULT_MS_PER_SAMPLE = 1000 / 400;

function toSegmentBuffer(points: [number, number][]): SegmentBuffer {
  const coords = new Float32Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    coords[i * 2] = x;
    coords[i * 2 + 1] = y;
  }
  return { coords, length: points.length };
}

function sanitizeShot(shot: ShotData): ShotData | null {
  if (!shot?.pitch || !shot?.yaw) return null;
  const len = Math.min(shot.pitch.length, shot.yaw.length);
  if (len < 1) return null;
  return {
    ...shot,
    pitch: shot.pitch.slice(0, len),
    yaw: shot.yaw.slice(0, len)
  };
}

export function buildTraceScene(shots: ShotData[], options: SceneBuildOptions): TraceScene {
  const center = options.size / 2;
  const sceneShots: ShotRenderData[] = [];
  let maxDuration = 0;
  let minMsPerSample = Number.POSITIVE_INFINITY;

  shots.forEach(raw => {
    const shot = sanitizeShot(raw);
    if (!shot) return;
    const len = Math.min(shot.pitch.length, shot.yaw.length);
    if (len < 1) return;

    const coords: [number, number][] = [];
    for (let i = 0; i < len; i++) {
      const pitch = shot.pitch[i];
      const yaw = shot.yaw[i];
      if (!Number.isFinite(pitch) || !Number.isFinite(yaw)) {
        return;
      }
      coords.push([
        options.scale(yaw) + center,
        options.scale(-pitch) + center
      ]);
    }

    const segs = splitSegments(coords, shot);
    const sr = Number(shot.sample_rate) || 0;
    const msPerSample = sr > 0 ? 1000 / sr : DEFAULT_MS_PER_SAMPLE;
    const holdMs = segs.hold.length * msPerSample;
    const pullMs = segs.pull.length * msPerSample;
    const recoilMs = segs.recoil.length * msPerSample;
    const totalMs = holdMs + pullMs + recoilMs;
    maxDuration = Math.max(maxDuration, totalMs);
    minMsPerSample = Math.min(minMsPerSample, msPerSample);

    const holdEllipse = shot.holdEllipse && Number.isFinite(shot.holdEllipse.major) && Number.isFinite(shot.holdEllipse.minor)
      ? {
          rx: Math.abs(options.scale(shot.holdEllipse.major)),
          ry: Math.abs(options.scale(shot.holdEllipse.minor)),
          angleRad: ((shot.holdEllipse.angle ?? 0) * Math.PI) / 180
        }
      : undefined;

    sceneShots.push({
      hold: toSegmentBuffer(segs.hold),
      pull: toSegmentBuffer(segs.pull),
      recoil: toSegmentBuffer(segs.recoil),
      holdEllipse,
      msPerSample,
      holdMs,
      pullMs,
      recoilMs,
      totalMs,
      pullMarker: segs.pull.length ? segs.pull[0] : null,
      shotMarker: segs.recoil.length ? segs.recoil[0] : null
    });
  });

  return {
    shots: sceneShots,
    maxDuration,
    minMsPerSample: Number.isFinite(minMsPerSample) ? minMsPerSample : DEFAULT_MS_PER_SAMPLE,
    size: options.size
  };
}

function visibleCount(length: number, elapsed: number, msPerSample: number) {
  if (!length) return 0;
  const rate = msPerSample || DEFAULT_MS_PER_SAMPLE;
  if (elapsed <= 0) return Math.min(1, length);
  const idx = Math.min(length - 1, Math.floor(elapsed / rate));
  return idx + 1;
}

export function computeSegmentCounts(shot: ShotRenderData, elapsedMs: number): SegmentCounts {
  const holdTime = Math.min(elapsedMs, shot.holdMs);
  const pullTime = Math.min(Math.max(elapsedMs - shot.holdMs, 0), shot.pullMs);
  const recoilTime = Math.min(Math.max(elapsedMs - shot.holdMs - shot.pullMs, 0), shot.recoilMs);
  return {
    hold: visibleCount(shot.hold.length, holdTime, shot.msPerSample),
    pull: visibleCount(shot.pull.length, pullTime, shot.msPerSample),
    recoil: visibleCount(shot.recoil.length, recoilTime, shot.msPerSample),
    showPullDot: elapsedMs >= shot.holdMs && shot.pull.length > 0,
    showShotMark: elapsedMs >= shot.holdMs + shot.pullMs && shot.recoil.length > 0
  };
}
