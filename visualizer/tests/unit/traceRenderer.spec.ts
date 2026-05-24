import { describe, it, expect } from 'vitest';
import { buildTraceScene, computeSegmentCounts } from '../../src/traceRenderer';
import type { ShotData } from '../../src/traceUtils';

describe('traceRenderer helpers', () => {
  it('creates typed buffers with scaled coordinates', () => {
    const shots: ShotData[] = [{
      pitch: [0, 0.5, 1],
      yaw: [0, -0.5, -1],
      pull_index: 1,
      shot_index: 2,
      sample_rate: 200
    }];
    const scene = buildTraceScene(shots, { size: 200, scale: v => v * 10 });
    expect(scene.shots).toHaveLength(1);
    const shot = scene.shots[0];
    expect(shot.hold.coords.length).toBeGreaterThan(0);
    expect(shot.pullMarker).not.toBeNull();
    expect(scene.maxDuration).toBeGreaterThan(0);
  });

  it('computes visible segment counts based on elapsed time', () => {
    const shots: ShotData[] = [{
      pitch: [0, 0, 0, 0],
      yaw: [0, 0.2, 0.4, 0.6],
      pull_index: 1,
      shot_index: 2,
      sample_rate: 100
    }];
    const scene = buildTraceScene(shots, { size: 200, scale: v => v });
    const shot = scene.shots[0];
    const startCounts = computeSegmentCounts(shot, 0);
    expect(startCounts.hold).toBe(1);
    const laterCounts = computeSegmentCounts(shot, shot.holdMs + shot.pullMs);
    expect(laterCounts.pull).toBeGreaterThanOrEqual(1);
    expect(laterCounts.showShotMark).toBe(true);
  });
});
