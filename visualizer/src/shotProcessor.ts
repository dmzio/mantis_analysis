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

export interface ProcessedShot extends ShotData {
  center: CenterPoint;
  rel_pitch_moa: Float32Array;
  rel_yaw_moa: Float32Array;
  abs_deviation_moa: Float32Array;
  abs_speed_mm_s: Float32Array;
  ring_position?: Uint8Array;
  start_index: number;
  pre_shot_1s_index: number;
  pull_index_calc: number;
  length_1s: number;
  delta_pull: number;
  percent_10: number;
  speed_pitch_mm_s: Float32Array;
  speed_yaw_mm_s: Float32Array;
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

/** Downsample a numeric array by taking every `factor`-th value. */
export function downsampleFloat32(data: number[] | Float32Array, factor = 5): Float32Array {
  const len = Math.ceil(data.length / factor);
  const out = new Float32Array(len);
  for (let i = 0, j = 0; i < len; i++, j += factor) {
    out[i] = data[j];
  }
  return out;
}

/** Compute ring positions lazily from absolute deviation values. */
export function ringPositionArray(absDev: Float32Array): Uint8Array {
  const out = new Uint8Array(absDev.length);
  for (let i = 0; i < absDev.length; i++) out[i] = moaToRing(absDev[i]);
  return out;
}

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
export function relativeMoaArrays(shot: ShotData, center?: CenterPoint): { rel_pitch: Float32Array; rel_yaw: Float32Array } {
  const c = center ?? getHoldCenter(shot);
  const relPitch = new Float32Array(shot.pitch.length);
  const relYaw = new Float32Array(shot.yaw.length);
  for (let i = 0; i < shot.pitch.length; i++) relPitch[i] = degToMoa(shot.pitch[i] - c.pitch);
  for (let i = 0; i < shot.yaw.length; i++) relYaw[i] = degToMoa(shot.yaw[i] - c.yaw);
  return { rel_pitch: relPitch, rel_yaw: relYaw };
}

/**
 * Find the latest index before `shot_index` that is more than
 * `thresholdMoa` away from the center point.
 */
export function findStartIndex(shot: ShotData, center?: CenterPoint, thresholdMoa = 70): number {
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
export function speedArraysMm(relPitch: Float32Array, relYaw: Float32Array, sr: number, mmPerMoa = MM_PER_MOA_10M): { pitch: Float32Array; yaw: Float32Array } {
  const n = Math.min(relPitch.length, relYaw.length);
  const sp = new Float32Array(n);
  const sy = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    sp[i] = (relPitch[i] - relPitch[i - 1]) * mmPerMoa * sr;
    sy[i] = (relYaw[i] - relYaw[i - 1]) * mmPerMoa * sr;
  }
  return { pitch: sp, yaw: sy };
}

/** Compute absolute deviation array (MOA) from relative pitch/yaw arrays. */
export function absDeviationArray(relPitch: Float32Array, relYaw: Float32Array): Float32Array {
  const n = Math.min(relPitch.length, relYaw.length);
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.hypot(relPitch[i], relYaw[i]);
  return arr;
}

/** Compute absolute speed array (mm/s) from horizontal and vertical speeds. */
export function absSpeedArray(speedPitch: Float32Array, speedYaw: Float32Array): Float32Array {
  const n = Math.min(speedPitch.length, speedYaw.length);
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.hypot(speedPitch[i], speedYaw[i]);
  return arr;
}

/**
 * Fully process a shot by calculating the hold center, converting
 * to relative MOA values and determining the start index.
 */
export function processShot<T extends ShotData>(shot: T): ProcessedShot {
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
  const { pitch: speed_pitch_mm_s_f, yaw: speed_yaw_mm_s_f } = speedArraysMm(rel_pitch, rel_yaw, sr);
  const abs_deviation_moa_f = absDeviationArray(rel_pitch, rel_yaw);
  const abs_speed_mm_s_f = absSpeedArray(speed_pitch_mm_s_f, speed_yaw_mm_s_f);

  const factor = 5;
  const rel_pitch_ds = downsampleFloat32(rel_pitch, factor);
  const rel_yaw_ds = downsampleFloat32(rel_yaw, factor);
  const abs_deviation_ds = downsampleFloat32(abs_deviation_moa_f, factor);
  const abs_speed_ds = downsampleFloat32(abs_speed_mm_s_f, factor);
  const speed_pitch_ds = downsampleFloat32(speed_pitch_mm_s_f, factor);
  const speed_yaw_ds = downsampleFloat32(speed_yaw_mm_s_f, factor);

  return {
    ...shot,
    sample_rate: (shot.sample_rate ?? 400) / factor,
    center,
    rel_pitch_moa: rel_pitch_ds,
    rel_yaw_moa: rel_yaw_ds,
    abs_deviation_moa: abs_deviation_ds,
    abs_speed_mm_s: abs_speed_ds,
    start_index: Math.floor(start_index / factor),
    pre_shot_1s_index: Math.floor(pre_shot_1s_index / factor),
    pull_index_calc: Math.floor(pull_index_calc / factor),
    length_1s,
    delta_pull,
    percent_10,
    speed_pitch_mm_s: speed_pitch_ds,
    speed_yaw_mm_s: speed_yaw_ds
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
  downsampleFloat32,
  ringPositionArray,
  processShot
};

