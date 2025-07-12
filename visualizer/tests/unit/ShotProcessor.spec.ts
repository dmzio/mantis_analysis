import { describe, it, expect } from 'vitest';
import { degToMoa, moaToDeg, getHoldCenter, relativeMoaArrays, findStartIndex, processShot } from '../../src/shotProcessor';

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
});
