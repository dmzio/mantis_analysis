import { describe, it, expect } from 'vitest';
import { computeSessionMetrics, formatMetricValue, SESSION_METRICS } from '../../src/sessionMetrics';

describe('sessionMetrics', () => {
  it('computes scaled means and deviations', () => {
    const shots = [
      { percent_10: 0.4, hold_duration_s: 1, split_s: 0.6, length_1s: 12, delta_pull: 4 },
      { percent_10: 0.6, hold_duration_s: 1.2, split_s: 0.9, length_1s: 14, delta_pull: 6 }
    ];
    const metrics = computeSessionMetrics(shots);
    expect(metrics.percent10.mean).toBeCloseTo(50);
    expect(metrics.percent10.sd).toBeCloseTo(10);
    expect(metrics.hold.mean).toBeCloseTo(1.1);
    expect(metrics.length1s.sd).toBeCloseTo(1);
  });

  it('formats values with proper precision', () => {
    const percentMetric = SESSION_METRICS.find(m => m.key === 'percent10')!;
    expect(formatMetricValue(52.345, percentMetric.decimals)).toBe('52.3');
    expect(formatMetricValue(null, percentMetric.decimals)).toBeNull();
    expect(formatMetricValue(Number.NaN, percentMetric.decimals)).toBeNull();
  });
});
