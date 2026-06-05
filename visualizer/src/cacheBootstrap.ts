import store from './store';
import { loadCachedData } from './db/cacheDb';
import { cacheProcessedShots, cacheSessionDetail } from './sessionData';
import { perfNow, recordPerf } from './perfMetrics';

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;

export async function hydrateStoreFromCache(): Promise<void> {
  if (hydrated && Object.keys(store.sessions).length) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = hydrateStoreFromCacheOnce();
  return hydrationPromise;
}

export function resetCacheHydration(): void {
  hydrated = false;
  hydrationPromise = null;
}

async function hydrateStoreFromCacheOnce(): Promise<void> {
  const start = perfNow();
  let sessionCount = 0;
  let shotCount = 0;
  try {
    store.loader = {
      total: 0,
      processed: 0,
      pending: 0,
      active: true,
      message: 'Restoring cached sessions',
      currentPk: null,
      inFlight: 0
    };
    store.loading = true;
    const { sessions, shots } = await loadCachedData();
    sessionCount = sessions.length;
    shotCount = shots.length;
    sessions.forEach(record => {
      if (!record?.meta?.pk) return;
      cacheSessionDetail(record.meta);
      store.sessions[record.pk] = record.meta;
    });
    shots.forEach(record => {
      if (!record?.pk || !record.shots) return;
      cacheProcessedShots(record.pk, record.shots);
    });
  } catch {
    // ignore
  } finally {
    store.loader.active = false;
    store.loading = false;
    hydrated = true;
    hydrationPromise = null;
    recordPerf('cache:hydrate', perfNow() - start, {
      sessions: sessionCount,
      shots: shotCount
    });
  }
}
