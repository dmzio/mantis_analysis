import { describe, it, expect, beforeEach } from 'vitest';
import store from '../../src/store';
import { clearSessionData, getProcessedShotVariants, getProcessedShots } from '../../src/sessionData';
import { clearCachedSessions, loadCachedData, replaceCachedData } from '../../src/db/cacheDb';
import { hydrateStoreFromCache, resetCacheHydration } from '../../src/cacheBootstrap';

describe('cache bootstrap', () => {
  beforeEach(async () => {
    store.sessions = {};
    store.aggregates = {};
    clearSessionData();
    resetCacheHydration();
    await clearCachedSessions();
  });

  it('persists and hydrates session metadata and processed shot variants', async () => {
    const meta = { pk: 1, ready: true, shot_count: 1, metrics: { hold: { mean: 1, sd: 0 } } };
    const variants = {
      original: [{ pk: 11, pitch: [0], yaw: [0], delta_pull: 1 }],
      corrected: [{ pk: 11, pitch: [0], yaw: [0], delta_pull: 2 }],
      drift: null
    };
    await replaceCachedData([{ pk: 1, meta }], [{ pk: 1, shots: variants }]);
    await hydrateStoreFromCache();
    expect(store.sessions[1]).toBeTruthy();
    expect(store.sessions[1].ready).toBe(true);
    expect(getProcessedShots(1).length).toBe(1);
    expect(getProcessedShotVariants(1)?.corrected[0].delta_pull).toBe(2);
  });

  it('clears cached data', async () => {
    await replaceCachedData(
      [{ pk: 2, meta: { pk: 2, ready: false } }],
      [{ pk: 2, shots: [] }]
    );
    await clearCachedSessions();
    const data = await loadCachedData();
    expect(data.sessions.length).toBe(0);
    expect(data.shots.length).toBe(0);
    expect(data.manifest).toBeNull();
  });
});
