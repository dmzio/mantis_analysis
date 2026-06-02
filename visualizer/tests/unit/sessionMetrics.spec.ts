import { describe, it, expect } from 'vitest';
import { computeSessionMetrics, formatMetricValue, SESSION_METRICS } from '../../src/sessionMetrics';

describe('sessionMetrics', () => {
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
