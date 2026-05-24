import { markRaw } from 'vue';
import type { PreprocessedShot } from './shotProcessor';

const sessionDetailCache = new Map<number, Record<string, any>>();
const processedShotCache = new Map<number, PreprocessedShot[]>();

export function cacheSessionDetail(session: Record<string, any>): void {
  if (!session?.pk) return;
  sessionDetailCache.set(session.pk, markRaw({ ...session }));
}

export function getSessionDetail(pk: number): Record<string, any> | null {
  return sessionDetailCache.get(pk) || null;
}

export function cacheProcessedShots(pk: number, shots: PreprocessedShot[]): void {
  processedShotCache.set(pk, markRaw(shots));
}

export function getProcessedShots(pk: number): PreprocessedShot[] {
  return processedShotCache.get(pk) || [];
}

export function getShotByPk(sessionPk: number, shotPk: number): PreprocessedShot | null {
  return getProcessedShots(sessionPk).find(shot => shot.pk === shotPk) || null;
}

export function clearSessionData(): void {
  sessionDetailCache.clear();
  processedShotCache.clear();
}
