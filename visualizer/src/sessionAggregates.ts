export interface SeriesPoint { x: number; mean: number; sd: number; }
export interface ScatterPoint {
  x: number;
  y: number;
  shotIndex: number;
  shotPk?: number;
  score: number | null;
  elapsedS: number | null;
}

export interface BucketPoint {
  bucketIndex: number;
  startS: number;
  endS: number;
  label: string;
  count: number;
  median: number;
  q1: number;
  q3: number;
}

/** Compute mean and standard deviation for a set of numbers. */
function meanSd(values: number[]): { mean: number; sd: number } {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
  return { mean, sd };
}

function quantile(sortedValues: number[], q: number): number {
  if (!sortedValues.length) return Number.NaN;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
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

function getFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getScoreNumber(shot: any): number | null {
  const numericScore = getFiniteNumber(shot?.score_numeric);
  if (numericScore !== null) return numericScore;
  if (typeof shot?.score === 'string' && shot.score.trim()) {
    const parsed = Number(shot.score);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function buildScatterPoints(shots: any[], xField: string, yField: string): ScatterPoint[] {
  return shots
    .map((shot, index) => {
      const x = getFiniteNumber(shot?.[xField]);
      const y = getFiniteNumber(shot?.[yField]);
      if (x === null || y === null) return null;
      return {
        x,
        y,
        shotIndex: index + 1,
        shotPk: typeof shot?.pk === 'number' ? shot.pk : undefined,
        score: getScoreNumber(shot),
        elapsedS: getFiniteNumber(shot?.session_elapsed_s)
      } as ScatterPoint;
    })
    .filter((point): point is ScatterPoint => point !== null);
}

export function bucketMetricByElapsedTime(
  shots: any[],
  valueField: string,
  bucketSizeS = 300
): BucketPoint[] {
  const buckets = new Map<number, number[]>();
  shots.forEach(shot => {
    const elapsed = getFiniteNumber(shot?.session_elapsed_s);
    const value = getFiniteNumber(shot?.[valueField]);
    if (elapsed === null || value === null) return;
    const bucketIndex = Math.floor(elapsed / bucketSizeS);
    const bucket = buckets.get(bucketIndex) ?? [];
    bucket.push(value);
    buckets.set(bucketIndex, bucket);
  });
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucketIndex, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const startS = bucketIndex * bucketSizeS;
      const endS = startS + bucketSizeS;
      return {
        bucketIndex,
        startS,
        endS,
        label: `${Math.round(startS / 60)}-${Math.round(endS / 60)} min`,
        count: sorted.length,
        median: quantile(sorted, 0.5),
        q1: quantile(sorted, 0.25),
        q3: quantile(sorted, 0.75)
      };
    });
}
