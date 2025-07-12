export interface SeriesPoint { x: number; mean: number; sd: number; }

/** Compute mean and standard deviation for a set of numbers. */
function meanSd(values: number[]): { mean: number; sd: number } {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  return { mean, sd };
}

/**
 * Aggregate time series data from processed shots.
 * @param shots Processed shots
 * @param field Which array field to aggregate
 * @param step Downsampling factor (sample step size)
 */
import { absDeviationArray, speedArraysMm, absSpeedArray, moaToRing } from './shotProcessor';

export function aggregateSeries(shots: any[], field: string, step = 10): SeriesPoint[] {
  if (!shots.length) return [];
  const sr = shots[0].sample_rate ?? 400;
  let minBefore = 0;
  let maxAfter = 0;
  const data = shots.map(s => {
    const start = s.start_index ?? 0;
    let arr: number[];
    if (s[field]) {
      arr = (s[field] as number[]).slice(start);
    } else if (field === 'abs_deviation_moa') {
      arr = absDeviationArray(s.rel_pitch_moa, s.rel_yaw_moa).slice(start);
    } else if (field === 'abs_speed_mm_s') {
      const sp = speedArraysMm(s.rel_pitch_moa, s.rel_yaw_moa, sr);
      arr = absSpeedArray(sp.pitch, sp.yaw).slice(start);
    } else if (field === 'ring_position') {
      arr = absDeviationArray(s.rel_pitch_moa, s.rel_yaw_moa).map(moaToRing).slice(start);
    } else {
      arr = [];
    }
    const shotIdx = (s.shot_index ?? arr.length - 1) - start;
    minBefore = Math.min(minBefore, -shotIdx);
    maxAfter = Math.max(maxAfter, arr.length - shotIdx);
    return { arr, shotIdx };
  });
  const points: SeriesPoint[] = [];
  for (let i = minBefore; i < maxAfter; i += step) {
    const values: number[] = [];
    data.forEach(d => {
      const idxStart = d.shotIdx + i;
      if (idxStart >= d.arr.length || idxStart < 0) return;
      const slice = d.arr.slice(idxStart, Math.min(idxStart + step, d.arr.length));
      if (!slice.length) return;
      const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
      values.push(avg);
    });
    if (values.length) {
      const { mean, sd } = meanSd(values);
      points.push({ x: (i + step / 2) / sr, mean, sd });
    }
  }
  return points;
}

/**
 * Aggregate simple numeric fields across shots.
 */
export function aggregateFields(shots: any[], fields: string[]): Record<string, { mean: number; sd: number }> {
  const res: Record<string, { mean: number; sd: number }> = {};
  fields.forEach(f => {
    const vals = shots.map(s => s[f]).filter((v: any) => typeof v === 'number');
    if (!vals.length) return;
    res[f] = meanSd(vals as number[]);
  });
  return res;
}
