import { beforeEach, describe, expect, it } from 'vitest';
import {
  recordPerf,
  measureAsync,
  usePerfMetrics,
  resetPerfMetrics
} from '../../src/perfMetrics';

describe('perfMetrics', () => {
  beforeEach(() => {
    resetPerfMetrics();
  });

  it('aggregates repeated labels', () => {
    const perf = usePerfMetrics();
    recordPerf('phase', 10, { sid: 1 });
    recordPerf('phase', 20);
    expect(perf.events.length).toBe(2);
    const summary = perf.summary.phase;
    expect(summary.count).toBe(2);
    expect(summary.totalMs).toBeCloseTo(30);
    expect(summary.minMs).toBe(10);
    expect(summary.maxMs).toBe(20);
  });

  it('measureAsync records time when the task resolves', async () => {
    const perf = usePerfMetrics();
    const result = await measureAsync('task', async () => 42, () => ({ note: 'ok' }));
    expect(result).toBe(42);
    expect(perf.summary.task.count).toBe(1);
    expect(perf.events[0].meta?.note).toBe('ok');
  });

  it('measureAsync records time when the task rejects', async () => {
    const perf = usePerfMetrics();
    await expect(
      measureAsync('task', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(perf.summary.task.count).toBe(1);
    expect(perf.events[0].label).toBe('task');
  });
});
