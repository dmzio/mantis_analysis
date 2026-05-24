import * as d3 from 'd3';

export interface ShotData {
  pitch: number[];
  yaw: number[];
  hold_index?: number;
  pull_index?: number;
  shot_index?: number;
  sample_rate?: number;
  [key: string]: any;
}

export function toRelativeCoords(shot: ShotData): [number, number][] {
  const basePitch = shot.pitch[shot.hold_index ?? 0] ?? shot.pitch[0];
  const baseYaw = shot.yaw[shot.hold_index ?? 0] ?? shot.yaw[0];
  const relPitch = shot.pitch.map(p => p - basePitch);
  const relYaw = shot.yaw.map(y => y - baseYaw);
  return relPitch.map((p, i) => [relYaw[i], -p]);
}

export function makeScale(values: number[], size: number, fixedMax?: number) {
  const max = fixedMax ?? (d3.extent(values.map(Math.abs)) as [number, number])[1] ?? 0;
  const k = (size / 2) / (max + 0.1);
  return (v: number) => v * k;
}

export function splitSegments(coords: [number, number][], shot: ShotData) {
  const pullIdx = shot.pull_index ?? 0;
  const shotIdx = shot.shot_index ?? coords.length - 1;
  return {
    hold: coords.slice(0, pullIdx + 1),
    pull: coords.slice(pullIdx, shotIdx + 1),
    recoil: coords.slice(shotIdx),
    shotIdx
  };
}
