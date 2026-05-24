import { describe, it, expect, beforeEach } from 'vitest';
import store from '../../src/store';
import { cacheProcessedShots, clearSessionData, getProcessedShots } from '../../src/sessionData';
import { persistSessionMeta, persistSessionShots, clearCachedSessions, loadCachedData } from '../../src/db/cacheDb';
import { hydrateStoreFromCache } from '../../src/cacheBootstrap';

describe('cache bootstrap', () => {
  beforeEach(async () => {
    store.sessions = {};
    store.aggregates = {};
    clearSessionData();
    await clearCachedSessions();
  });

  it('persists and hydrates session metadata and shots', async () => {
    const meta = { pk: 1, ready: true, shot_count: 1, metrics: { hold: { mean: 1, sd: 0 } } };
    await persistSessionMeta(1, meta);
    await persistSessionShots(1, [{ pk: 11, pitch: [0], yaw: [0] }]);
    await hydrateStoreFromCache();
    expect(store.sessions[1]).toBeTruthy();
    expect(store.sessions[1].ready).toBe(true);
    expect(getProcessedShots(1).length).toBe(1);
  });

  it('clears cached data', async () => {
    await persistSessionMeta(2, { pk: 2, ready: false });
    await persistSessionShots(2, []);
    await clearCachedSessions();
    const data = await loadCachedData();
    expect(data.sessions.length).toBe(0);
    expect(data.shots.length).toBe(0);
  });
});
