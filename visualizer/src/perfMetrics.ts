import { shallowReactive } from 'vue';

export interface PerfEvent {
  label: string;
  durationMs: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export interface PerfSummary {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

export interface PerfState {
  events: PerfEvent[];
  summary: Record<string, PerfSummary>;
}

export type PerfMeta = Record<string, unknown>;

const EVENT_LIMIT = 200;

const perfState = shallowReactive<PerfState>({
  events: [],
  summary: {}
});

const clock =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.performance !== 'undefined' &&
  typeof globalThis.performance.now === 'function'
    ? () => globalThis.performance.now()
    : () => Date.now();

function resolveMeta(meta?: PerfMeta | (() => PerfMeta | undefined)): PerfMeta | undefined {
  if (typeof meta === 'function') {
    return meta();
  }
  return meta;
}

/** Saves a measurement sample for diagnostics and summary math. */
export function recordPerf(label: string, durationMs: number, meta?: PerfMeta): PerfEvent | null {
  if (!label || !Number.isFinite(durationMs)) {
    return null;
  }
  const event: PerfEvent = {
    label,
    durationMs,
    timestamp: clock(),
    meta
  };
  perfState.events.push(event);
  if (perfState.events.length > EVENT_LIMIT) {
    perfState.events.shift();
  }
  const summary = perfState.summary[label];
  if (summary) {
    summary.count += 1;
    summary.totalMs += durationMs;
    summary.minMs = Math.min(summary.minMs, durationMs);
    summary.maxMs = Math.max(summary.maxMs, durationMs);
  } else {
    perfState.summary[label] = {
      count: 1,
      totalMs: durationMs,
      minMs: durationMs,
      maxMs: durationMs
    };
  }
  return event;
}

/** Wraps an async task and records how long it takes. */
export async function measureAsync<T>(
  label: string,
  task: () => Promise<T> | T,
  meta?: PerfMeta | (() => PerfMeta | undefined)
): Promise<T> {
  const start = clock();
  try {
    return await task();
  } finally {
    recordPerf(label, clock() - start, resolveMeta(meta));
  }
}

/** Returns the shared in-memory metrics state. */
export function usePerfMetrics(): PerfState {
  return perfState;
}

/** Clears stored samples for tests or repeated profiling sessions. */
export function resetPerfMetrics(): void {
  perfState.events.splice(0, perfState.events.length);
  perfState.summary = {};
}

/** Returns the monotonic clock value used by the profiler. */
export function perfNow(): number {
  return clock();
}
