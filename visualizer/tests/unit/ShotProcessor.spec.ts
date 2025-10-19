import { describe, it, expect } from 'vitest';
import {
  degToMoa,
  moaToDeg,
  getHoldCenter,
  relativeMoaArrays,
  findStartIndex,
  processShot,
  preprocessShot,
  calcPullIndex,
  segmentLengthMm,
  distanceBetweenMm,
  percentWithinMoa,
  speedArraysMm,
  absDeviationArray,
  absSpeedArray,
  moaToRing,
  MM_PER_MOA_10M
} from '../../src/shotProcessor';

const sampleShot = {
  pitch: [1, 1.1, 1.2, 1.3, 1.4],
  yaw: [2, 2.1, 2.2, 2.3, 2.4],
  shot_index: 4,
  sample_rate: 10
};

describe('shotProcessor', () => {
  it('converts degrees to MOA and back', () => {
    expect(moaToDeg(degToMoa(1))).toBeCloseTo(1);
  });

  it('computes hold center', () => {
    const c = getHoldCenter(sampleShot);
    expect(c.pitch).toBeCloseTo(1.2);
    expect(c.yaw).toBeCloseTo(2.2);
  });

  it('creates relative arrays in MOA', () => {
    const c = getHoldCenter(sampleShot);
    const rel = relativeMoaArrays(sampleShot, c);
    expect(rel.rel_pitch[0]).toBeCloseTo(degToMoa(sampleShot.pitch[0] - c.pitch));
    expect(rel.rel_yaw[0]).toBeCloseTo(degToMoa(sampleShot.yaw[0] - c.yaw));
  });

  it('finds start index over threshold', () => {
    const shot = {
      pitch: [5, 4, 3, 2, 1],
      yaw: [0, 0, 0, 0, 0],
      shot_index: 4,
      sample_rate: 1
    };
    const start = findStartIndex(shot, { pitch: 1, yaw: 0 }, 60);
    expect(start).toBe(2);
  });

  it('computes pre-shot index', () => {
    const shot = {
      pitch: [0,0,0],
      yaw: [0,0,0],
      shot_index: 2,
      sample_rate: 1
    };
    const proc = processShot(shot as any);
    expect(proc.pre_shot_1s_index).toBe(1);
  });

  it('derives timing metrics and ellipse', () => {
    const shot = {
      pitch: [0, 0.01, 0.02, 0.03, 0.04, 0.05],
      yaw: [0, 0.02, 0.01, 0, -0.01, -0.02],
      shot_index: 4,
      sample_rate: 10,
      trigger_hold: '0.20',
      trigger_pull: '0.08',
      split: '1.50',
      score: '95.0'
    };
    const pre = preprocessShot(shot as any);
    expect(pre.hold_duration_s).toBeGreaterThan(0);
    expect(pre.trigger_hold_s).toBeCloseTo(0.2);
    expect(pre.trigger_pull_s).toBeCloseTo(0.08);
    expect(pre.split_s).toBeCloseTo(1.5);
    expect(pre.score_numeric).toBeCloseTo(95);
    expect(pre.impact_pitch_mm).not.toBeNaN();
    if (pre.hold_ellipse) {
      expect(pre.ellipse_area_mm2).toBeGreaterThan(0);
      expect(pre.ellipse_major_mm).toBeGreaterThan(0);
    }
  });

  it('derives extra metrics', () => {
    const shot = {
      pitch: [0,0,0,0],
      yaw: [0,0.5,1,1.5],
      shot_index: 3,
      sample_rate: 4
    };
    const pull = calcPullIndex(shot as any);
    expect(pull).toBe(2);
    const len = segmentLengthMm([0,0.5,1,1.5], [0,0,0,0], 0, 3, MM_PER_MOA_10M);
    expect(len).toBeCloseTo(1.5 * MM_PER_MOA_10M, 5);
    const dist = distanceBetweenMm([0,0,0,0], [0,0.5,1,1.5], 2, 3, MM_PER_MOA_10M);
    expect(dist).toBeCloseTo(0.5 * MM_PER_MOA_10M, 5);
    const pct = percentWithinMoa([0,0,0,0], [0,0.5,1,1.5], 0, 3, 1.98);
    expect(pct).toBeCloseTo(1);
    const speeds = speedArraysMm([0,0,0,0], [0,0.5,1,1.5], 4, MM_PER_MOA_10M);
    expect(speeds.yaw[1]).toBeCloseTo(0.5 * MM_PER_MOA_10M * 4);
    const absDev = absDeviationArray([0,1,2], [0,0,0]);
    expect(absDev[2]).toBeCloseTo(2);
    const absSpd = absSpeedArray([0,1,2], [0,0,0]);
    expect(absSpd[2]).toBeCloseTo(2);
    expect(moaToRing(1.9)).toBe(10);
    expect(moaToRing(6)).toBeLessThan(10);
  });
});
