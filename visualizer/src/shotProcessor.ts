export interface ShotData {
  pitch: number[];
  yaw: number[];
  hold_index?: number;
  pull_index?: number;
  shot_index?: number;
  sample_rate?: number;
  [key: string]: any;
}

export interface CenterPoint { pitch: number; yaw: number; }

export interface HoldEllipse {
  major_moa: number;
  minor_moa: number;
  angle_deg: number;
  area_mm2: number;
}

export interface PreprocessedShot extends ShotData {
  center: CenterPoint;
  rel_pitch_moa: number[];
  rel_yaw_moa: number[];
  start_index: number;
  pre_shot_1s_index: number;
  pull_index_calc: number;
  length_1s: number;
  delta_pull: number;
  percent_10: number;
  hold_duration_s: number;
  trigger_hold_s: number | null;
  trigger_pull_s: number | null;
  split_s: number | null;
  score_numeric: number | null;
  impact_pitch_moa: number;
  impact_yaw_moa: number;
  impact_pitch_mm: number;
  impact_yaw_mm: number;
  post_shot_stability_500ms_mm: number | null;
  session_elapsed_s: number | null;
  hold_ellipse: HoldEllipse | null;
  ellipse_major_moa: number | null;
  ellipse_minor_moa: number | null;
  ellipse_major_mm: number | null;
  ellipse_minor_mm: number | null;
  ellipse_angle_deg: number | null;
  ellipse_area_mm2: number | null;
}

export interface ProcessedShot extends PreprocessedShot {
  abs_deviation_moa: number[];
  abs_speed_mm_s: number[];
  ring_position: number[];
  speed_pitch_mm_s: number[];
  speed_yaw_mm_s: number[];
}

// ---- Drift detection/correction ------------------------------------------

export interface ShotDriftSlope {
  shotPk?: number;
  yawSlope: number; // degrees per second
  pitchSlope: number; // degrees per second
  duration: number; // seconds
  amplitude: number; // degrees = |slope| * duration
}

export interface SessionDriftOptions {
  marginSeconds?: number;
  minDurationSeconds?: number;
  amplitudeThreshold?: number;
  maxMadMultiplier?: number;
}

export interface SessionDriftEstimate {
  yawSlope: number;
  pitchSlope: number;
  amplitude: number;
  duration: number;
  hasDrift: boolean;
  method: 'session_hold_linear';
  shotCount: number;
  usedShots: number;
  perShot: ShotDriftSlope[];
  usedSlopes: ShotDriftSlope[];
}

function olsSlopeIntercept(t: number[], y: number[]): { m: number; b: number } {
  const n = t.length;
  let st = 0;
  let sy = 0;
  let stt = 0;
  let sty = 0;
  for (let i = 0; i < n; i++) {
    st += t[i];
    sy += y[i];
    stt += t[i] * t[i];
    sty += t[i] * y[i];
  }
  const denom = n * stt - st * st;
  if (denom === 0) return { m: 0, b: sy / (n || 1) };
  const m = (n * sty - st * sy) / denom;
  const b = (sy - m * st) / n;
  return { m, b };
}

function timeVector(start: number, end: number, fs: number): number[] {
  const t: number[] = [];
  for (let i = start; i < end; i++) t.push(i / fs);
  return t;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function mad(values: number[], centre: number): number {
  if (!values.length) return 0;
  const deviations = values.map(v => Math.abs(v - centre));
  return median(deviations);
}

function cloneShotBase(shot: ShotData): ShotData {
  return {
    ...shot,
    pitch: Array.isArray(shot.pitch) ? [...shot.pitch] : [],
    yaw: Array.isArray(shot.yaw) ? [...shot.yaw] : []
  };
}

function computeShotSlope(shot: ShotData, opts: Required<SessionDriftOptions>): ShotDriftSlope | null {
  if (!Array.isArray(shot.pitch) || !Array.isArray(shot.yaw)) return null;
  const fs = shot.sample_rate ?? 400;
  const hold = typeof shot.hold_index === 'number' ? shot.hold_index : 0;
  const maxIdx = Math.min(shot.pitch.length, shot.yaw.length) - 1;
  const pull = typeof shot.pull_index === 'number'
    ? Math.min(shot.pull_index, maxIdx)
    : Math.min(shot.shot_index ?? maxIdx, maxIdx);
  if (pull <= hold + 1) return null;
  const margin = Math.max(0, Math.round(opts.marginSeconds * fs));
  const end = Math.max(hold + 2, pull - margin);
  if (end <= hold + 1) return null;
  const start = hold;
  const duration = (end - start) / fs;
  if (duration < opts.minDurationSeconds) return null;
  const t = timeVector(start, end, fs);
  const yawSeg = shot.yaw.slice(start, end);
  const pitchSeg = shot.pitch.slice(start, end);
  const { m: yawSlope } = olsSlopeIntercept(t, yawSeg);
  const { m: pitchSlope } = olsSlopeIntercept(t, pitchSeg);
  const amplitude = Math.hypot(yawSlope, pitchSlope) * duration;
  return {
    shotPk: (shot as any).pk,
    yawSlope,
    pitchSlope,
    duration,
    amplitude
  };
}

export function estimateSessionDrift(
  shots: ShotData[],
  options: SessionDriftOptions = {}
): SessionDriftEstimate | null {
  const opts: Required<SessionDriftOptions> = {
    marginSeconds: options.marginSeconds ?? 0.15,
    minDurationSeconds: options.minDurationSeconds ?? 0.2,
    amplitudeThreshold: options.amplitudeThreshold ?? 0.8,
    maxMadMultiplier: options.maxMadMultiplier ?? 3
  };
  const perShot: ShotDriftSlope[] = [];
  shots.forEach(shot => {
    const slope = computeShotSlope(shot, opts);
    if (slope) perShot.push(slope);
  });
  if (!perShot.length) return null;

  const yawValues = perShot.map(s => s.yawSlope);
  const pitchValues = perShot.map(s => s.pitchSlope);
  const magValues = perShot.map(s => Math.hypot(s.yawSlope, s.pitchSlope));
  const yawMed = median(yawValues);
  const pitchMed = median(pitchValues);
  const yawMad = mad(yawValues, yawMed);
  const pitchMad = mad(pitchValues, pitchMed);
  const magMed = median(magValues);
  const magMad = mad(magValues, magMed);

  const limitYaw = yawMad === 0 ? Infinity : opts.maxMadMultiplier * yawMad;
  const limitPitch = pitchMad === 0 ? Infinity : opts.maxMadMultiplier * pitchMad;
  const limitMag = magMad === 0 ? Infinity : opts.maxMadMultiplier * magMad;

  const used = perShot.filter(s =>
    Math.abs(s.yawSlope - yawMed) <= limitYaw &&
    Math.abs(s.pitchSlope - pitchMed) <= limitPitch &&
    Math.abs(Math.hypot(s.yawSlope, s.pitchSlope) - magMed) <= limitMag
  );
  const usedSlopes = used.length ? used : perShot;

  const usedYaw = usedSlopes.map(s => s.yawSlope);
  const usedPitch = usedSlopes.map(s => s.pitchSlope);
  const usedDuration = usedSlopes.map(s => s.duration);

  const yawSlope = median(usedYaw);
  const pitchSlope = median(usedPitch);
  const duration = Math.max(opts.minDurationSeconds, median(usedDuration));
  const amplitude = Math.hypot(yawSlope, pitchSlope) * duration;

  return {
    yawSlope,
    pitchSlope,
    amplitude,
    duration,
    hasDrift: amplitude >= opts.amplitudeThreshold,
    method: 'session_hold_linear',
    shotCount: shots.length,
    usedShots: usedSlopes.length,
    perShot,
    usedSlopes
  };
}

export function applySessionDriftToShot(
  shot: ShotData,
  drift: SessionDriftEstimate | null,
  options: SessionDriftOptions = {}
): ShotData {
  if (!drift || !Array.isArray(shot.pitch) || !Array.isArray(shot.yaw)) {
    return cloneShotBase(shot);
  }
  const opts: Required<SessionDriftOptions> = {
    marginSeconds: options.marginSeconds ?? 0.15,
    minDurationSeconds: options.minDurationSeconds ?? 0.2,
    amplitudeThreshold: options.amplitudeThreshold ?? 0.8,
    maxMadMultiplier: options.maxMadMultiplier ?? 3
  };
  const fs = shot.sample_rate ?? 400;
  const hold = typeof shot.hold_index === 'number' ? shot.hold_index : 0;
  const maxIdx = Math.min(shot.pitch.length, shot.yaw.length) - 1;
  const pull = typeof shot.pull_index === 'number'
    ? Math.min(shot.pull_index, maxIdx)
    : Math.min(shot.shot_index ?? maxIdx, maxIdx);
  const margin = Math.max(0, Math.round(opts.marginSeconds * fs));
  const end = Math.max(hold + 2, pull - margin);
  const tMid = (hold + end) / 2 / fs;
  const adjust = (arr: number[], slope: number) => arr.map((val, idx) => val - slope * (idx / fs - tMid));
  const base = cloneShotBase(shot);
  return {
    ...base,
    pitch: adjust(base.pitch, drift.pitchSlope),
    yaw: adjust(base.yaw, drift.yawSlope),
    drift_correction: {
      method: drift.method,
      yawSlope: drift.yawSlope,
      pitchSlope: drift.pitchSlope,
      anchorSeconds: tMid
    }
  };
}

/** Convert degrees to Minutes of Angle (MOA). */
export function degToMoa(deg: number): number {
  return deg * 60;
}

/** Convert Minutes of Angle (MOA) to degrees. */
export function moaToDeg(moa: number): number {
  return moa / 60;
}

/** Size of one MOA in millimetres for the ISSF 10m pistol target. */
export const MM_PER_MOA_10M = 200 / 68.75;

/** Default aiming radius (12 cm) used to detect the start of the hold. */
export const AIMING_START_RADIUS_MM = 120;
export const AIMING_START_RADIUS_MOA = AIMING_START_RADIUS_MM / MM_PER_MOA_10M;

const CHI_SQUARE_2D_95 = 5.991; // 95 % confidence interval for 2 degrees of freedom

function parseSeconds(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const str = String(value).trim();
  if (!str) return null;
  const numeric = Number(str.replace(/[^0-9.+-Ee]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function computeHoldEllipse(
  relPitch: number[],
  relYaw: number[],
  start: number,
  end: number,
  mmPerMoa = MM_PER_MOA_10M
): HoldEllipse | null {
  const coords: [number, number][] = [];
  for (let i = start; i <= end; i++) {
    if (i < 0 || i >= relPitch.length || i >= relYaw.length) continue;
    coords.push([relYaw[i], relPitch[i]]);
  }
  if (coords.length < 3) return null;
  let meanX = 0;
  let meanY = 0;
  coords.forEach(([x, y]) => {
    meanX += x;
    meanY += y;
  });
  meanX /= coords.length;
  meanY /= coords.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  coords.forEach(([x, y]) => {
    const dx = x - meanX;
    const dy = y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  });
  sxx /= coords.length - 1;
  syy /= coords.length - 1;
  sxy /= coords.length - 1;
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  if (!Number.isFinite(trace) || !Number.isFinite(det) || det < 0) return null;
  const term = Math.sqrt(Math.max(0, (sxx - syy) * (sxx - syy) + 4 * sxy * sxy));
  const lambda1 = (trace + term) / 2;
  const lambda2 = (trace - term) / 2;
  const scale = Math.sqrt(CHI_SQUARE_2D_95);
  const majorMoa = Math.sqrt(Math.max(lambda1, 0)) * scale;
  const minorMoa = Math.sqrt(Math.max(lambda2, 0)) * scale;
  let angle = 0;
  if (sxy !== 0) {
    angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  } else if (sxx >= syy) {
    angle = 0;
  } else {
    angle = Math.PI / 2;
  }
  const majorMm = moaToMm(majorMoa, mmPerMoa);
  const minorMm = moaToMm(minorMoa, mmPerMoa);
  const area = Math.PI * majorMm * minorMm;
  return {
    major_moa: majorMoa,
    minor_moa: minorMoa,
    angle_deg: angle * (180 / Math.PI),
    area_mm2: Number.isFinite(area) ? area : 0
  };
}

function computeAxisSd(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Convert MOA to millimetres. */
export function moaToMm(moa: number, mmPerMoa = MM_PER_MOA_10M): number {
  return moa * mmPerMoa;
}

/** Convert millimetres to MOA. */
export function mmToMoa(mm: number, mmPerMoa = MM_PER_MOA_10M): number {
  return mm / mmPerMoa;
}

/** Ring radii (10 to 1) for ISSF 10m pistol target in millimetres. */
export const RING_RADII_MM = [
  5.75, 13.75, 21.75, 29.75, 37.75,
  45.75, 53.75, 61.75, 69.75, 77.75
];

/** Ring radii in MOA corresponding to {@link RING_RADII_MM}. */
export const RING_RADII_MOA = RING_RADII_MM.map(r => mmToMoa(r));

/** Convert MOA distance from centre into ring number (10..1, 0 outside). */
export function moaToRing(moa: number): number {
  for (let i = 0; i < RING_RADII_MOA.length; i++) {
    if (moa <= RING_RADII_MOA[i]) return 10 - i;
  }
  return 0;
}

/**
 * Calculate the center of the hold based on the original
 * `getCenter` logic from `pistol.js`.
 * It averages yaw and pitch between 20% and 10% before `shot_index`.
 */
export function getHoldCenter(shot: ShotData): CenterPoint {
  const sr = shot.sample_rate ?? 400;
  const shotIdx = shot.shot_index ?? 0;
  const start = Math.max(0, shotIdx - Math.floor(0.2 * sr));
  const end = Math.max(start + 1, shotIdx - Math.floor(0.1 * sr));
  let yawSum = 0;
  let pitchSum = 0;
  let count = 0;
  for (let i = start; i < end && i < shot.pitch.length && i < shot.yaw.length; i++) {
    yawSum += shot.yaw[i];
    pitchSum += shot.pitch[i];
    count++;
  }
  return {
    yaw: count ? yawSum / count : 0,
    pitch: count ? pitchSum / count : 0
  };
}

/**
 * Convert absolute pitch and yaw to values relative to the hold center
 * and expressed in MOA.
 */
export function relativeMoaArrays(shot: ShotData, center?: CenterPoint): { rel_pitch: number[]; rel_yaw: number[] } {
  const c = center ?? getHoldCenter(shot);
  const relPitch = shot.pitch.map(p => degToMoa(p - c.pitch));
  const relYaw = shot.yaw.map(y => degToMoa(y - c.yaw));
  return { rel_pitch: relPitch, rel_yaw: relYaw };
}

/**
 * Find the latest index before `shot_index` that is more than
 * `thresholdMoa` away from the center point.
 */
export function findStartIndex(shot: ShotData, center?: CenterPoint, thresholdMoa = AIMING_START_RADIUS_MOA): number {
  const c = center ?? getHoldCenter(shot);
  const shotIdx = shot.shot_index ?? Math.min(shot.pitch.length, shot.yaw.length) - 1;
  for (let i = shotIdx; i >= 0; i--) {
    const dy = shot.yaw[i] - c.yaw;
    const dp = shot.pitch[i] - c.pitch;
    const distMoa = degToMoa(Math.hypot(dy, dp));
    if (distMoa > thresholdMoa) {
      return i;
    }
  }
  return 0;
}

/** Calculate custom pull index a given number of milliseconds before the shot. */
export function calcPullIndex(shot: ShotData, offsetMs = 250): number {
  const sr = shot.sample_rate ?? 400;
  const si = shot.shot_index ?? Math.min(shot.pitch.length, shot.yaw.length) - 1;
  const delta = Math.round((offsetMs / 1000) * sr);
  return Math.max(0, si - delta);
}

/** Calculate path length (in mm) for a range of indices. */
export function segmentLengthMm(relPitch: number[], relYaw: number[], start: number, end: number, mmPerMoa = MM_PER_MOA_10M): number {
  let len = 0;
  for (let i = start + 1; i <= end && i < relPitch.length && i < relYaw.length; i++) {
    const dp = relPitch[i] - relPitch[i - 1];
    const dy = relYaw[i] - relYaw[i - 1];
    len += Math.hypot(dp, dy);
  }
  return moaToMm(len, mmPerMoa);
}

/** Distance between two indices in mm. */
export function distanceBetweenMm(relPitch: number[], relYaw: number[], a: number, b: number, mmPerMoa = MM_PER_MOA_10M): number {
  if (a < 0 || b < 0 || a >= relPitch.length || b >= relPitch.length) return 0;
  const dp = relPitch[b] - relPitch[a];
  const dy = relYaw[b] - relYaw[a];
  return moaToMm(Math.hypot(dp, dy), mmPerMoa);
}

/** Percentage of samples within given radius MOA between two indices. */
export function percentWithinMoa(relPitch: number[], relYaw: number[], start: number, end: number, radiusMoa: number): number {
  let total = 0;
  let inside = 0;
  for (let i = start; i <= end && i < relPitch.length && i < relYaw.length; i++) {
    total++;
    const dist = Math.hypot(relPitch[i], relYaw[i]);
    if (dist <= radiusMoa) inside++;
  }
  return total ? inside / total : 0;
}

/** Compute horizontal and vertical speed arrays in mm/s. */
export function speedArraysMm(relPitch: number[], relYaw: number[], sr: number, mmPerMoa = MM_PER_MOA_10M): { pitch: number[]; yaw: number[] } {
  const n = Math.min(relPitch.length, relYaw.length);
  const sp: number[] = new Array(n).fill(0);
  const sy: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    sp[i] = (relPitch[i] - relPitch[i - 1]) * mmPerMoa * sr;
    sy[i] = (relYaw[i] - relYaw[i - 1]) * mmPerMoa * sr;
  }
  return { pitch: sp, yaw: sy };
}

/** Compute absolute deviation array (MOA) from relative pitch/yaw arrays. */
export function absDeviationArray(relPitch: number[], relYaw: number[]): number[] {
  const n = Math.min(relPitch.length, relYaw.length);
  const arr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) arr[i] = Math.hypot(relPitch[i], relYaw[i]);
  return arr;
}

/** Compute absolute speed array (mm/s) from horizontal and vertical speeds. */
export function absSpeedArray(speedPitch: number[], speedYaw: number[]): number[] {
  const n = Math.min(speedPitch.length, speedYaw.length);
  const arr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) arr[i] = Math.hypot(speedPitch[i], speedYaw[i]);
  return arr;
}

/**
 * Preprocess a shot into relative MOA arrays and scalar metrics. Heavy
 * transforms used only for visualization are skipped.
 */
export function preprocessShot<T extends ShotData>(shot: T): PreprocessedShot {
  const center = getHoldCenter(shot);
  const { rel_pitch, rel_yaw } = relativeMoaArrays(shot, center);
  const start_index = findStartIndex(shot, center);
  const sr = shot.sample_rate ?? 400;
  const shot_index = shot.shot_index ?? Math.min(shot.pitch.length, shot.yaw.length) - 1;
  const pre_shot_1s_index = Math.max(0, shot_index - sr);
  const pull_index_calc = calcPullIndex(shot);
  const length_1s = segmentLengthMm(rel_pitch, rel_yaw, pre_shot_1s_index, shot_index);
  const delta_pull = distanceBetweenMm(rel_pitch, rel_yaw, pull_index_calc, shot_index);
  const percent_10 = percentWithinMoa(rel_pitch, rel_yaw, start_index, shot_index, 1.98);
  const holdSamples = Math.max(pull_index_calc - start_index, 0);
  const hold_duration_s = holdSamples > 0 ? holdSamples / sr : 0;
  const trigger_hold_s = parseSeconds((shot as any).trigger_hold);
  const trigger_pull_s = parseSeconds((shot as any).trigger_pull);
  const split_s = parseSeconds((shot as any).split);
  const score_numeric = parseScore((shot as any).score);
  const impact_pitch_moa = rel_pitch[shot_index] ?? 0;
  const impact_yaw_moa = rel_yaw[shot_index] ?? 0;
  const impact_pitch_mm = moaToMm(impact_pitch_moa);
  const impact_yaw_mm = moaToMm(impact_yaw_moa);
  const postShotSamples = Math.round(0.5 * sr);
  const postShotStart = shot_index + 1;
  const postShotEnd = postShotStart + postShotSamples - 1;
  const hasPostShotWindow = postShotEnd < rel_pitch.length && postShotEnd < rel_yaw.length;
  let post_shot_stability_500ms_mm: number | null = null;
  if (hasPostShotWindow) {
    const postPitchMm = rel_pitch.slice(postShotStart, postShotEnd + 1).map(value => moaToMm(value));
    const postYawMm = rel_yaw.slice(postShotStart, postShotEnd + 1).map(value => moaToMm(value));
    const pitchSd = computeAxisSd(postPitchMm);
    const yawSd = computeAxisSd(postYawMm);
    if (pitchSd !== null && yawSd !== null) {
      post_shot_stability_500ms_mm = Math.hypot(pitchSd, yawSd);
    }
  }
  const hold_ellipse = computeHoldEllipse(rel_pitch, rel_yaw, start_index, shot_index);
  const ellipse_major_moa = hold_ellipse ? hold_ellipse.major_moa : null;
  const ellipse_minor_moa = hold_ellipse ? hold_ellipse.minor_moa : null;
  const ellipse_major_mm = hold_ellipse ? moaToMm(hold_ellipse.major_moa) : null;
  const ellipse_minor_mm = hold_ellipse ? moaToMm(hold_ellipse.minor_moa) : null;
  const ellipse_angle_deg = hold_ellipse ? hold_ellipse.angle_deg : null;
  const ellipse_area_mm2 = hold_ellipse ? hold_ellipse.area_mm2 : null;
  return {
    ...shot,
    center,
    rel_pitch_moa: rel_pitch,
    rel_yaw_moa: rel_yaw,
    start_index,
    pre_shot_1s_index,
    pull_index_calc,
    length_1s,
    delta_pull,
    percent_10,
    hold_duration_s,
    trigger_hold_s,
    trigger_pull_s,
    split_s,
    score_numeric,
    impact_pitch_moa,
    impact_yaw_moa,
    impact_pitch_mm,
    impact_yaw_mm,
    post_shot_stability_500ms_mm,
    session_elapsed_s: null,
    hold_ellipse,
    ellipse_major_moa,
    ellipse_minor_moa,
    ellipse_major_mm,
    ellipse_minor_mm,
    ellipse_angle_deg,
    ellipse_area_mm2
  } as PreprocessedShot;
}

/**
 * Adds session-level timing context that depends on shot order.
 */
export function addSessionElapsedTimes<T extends PreprocessedShot>(shots: T[]): T[] {
  let elapsed = 0;
  let valid = true;
  return shots.map((shot, index) => {
    const split = typeof shot.split_s === 'number' && Number.isFinite(shot.split_s) ? shot.split_s : null;
    if (index > 0) {
      if (split === null) {
        valid = false;
      } else if (valid) {
        elapsed += split;
      }
    }
    const sessionElapsed = valid ? elapsed : null;
    return {
      ...shot,
      session_elapsed_s: sessionElapsed
    };
  });
}

/**
 * Fully process a shot by calculating the hold center, converting
 * to relative MOA values and determining the start index.
 */
export function processShot<T extends ShotData>(shot: T): ProcessedShot {
  const base = preprocessShot(shot);
  const { rel_pitch_moa: rel_pitch, rel_yaw_moa: rel_yaw } = base;
  const sr = shot.sample_rate ?? 400;
  const { pitch: speed_pitch_mm_s, yaw: speed_yaw_mm_s } = speedArraysMm(rel_pitch, rel_yaw, sr);
  const abs_deviation_moa = absDeviationArray(rel_pitch, rel_yaw);
  const abs_speed_mm_s = absSpeedArray(speed_pitch_mm_s, speed_yaw_mm_s);
  const ring_position = abs_deviation_moa.map(moaToRing);
  return {
    ...base,
    abs_deviation_moa,
    abs_speed_mm_s,
    ring_position,
    speed_pitch_mm_s,
    speed_yaw_mm_s
  } as ProcessedShot;
}

export default {
  degToMoa,
  moaToDeg,
  moaToMm,
  mmToMoa,
  getHoldCenter,
  relativeMoaArrays,
  findStartIndex,
  calcPullIndex,
  segmentLengthMm,
  distanceBetweenMm,
  percentWithinMoa,
  speedArraysMm,
  absDeviationArray,
  absSpeedArray,
  moaToRing,
  preprocessShot,
  addSessionElapsedTimes,
  processShot
};
