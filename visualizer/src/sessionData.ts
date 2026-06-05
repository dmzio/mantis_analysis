import { markRaw, reactive } from 'vue';
import { getActiveDriftMode, type DriftMode } from './appSettings';
import type { PreprocessedShot, ProcessedSessionShotVariants, SessionDriftEstimate } from './shotProcessor';

const sessionDetailCache = new Map<number, Record<string, any>>();
const processedShotCache = new Map<number, ProcessedSessionShotVariants>();
const processedShotRevisions = reactive<Record<number, number>>({});

export function cacheSessionDetail(session: Record<string, any>): void {
  if (!session?.pk) return;
  sessionDetailCache.set(session.pk, markRaw({ ...session }));
}

export function getSessionDetail(pk: number): Record<string, any> | null {
  return sessionDetailCache.get(pk) || null;
}

export function normalizeProcessedShotVariants(
  shots: PreprocessedShot[] | Partial<ProcessedSessionShotVariants>
): ProcessedSessionShotVariants {
  if (Array.isArray(shots)) {
    return {
      original: shots,
      corrected: shots,
      drift: null
    };
  }
  const original = Array.isArray(shots.original) ? shots.original : [];
  const corrected = Array.isArray(shots.corrected) ? shots.corrected : original;
  return {
    original,
    corrected,
    drift: shots.drift ?? null
  };
}

export function cacheProcessedShots(
  pk: number,
  shots: PreprocessedShot[] | Partial<ProcessedSessionShotVariants>
): void {
  processedShotCache.set(pk, markRaw(normalizeProcessedShotVariants(shots)));
  processedShotRevisions[pk] = (processedShotRevisions[pk] || 0) + 1;
}

export function getProcessedShotRevision(pk: number): number {
  return processedShotRevisions[pk] || 0;
}

export function getProcessedShotVariants(pk: number): ProcessedSessionShotVariants | null {
  return processedShotCache.get(pk) || null;
}

export function getProcessedShots(pk: number, mode: DriftMode = getActiveDriftMode()): PreprocessedShot[] {
  const variants = processedShotCache.get(pk);
  return variants?.[mode] || [];
}

export function getSessionDrift(pk: number): SessionDriftEstimate | null {
  return processedShotCache.get(pk)?.drift || null;
}

export function getShotByPk(sessionPk: number, shotPk: number, mode: DriftMode = getActiveDriftMode()): PreprocessedShot | null {
  return getProcessedShots(sessionPk, mode).find(shot => shot.pk === shotPk) || null;
}

export function clearSessionData(): void {
  sessionDetailCache.clear();
  processedShotCache.clear();
  Object.keys(processedShotRevisions).forEach(pk => {
    delete processedShotRevisions[Number(pk)];
  });
}
