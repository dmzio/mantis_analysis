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
  rel_pitch_moa: number[];
  rel_yaw_moa: number[];
  start_index: number;
  pre_shot_1s_index: number;
}

/** Convert degrees to Minutes of Angle (MOA). */
export function degToMoa(deg: number): number {
  return deg * 60;
}

/** Convert Minutes of Angle (MOA) to degrees. */
export function moaToDeg(moa: number): number {
  return moa / 60;
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
  return Object.assign(shot, {
    center,
    rel_pitch_moa: rel_pitch,
    rel_yaw_moa: rel_yaw,
    start_index,
    pre_shot_1s_index
  });
}

export default {
  degToMoa,
  moaToDeg,
  getHoldCenter,
  relativeMoaArrays,
  findStartIndex,
  processShot
};

