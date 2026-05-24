import store from './store';
import { loadCachedData } from './db/cacheDb';
import { cacheProcessedShots, cacheSessionDetail } from './sessionData';
import { perfNow, recordPerf } from './perfMetrics';

let hydrated = false;

export async function hydrateStoreFromCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const start = perfNow();
  let sessionCount = 0;
  let shotCount = 0;
  try {
    const { sessions, shots } = await loadCachedData();
    sessionCount = sessions.length;
    shotCount = shots.length;
    sessions.forEach(record => {
      if (!record?.meta?.pk) return;
      cacheSessionDetail(record.meta);
      store.sessions[record.pk] = record.meta;
    });
    shots.forEach(record => {
      if (!record?.pk || !Array.isArray(record.shots)) return;
      cacheProcessedShots(record.pk, record.shots);
    });
    if (sessions.length) {
      store.loader.active = false;
      store.loading = false;
    }
  } catch {
    // ignore
  } finally {
    recordPerf('cache:hydrate', perfNow() - start, {
      sessions: sessionCount,
      shots: shotCount
    });
  }
}
