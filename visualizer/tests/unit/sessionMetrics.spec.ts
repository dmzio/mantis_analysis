import { describe, it, expect } from 'vitest';
import { computeMeanPullVector, computeSessionMetrics, formatMetricValue, SESSION_METRICS } from '../../src/sessionMetrics';

describe('sessionMetrics', () => {
  it('computes a mean pull vector from finite shot components', () => {
    const vector = computeMeanPullVector([
      { delta_pull_x_mm: 3, delta_pull_y_mm: 4 },
      { delta_pull_x_mm: 9, delta_pull_y_mm: -2 },
      { delta_pull_x_mm: null, delta_pull_y_mm: 20 },
      { delta_pull_x_mm: 50, delta_pull_y_mm: Number.NaN }
    ]);

    expect(vector).not.toBeNull();
    expect(vector?.xMm).toBeCloseTo(6);
    expect(vector?.yMm).toBeCloseTo(1);
    expect(vector?.magnitudeMm).toBeCloseTo(Math.hypot(6, 1));
    expect(vector?.angleDeg).toBeCloseTo((Math.atan2(1, 6) * 180) / Math.PI);
    expect(vector?.shotCount).toBe(2);
  });

  it('attaches mean pull vector summaries to session metrics', () => {
    const metrics = computeSessionMetrics([
      { percent_10: 0.5, delta_pull_x_mm: -4, delta_pull_y_mm: 2 },
      { percent_10: 1, delta_pull_x_mm: -8, delta_pull_y_mm: 4 }
    ]);

    expect(metrics.meanPullVector.xMm).toBeCloseTo(-6);
    expect(metrics.meanPullVector.yMm).toBeCloseTo(3);
    expect(metrics.meanPullVector.magnitudeMm).toBeCloseTo(Math.hypot(-6, 3));
  });

  it('computes scaled means and deviations', () => {
    const shots = [
      { percent_10: 0.4, hold_duration_s: 1, split_s: 0.6, length_1s: 12, delta_pull: 4, post_shot_max_excursion_500ms_mm: 10 },
      { percent_10: 0.6, hold_duration_s: 1.2, split_s: 0.9, length_1s: 14, delta_pull: 6, post_shot_max_excursion_500ms_mm: 20 },
      { percent_10: 0.8, hold_duration_s: 1.4, split_s: 1.2, length_1s: 16, delta_pull: 100, post_shot_max_excursion_500ms_mm: 30 }
    ];
    const metrics = computeSessionMetrics(shots);
    expect(metrics.percent10.mean).toBeCloseTo(60);
    expect(metrics.percent10.median).toBeCloseTo(60);
    expect(metrics.percent10.q1).toBeCloseTo(50);
    expect(metrics.percent10.q3).toBeCloseTo(70);
    expect(metrics.hold.mean).toBeCloseTo(1.2);
    expect(metrics.length1s.sd).toBeCloseTo(Math.sqrt(8 / 3));
    expect(metrics.deltaPull.median).toBeCloseTo(6);
    expect(metrics.postShotMax.mean).toBeCloseTo(20);
  });

  it('formats values with proper precision', () => {
    const percentMetric = SESSION_METRICS.find(m => m.key === 'percent10')!;
    expect(formatMetricValue(52.345, percentMetric.decimals)).toBe('52.3');
    expect(formatMetricValue(null, percentMetric.decimals)).toBeNull();
    expect(formatMetricValue(Number.NaN, percentMetric.decimals)).toBeNull();
  });
});
