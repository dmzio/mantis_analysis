const DB_NAME = 'mantis-cache';
const STORE_SESSIONS = 'sessions';
const STORE_SHOTS = 'shots';

interface CachedSessionRecord {
  pk: number;
  meta: Record<string, any>;
}

interface CachedShotsRecord {
  pk: number;
  shots: any[];
}

export interface CacheLoadResult {
  sessions: CachedSessionRecord[];
  shots: CachedShotsRecord[];
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'pk' });
      }
      if (!db.objectStoreNames.contains(STORE_SHOTS)) {
        db.createObjectStore(STORE_SHOTS, { keyPath: 'pk' });
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

async function clearStore(store: IDBObjectStore) {
  return new Promise<void>((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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

export async function persistSessionShots(pk: number, shots: any[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_SHOTS, 'readwrite');
    await put(tx.objectStore(STORE_SHOTS), { pk, shots });
    tx.commit?.();
  } catch {
    // ignore
  }
}

export async function loadCachedData(): Promise<CacheLoadResult> {
  try {
    const db = await openDb();
    const sessTx = db.transaction(STORE_SESSIONS, 'readonly');
    const shotTx = db.transaction(STORE_SHOTS, 'readonly');
    const [sessions, shots] = await Promise.all([
      getAll(sessTx.objectStore(STORE_SESSIONS)),
      getAll(shotTx.objectStore(STORE_SHOTS))
    ]);
    return { sessions, shots };
  } catch {
    return { sessions: [], shots: [] };
  }
}

export async function clearCachedSessions(): Promise<void> {
  try {
    const db = await openDb();
    const tx1 = db.transaction(STORE_SESSIONS, 'readwrite');
    const tx2 = db.transaction(STORE_SHOTS, 'readwrite');
    await Promise.all([
      clearStore(tx1.objectStore(STORE_SESSIONS)),
      clearStore(tx2.objectStore(STORE_SHOTS))
    ]);
    tx1.commit?.();
    tx2.commit?.();
  } catch {
    // ignore
  }
}
