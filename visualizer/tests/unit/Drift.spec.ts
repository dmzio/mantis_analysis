import { describe, it, expect } from 'vitest';
import { estimateSessionDrift, applySessionDriftToShot, ShotData } from '../../src/shotProcessor';

function buildShot(fs: number, yawSlope: number, pitchSlope: number): ShotData {
  const n = 3 * fs;
  const yaw: number[] = [];
  const pitch: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    yaw.push(yawSlope * t);
    pitch.push(pitchSlope * t);
  }
  return {
    pitch,
    yaw,
    sample_rate: fs,
    hold_index: fs,
    pull_index: fs * 2,
    shot_index: n - 1
  };
}

function estimateSlope(shot: ShotData): { yaw: number; pitch: number } {
  const fs = shot.sample_rate ?? 400;
  const start = shot.hold_index ?? 0;
  const end = (shot.pull_index ?? start) - Math.round(0.15 * fs);
  let st = 0, sy = 0, sty = 0, stt = 0, sp = 0, stp = 0;
  const n = Math.max(0, end - start);
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    const t = idx / fs;
    const y = shot.yaw[idx];
    const p = shot.pitch[idx];
    st += t;
    sy += y;
    sty += t * y;
    stt += t * t;
    sp += p;
    stp += t * p;
  }
  const denom = n * stt - st * st || 1;
  return {
    yaw: (n * sty - st * sy) / denom,
    pitch: (n * stp - st * sp) / denom
  };
}

describe('session-level drift detection and correction', () => {
  it('detects drift while ignoring outliers', () => {
    const fs = 200;
    const shots: ShotData[] = [
      buildShot(fs, 1, -0.6),
      buildShot(fs, 1.05, -0.55),
      buildShot(fs, 0.95, -0.58),
      buildShot(fs, 1.02, -0.62),
      buildShot(fs, 4, 3) // outlier
    ];
    const drift = estimateSessionDrift(shots)!;
    expect(drift.shotCount).toBe(5);
    expect(drift.usedShots).toBeLessThan(5);
    expect(drift.hasDrift).toBe(true);
    expect(drift.yawSlope).toBeGreaterThan(0.9);
    expect(drift.pitchSlope).toBeLessThan(-0.5);
  });

  it('applies correction that removes the detected slope', () => {
    const fs = 200;
    const shot = buildShot(fs, 1, -0.5);
    const drift = estimateSessionDrift([shot])!;
    const corrected = applySessionDriftToShot(shot, drift);
    const slopes = estimateSlope(corrected);
    expect(Math.abs(slopes.yaw)).toBeLessThan(1e-6);
    expect(Math.abs(slopes.pitch)).toBeLessThan(1e-6);
  });
});
