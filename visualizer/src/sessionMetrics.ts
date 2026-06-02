import { aggregateFields } from './sessionAggregates';

export interface SessionMetricDefinition {
  /** Unique key used for UI bindings. */
  key: string;
  /** Field name from processed shot data. */
  field: string;
  /** Display label for cards and tables. */
  label: string;
  /** Axis title for charts. */
  axisLabel: string;
  /** Decimal precision for rendering values. */
  decimals: number;
  /** Optional minimum value clamp when building ranges. */
  min?: number;
  /** Optional maximum value clamp when building ranges. */
  max?: number;
  /** Unit scaling applied to mean and standard deviation. */
  scale?: number;
  /** Preferred column width for tabular layouts. */
  columnWidth?: string;
}

export interface SessionMetricStats {
  mean: number | null;
  sd: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
}

/** Describes the default session-level metrics derived from shot data. */
export const SESSION_METRICS: SessionMetricDefinition[] = [
  {
    key: 'percent10',
    field: 'percent_10',
    label: '∈10 (%)',
    axisLabel: '% in 10',
    decimals: 1,
    min: 0,
    max: 100,
    scale: 100,
    columnWidth: '5.75rem'
  },
  {
    key: 'hold',
    field: 'hold_duration_s',
    label: 'Hold (s)',
    axisLabel: 'Seconds',
    decimals: 2,
    min: 0,
    columnWidth: '5.75rem'
  },
  {
    key: 'split',
    field: 'split_s',
    label: 'Split (s)',
    axisLabel: 'Seconds',
    decimals: 2,
    min: 0,
    columnWidth: '5.75rem'
  },
  {
    key: 'length1s',
    field: 'length_1s',
    label: 'L₁s (mm)',
    axisLabel: 'mm',
    decimals: 1,
    min: 0,
    columnWidth: '5.75rem'
  },
  {
    key: 'deltaPull',
    field: 'delta_pull',
    label: 'Δpull (mm)',
    axisLabel: 'mm',
    decimals: 1,
    min: 0,
    columnWidth: '6rem'
  },
  {
    key: 'postShotMax',
    field: 'post_shot_max_excursion_500ms_mm',
    label: 'Post max (mm)',
    axisLabel: 'mm',
    decimals: 1,
    min: 0,
    columnWidth: '7rem'
  }
];

/**
 * Compute per-session mean and standard deviation values for the configured metrics.
 * Scaling is applied before the result is returned so callers can present the values directly.
 */
export function computeSessionMetrics(shots: any[]): Record<string, SessionMetricStats> {
  if (!Array.isArray(shots) || !shots.length) {
    return {};
  }
  const fields = SESSION_METRICS.map(metric => metric.field);
  const raw = aggregateFields(shots, fields);
  const stats: Record<string, SessionMetricStats> = {};
  SESSION_METRICS.forEach(metric => {
    const entry = raw[metric.field];
    if (!entry) {
      return;
    }
    const scale = metric.scale ?? 1;
    stats[metric.key] = {
      mean: entry.mean * scale,
      sd: entry.sd * scale,
      median: entry.median * scale,
      q1: entry.q1 * scale,
      q3: entry.q3 * scale
    };
  });
  return stats;
}

/**
 * Format a metric value for display, returning `null` when the input cannot be represented.
 */
export function formatMetricValue(value: number | null | undefined, decimals: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(decimals);
}
