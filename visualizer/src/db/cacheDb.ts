const DB_NAME = 'mantis-cache';
const STORE_SESSIONS = 'sessions';
const STORE_SHOTS = 'shots';
const STORE_MANIFEST = 'manifest';
const DB_VERSION = 2;
const CACHE_SCHEMA_VERSION = 2;
const MANIFEST_KEY = 'current';

export interface CachedSessionRecord {
  pk: number;
  meta: Record<string, any>;
}

export interface CachedShotsRecord {
  pk: number;
  shots: any;
}

export interface CacheManifest {
  pk: typeof MANIFEST_KEY;
  schemaVersion: number;
  complete: boolean;
  sourceName: string;
  writtenAt: number;
  sessionPks: number[];
  shotSessionPks: number[];
}

export interface CacheLoadResult {
  sessions: CachedSessionRecord[];
  shots: CachedShotsRecord[];
  manifest: CacheManifest | null;
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'pk' });
      }
      if (!db.objectStoreNames.contains(STORE_SHOTS)) {
        db.createObjectStore(STORE_SHOTS, { keyPath: 'pk' });
      }
      if (!db.objectStoreNames.contains(STORE_MANIFEST)) {
        db.createObjectStore(STORE_MANIFEST, { keyPath: 'pk' });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function put(store: IDBObjectStore, value: any) {
  return new Promise<void>((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getAll(store: IDBObjectStore) {
  return new Promise<any[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function get(store: IDBObjectStore, key: IDBValidKey) {
  return new Promise<any>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearStore(store: IDBObjectStore) {
  return new Promise<void>((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function isCompleteManifest(manifest: any): manifest is CacheManifest {
  return (
    manifest?.pk === MANIFEST_KEY &&
    manifest.schemaVersion === CACHE_SCHEMA_VERSION &&
    manifest.complete === true &&
    Array.isArray(manifest.sessionPks) &&
    Array.isArray(manifest.shotSessionPks)
  );
}

export async function persistSessionMeta(pk: number, meta: Record<string, any>): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_SESSIONS, 'readwrite');
    await put(tx.objectStore(STORE_SESSIONS), { pk, meta });
    tx.commit?.();
  } catch {
    // ignore
  }
}

export async function persistSessionShots(pk: number, shots: any): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_SHOTS, 'readwrite');
    await put(tx.objectStore(STORE_SHOTS), { pk, shots });
    tx.commit?.();
  } catch {
    // ignore
  }
}

export async function replaceCachedData(
  sessions: CachedSessionRecord[],
  shots: CachedShotsRecord[],
  sourceName = ''
): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SESSIONS, STORE_SHOTS, STORE_MANIFEST], 'readwrite');
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const shotStore = tx.objectStore(STORE_SHOTS);
    const manifestStore = tx.objectStore(STORE_MANIFEST);
    const manifest: CacheManifest = {
      pk: MANIFEST_KEY,
      schemaVersion: CACHE_SCHEMA_VERSION,
      complete: true,
      sourceName,
      writtenAt: Date.now(),
      sessionPks: sessions.map(record => record.pk),
      shotSessionPks: shots.map(record => record.pk)
    };
    await Promise.all([
      clearStore(sessionStore),
      clearStore(shotStore),
      clearStore(manifestStore)
    ]);
    await Promise.all([
      ...sessions.map(record => put(sessionStore, record)),
      ...shots.map(record => put(shotStore, record)),
      put(manifestStore, manifest)
    ]);
    tx.commit?.();
  } catch {
    // ignore
  }
}

export async function upsertCachedSession(record: CachedSessionRecord, shotRecord: CachedShotsRecord, sourceName = ''): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SESSIONS, STORE_SHOTS, STORE_MANIFEST], 'readwrite');
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const shotStore = tx.objectStore(STORE_SHOTS);
    const manifestStore = tx.objectStore(STORE_MANIFEST);
    const existingManifest = await get(manifestStore, MANIFEST_KEY);
    const sessionPks = new Set<number>(
      isCompleteManifest(existingManifest) ? existingManifest.sessionPks : []
    );
    const shotSessionPks = new Set<number>(
      isCompleteManifest(existingManifest) ? existingManifest.shotSessionPks : []
    );
    sessionPks.add(record.pk);
    shotSessionPks.add(shotRecord.pk);
    const manifest: CacheManifest = {
      pk: MANIFEST_KEY,
      schemaVersion: CACHE_SCHEMA_VERSION,
      complete: true,
      sourceName: sourceName || (isCompleteManifest(existingManifest) ? existingManifest.sourceName : ''),
      writtenAt: Date.now(),
      sessionPks: Array.from(sessionPks),
      shotSessionPks: Array.from(shotSessionPks)
    };
    await Promise.all([
      put(sessionStore, record),
      put(shotStore, shotRecord),
      put(manifestStore, manifest)
    ]);
    tx.commit?.();
  } catch {
    // ignore
  }
}

export async function loadCachedData(): Promise<CacheLoadResult> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SESSIONS, STORE_SHOTS, STORE_MANIFEST], 'readonly');
    const manifest = await get(tx.objectStore(STORE_MANIFEST), MANIFEST_KEY);
    if (!isCompleteManifest(manifest)) {
      return { sessions: [], shots: [], manifest: null };
    }
    const [sessions, shots] = await Promise.all([
      getAll(tx.objectStore(STORE_SESSIONS)),
      getAll(tx.objectStore(STORE_SHOTS))
    ]);
    return { sessions, shots, manifest };
  } catch {
    return { sessions: [], shots: [], manifest: null };
  }
}

export async function loadCachedSession(pk: number): Promise<{ session: CachedSessionRecord | null; shots: CachedShotsRecord | null }> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_SESSIONS, STORE_SHOTS, STORE_MANIFEST], 'readonly');
    const manifest = await get(tx.objectStore(STORE_MANIFEST), MANIFEST_KEY);
    if (!isCompleteManifest(manifest) || !manifest.sessionPks.includes(pk)) {
      return { session: null, shots: null };
    }
    const [session, shots] = await Promise.all([
      get(tx.objectStore(STORE_SESSIONS), pk),
      get(tx.objectStore(STORE_SHOTS), pk)
    ]);
    return {
      session: session || null,
      shots: shots || null
    };
  } catch {
    return { session: null, shots: null };
  }
}

export async function clearCachedSessions(): Promise<void> {
  try {
    const db = await openDb();
    const tx1 = db.transaction(STORE_SESSIONS, 'readwrite');
    const tx2 = db.transaction(STORE_SHOTS, 'readwrite');
    const tx3 = db.transaction(STORE_MANIFEST, 'readwrite');
    await Promise.all([
      clearStore(tx1.objectStore(STORE_SESSIONS)),
      clearStore(tx2.objectStore(STORE_SHOTS)),
      clearStore(tx3.objectStore(STORE_MANIFEST))
    ]);
    tx1.commit?.();
    tx2.commit?.();
    tx3.commit?.();
  } catch {
    // ignore
  }
}
