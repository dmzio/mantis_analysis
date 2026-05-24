import SessionWorker from './workers/sessionWorker?worker';
import store from './store';
import { formatSessionDuration } from './durationFmt';
import { getHandle } from './fsHandles';
import { cacheProcessedShots, cacheSessionDetail, clearSessionData } from './sessionData';
import { recordPerf, perfNow } from './perfMetrics';
import { formatDate } from './dateFmt';
import { persistSessionMeta, persistSessionShots, clearCachedSessions } from './db/cacheDb';

const SUMMARY_FIELDS = [
  'length_1s',
  'delta_pull',
  'percent_10',
  'hold_duration_s',
  'split_s',
  'score_numeric',
  'post_shot_stability_500ms_mm',
  'ellipse_area_mm2',
  'ellipse_major_mm',
  'ellipse_minor_mm'
];

type FileSource = {
  name: string;
  getFile: () => Promise<File>;
};

interface WorkerResponse {
  sessionPk: number;
  shots: any[];
  stats: Record<string, { mean: number; sd: number }>;
  metrics: Record<string, any>;
}

let workerSeq = 0;
const workerResolvers = new Map<number, { resolve: (value: WorkerResponse) => void; reject: (err: unknown) => void }>();
let workerInstance: Worker | null = null;

function ensureWorker(): Worker {
  if (workerInstance) return workerInstance;
  const instance = new SessionWorker();
  instance.onmessage = event => {
    const data = event.data;
    if (data?.type !== 'session-processed') return;
    const resolver = workerResolvers.get(data.requestId);
    if (resolver) {
      resolver.resolve({
        sessionPk: data.sessionPk,
        shots: data.shots,
        stats: data.stats,
        metrics: data.metrics
      });
      workerResolvers.delete(data.requestId);
    }
  };
  instance.onerror = event => {
    workerResolvers.forEach(resolver => resolver.reject(event));
    workerResolvers.clear();
  };
  workerInstance = instance;
  return instance;
}

async function runWorker(session: any): Promise<WorkerResponse> {
  const requestId = ++workerSeq;
  return new Promise((resolve, reject) => {
    workerResolvers.set(requestId, { resolve, reject });
    ensureWorker().postMessage({
      type: 'process-session',
      requestId,
      session,
      summaryFields: SUMMARY_FIELDS
    });
  });
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  if (typeof FileReader === 'undefined') {
    throw new Error('FileReader unavailable');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = event => resolve(String(event.target?.result ?? ''));
    reader.readAsText(file);
  });
}

async function collectSources(handle: FileSystemDirectoryHandle): Promise<FileSource[]> {
  const sources: FileSource[] = [];
  const scanStart = perfNow();
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
      const fileHandle = entry as FileSystemFileHandle;
      sources.push({
        name: entry.name,
        getFile: () => fileHandle.getFile()
      });
    }
  }
  sources.sort((a, b) => a.name.localeCompare(b.name));
  recordPerf('loader:enumerate', perfNow() - scanStart, { files: sources.length });
  return sources;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function deriveFirearm(session: Record<string, any>): string {
  if (session.firearm_name) return session.firearm_name;
  if (session.gun_display) return session.gun_display;
  if (session.firearm && (session.firearm.make || session.firearm.model)) {
    return [session.firearm.make, session.firearm.model].filter(Boolean).join(' ');
  }
  return '';
}

function deriveDrill(session: Record<string, any>): string {
  return session.drill_name || session.course_number || session.fire_type_display || '';
}

function buildSessionMeta(session: Record<string, any>, bytes: number, shots: number) {
  const shotCount = parseNumber(session.shot_count) ?? shots;
  const avgScore = parseNumber(session.average_score);
  const timestamp = session.date ? new Date(session.date).getTime() : 0;
  const formattedDuration = formatSessionDuration(session.time_display ?? session.time_bars);
  return {
    ...session,
    shot_count: shotCount,
    avg_score: avgScore,
    drill_label: deriveDrill(session),
    firearm_label: deriveFirearm(session),
    duration_label: formattedDuration,
    timestamp,
    fmtDate: session.date ? formatDate(session.date) : '',
    ready: false,
    status: 'pending',
    bytes,
    metrics: null as Record<string, any> | null,
    statsSummary: null as Record<string, { mean: number; sd: number }> | null
  };
}

function resetPhotos() {
  Object.values(store.photos).forEach(url => URL.revokeObjectURL(url));
  store.photos = {};
}

async function loadPhotos(handle: FileSystemDirectoryHandle | null) {
  if (!handle?.getDirectoryHandle) return;
  const photoStart = perfNow();
  const next: Record<number, string> = {};
  try {
    const photoDir = await handle.getDirectoryHandle('session_photo');
    for await (const entry of photoDir.values()) {
      if (entry.kind !== 'file') continue;
      const match = /^([0-9]+)/.exec(entry.name);
      if (!match) continue;
      const sid = Number(match[1]);
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        next[sid] = URL.createObjectURL(file);
      } catch {
        // ignore
      }
    }
  } catch {
    // optional directory
  } finally {
    resetPhotos();
    store.photos = next;
    recordPerf('loader:photos', perfNow() - photoStart, { photos: Object.keys(next).length });
  }
}

function resetStoreForLoad(total: number) {
  clearSessionData();
  store.sessions = {};
  store.aggregates = {};
  resetPhotos();
  store.loader = {
    total,
    processed: 0,
    pending: total,
    active: total > 0,
    message: total ? `Processing 0/${total}` : 'No sessions found',
    currentPk: null,
    inFlight: 0
  };
  store.loading = total > 0;
}

function updateLoading(total: number) {
  store.loader.pending = Math.max(0, total - store.loader.processed);
}

const MAX_READERS = 4;

async function ingestSources(
  sources: FileSource[],
  folderName: string,
  photoHandle: FileSystemDirectoryHandle | null
): Promise<void> {
  const totalStart = perfNow();
  resetStoreForLoad(sources.length);
  if (!sources.length) {
    store.loading = false;
    store.loader.active = false;
    return;
  }

  let nextIndex = 0;
  let finalized = false;
  const readerCount = Math.min(MAX_READERS, Math.max(1, sources.length));
  const readers = Array.from({ length: readerCount }, () => readLoop());

  await Promise.all(readers);

  async function readLoop(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= sources.length) break;
      await ingestSource(sources[current], current, sources.length, finalize);
    }
  }

  async function finalize() {
    if (finalized) return;
    if (store.loader.processed < sources.length) return;
    finalized = true;
    store.loader.active = false;
    store.loading = false;
    await loadPhotos(photoHandle);
    recordPerf('loader:total', perfNow() - totalStart, { files: sources.length, folder: folderName });
  }
}

async function ingestSource(
  source: FileSource,
  index: number,
  total: number,
  finalize: () => Promise<void> | void
): Promise<void> {
  let pk: number | null = null;
  try {
    const openStart = perfNow();
    const file = await source.getFile();
    recordPerf('loader:fileOpen', perfNow() - openStart, { name: source.name });

    const readStart = perfNow();
    const text = await readFileText(file as File);
    recordPerf('loader:fileRead', perfNow() - readStart, { name: source.name, bytes: text.length });

    const parseStart = perfNow();
    const obj = JSON.parse(text);
    recordPerf('loader:parse', perfNow() - parseStart, { name: source.name });

    const session = obj.session || obj;
    pk = session?.pk ?? null;
    if (!pk) {
      store.loader.processed = Math.min(total, store.loader.processed + 1);
      updateLoading(total);
      await finalize();
      return;
    }
    const shots = Array.isArray(session.shots) ? session.shots : [];
    const sessionMeta = { ...session };
    delete sessionMeta.shots;
    cacheSessionDetail(sessionMeta);
    if (store.sessions[pk]) {
      store.loader.processed = Math.min(total, store.loader.processed + 1);
      updateLoading(total);
      await finalize();
      return;
    }
    store.sessions[pk] = {
      ...buildSessionMeta(sessionMeta, text.length, shots.length),
      status: shots.length ? 'processing' : 'ready',
      ready: shots.length === 0
    };
    persistSessionMeta(pk, store.sessions[pk]);
    store.loader.currentPk = pk;
    if (!shots.length) {
      store.loader.processed = Math.min(total, store.loader.processed + 1);
      updateLoading(total);
      await persistSessionShots(pk, []);
      await finalize();
      return;
    }
    store.loader.inFlight += 1;
    store.loader.message = `Processing ${Math.min(store.loader.processed + store.loader.inFlight, total)}/${total}`;
    void runWorker({ ...sessionMeta, shots })
      .then(workerResult => {
        cacheProcessedShots(pk as number, workerResult.shots);
        store.aggregates[pk as number] = { stats: workerResult.stats, metrics: workerResult.metrics };
        const current = store.sessions[pk as number];
        if (!current) {
          return;
        }
        store.sessions[pk as number] = {
          ...current,
          shot_count: current.shot_count ?? workerResult.shots.length,
          ready: true,
          status: 'ready',
          metrics: workerResult.metrics,
          statsSummary: workerResult.stats
        };
        persistSessionMeta(pk as number, store.sessions[pk as number]);
        persistSessionShots(pk as number, workerResult.shots);
      })
      .catch(err => console.error(err))
      .finally(async () => {
        store.loader.inFlight = Math.max(0, store.loader.inFlight - 1);
        store.loader.processed = Math.min(total, store.loader.processed + 1);
        updateLoading(total);
        store.loader.message =
          store.loader.processed < total
            ? `Processing ${Math.min(store.loader.processed + store.loader.inFlight + 1, total)}/${total}`
            : `Processed ${store.loader.processed}/${total}`;
        await finalize();
      });
  } catch (err) {
    console.error(err);
  }
}

export async function loadFromHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await clearCachedSessions();
  store.handle = handle;
  store.folder = handle.name;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('data_folder', handle.name);
  }
  const sources = await collectSources(handle);
  await ingestSources(sources, handle.name, handle);
}

export async function loadFromFileList(files: File[]): Promise<void> {
  await clearCachedSessions();
  const sources: FileSource[] = files
    .filter(file => file.name.endsWith('.json'))
    .map(file => ({
      name: file.name,
      getFile: () => Promise.resolve(file)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!store.folder) {
    store.folder = 'manual import';
  }
  if (typeof localStorage !== 'undefined' && store.folder) {
    localStorage.setItem('data_folder', store.folder);
  }
  await ingestSources(sources, store.folder, null);
}

export async function ensureData(): Promise<boolean> {
  if (Object.keys(store.sessions).length) return true;
  if (!store.folder) return false;
  const handle = await getHandle();
  if (!handle) return false;
  const perm = await handle.queryPermission({ mode: 'read' });
  if (perm !== 'granted') return false;
  await loadFromHandle(handle);
  return Object.keys(store.sessions).length > 0;
}
