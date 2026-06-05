import SessionWorker from './workers/sessionWorker?worker';
import store from './store';
import { formatSessionDuration } from './durationFmt';
import { getHandle, saveHandle } from './fsHandles';
import { cacheProcessedShots, cacheSessionDetail, clearSessionData, getProcessedShotVariants } from './sessionData';
import { recordPerf, perfNow } from './perfMetrics';
import { formatDate } from './dateFmt';
import { loadCachedSession, replaceCachedData, upsertCachedSession } from './db/cacheDb';
import { getActiveDriftMode } from './appSettings';
import { hydrateStoreFromCache } from './cacheBootstrap';

const SUMMARY_FIELDS = [
  'length_1s',
  'delta_pull',
  'percent_10',
  'hold_duration_s',
  'split_s',
  'score_numeric',
  'post_shot_stability_500ms_mm',
  'post_shot_max_excursion_500ms_mm',
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
  shots: any;
  stats: Record<string, any>;
  metrics: Record<string, any>;
}

export type DataLoadStatus =
  | 'ready'
  | 'needs-user-action'
  | 'missing-session'
  | 'missing-shot'
  | 'error';

export interface DataLoadResult {
  status: DataLoadStatus;
  message: string;
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

function readyResult(message = ''): DataLoadResult {
  return { status: 'ready', message };
}

function needsUserActionResult(message = 'Select the session export folder to continue.'): DataLoadResult {
  return { status: 'needs-user-action', message };
}

function hasSessionShots(pk: number): boolean {
  const session = store.sessions[pk];
  if (!session) return false;
  const shotCount = Number(session?.shot_count ?? 0);
  if (!shotCount) return true;
  const variants = getProcessedShotVariants(pk);
  return Boolean((variants?.corrected?.length || variants?.original?.length || 0) > 0);
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

function startScanningLoad() {
  clearSessionData();
  store.sessions = {};
  store.aggregates = {};
  resetPhotos();
  store.loader = {
    total: 0,
    processed: 0,
    pending: 0,
    active: true,
    message: 'Scanning sessions',
    currentPk: null,
    inFlight: 0
  };
  store.loading = true;
}

function startRestoringLoad() {
  store.loader = {
    total: 0,
    processed: 0,
    pending: 0,
    active: true,
    message: 'Restoring sessions',
    currentPk: null,
    inFlight: 0
  };
  store.loading = true;
}

function stopLoading() {
  store.loader.active = false;
  store.loader.inFlight = 0;
  store.loading = false;
}

function hasCompleteSessionData(): boolean {
  const sessions = Object.values(store.sessions);
  if (!sessions.length) return false;
  return sessions.every((session: any) => {
    const shotCount = Number(session?.shot_count ?? 0);
    if (!shotCount) return true;
    const variants = getProcessedShotVariants(session.pk);
    return Boolean((variants?.corrected?.length || variants?.original?.length || 0) > 0);
  });
}

function publishProcessedSession(
  sessionMeta: Record<string, any>,
  bytes: number,
  rawShotCount: number,
  workerResult: WorkerResponse | null
) {
  const pk = sessionMeta.pk;
  const mode = getActiveDriftMode();
  const processedCount =
    workerResult?.shots?.corrected?.length ??
    workerResult?.shots?.original?.length ??
    rawShotCount;
  const meta = {
    ...buildSessionMeta(sessionMeta, bytes, rawShotCount),
    shot_count: rawShotCount || processedCount,
    ready: true,
    status: 'ready',
    metrics: workerResult?.metrics?.[mode] || {},
    metricsByMode: workerResult?.metrics || {},
    statsSummary: workerResult?.stats?.[mode] || {},
    statsSummaryByMode: workerResult?.stats || {},
    drift: workerResult?.shots?.drift ?? null
  };
  cacheSessionDetail(sessionMeta);
  if (workerResult) {
    cacheProcessedShots(pk, workerResult.shots);
    store.aggregates[pk] = {
      stats: workerResult.stats?.[mode] || {},
      metrics: workerResult.metrics?.[mode] || {},
      statsByMode: workerResult.stats,
      metricsByMode: workerResult.metrics
    };
  } else {
    cacheProcessedShots(pk, []);
    store.aggregates[pk] = { stats: {}, metrics: {}, statsByMode: {}, metricsByMode: {} };
  }
  store.sessions = {
    ...store.sessions,
    [pk]: meta
  };
  return meta;
}

async function processSessionFile(file: File): Promise<DataLoadResult> {
  const text = await readFileText(file);
  const obj = JSON.parse(text);
  const session = obj.session || obj;
  const pk = session?.pk;
  if (!pk) {
    return { status: 'missing-session', message: 'Session file does not contain a session id.' };
  }
  const shots = Array.isArray(session.shots) ? session.shots : [];
  const sessionMeta = { ...session };
  delete sessionMeta.shots;
  const workerResult = shots.length ? await runWorker({ ...sessionMeta, shots }) : null;
  publishProcessedSession(sessionMeta, text.length, shots.length, workerResult);
  return readyResult();
}

async function findSessionSource(handle: FileSystemDirectoryHandle, pk: number): Promise<FileSource | null> {
  const fallbackSources: FileSource[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue;
    const fileHandle = entry as FileSystemFileHandle;
    const source = {
      name: entry.name,
      getFile: () => fileHandle.getFile()
    };
    if (entry.name === `${pk}.json`) {
      return source;
    }
    fallbackSources.push(source);
  }
  for (const source of fallbackSources) {
    try {
      const file = await source.getFile();
      const text = await readFileText(file);
      const obj = JSON.parse(text);
      const session = obj.session || obj;
      if (session?.pk === pk) {
        return {
          name: source.name,
          getFile: () => Promise.resolve(file)
        };
      }
    } catch {
      // ignore malformed fallback candidates
    }
  }
  return null;
}

function updateLoading(total: number) {
  store.loader.pending = Math.max(0, total - store.loader.processed);
  store.loader.message =
    store.loader.processed < total
      ? `Processing ${store.loader.processed}/${total}`
      : `Processed ${store.loader.processed}/${total}`;
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
  const dashboardSessions: Record<number, any> = {};
  const dashboardAggregates: Record<number, any> = {};
  const dashboardShots: Record<number, any> = {};
  const processingTasks: Promise<void>[] = [];
  const readerCount = Math.min(MAX_READERS, Math.max(1, sources.length));
  const readers = Array.from({ length: readerCount }, () => readLoop());

  await Promise.all(readers);
  await Promise.all(processingTasks);
  await loadPhotos(photoHandle);
  await replaceCachedData(
    Object.entries(dashboardSessions).map(([pk, meta]) => ({ pk: Number(pk), meta })),
    Object.entries(dashboardShots).map(([pk, shots]) => ({ pk: Number(pk), shots })),
    folderName
  );
  const publishStart = perfNow();
  store.sessions = dashboardSessions;
  store.aggregates = dashboardAggregates;
  recordPerf('loader:publishDashboard', perfNow() - publishStart, { sessions: Object.keys(dashboardSessions).length });
  store.loader.active = false;
  store.loading = false;
  updateLoading(sources.length);
  recordPerf('loader:total', perfNow() - totalStart, { files: sources.length, folder: folderName });

  async function readLoop(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= sources.length) break;
      await ingestSource(sources[current], sources.length, dashboardSessions, dashboardAggregates, dashboardShots, processingTasks);
    }
  }
}

async function ingestSource(
  source: FileSource,
  total: number,
  dashboardSessions: Record<number, any>,
  dashboardAggregates: Record<number, any>,
  dashboardShots: Record<number, any>,
  processingTasks: Promise<void>[]
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
      return;
    }
    const shots = Array.isArray(session.shots) ? session.shots : [];
    const sessionMeta = { ...session };
    delete sessionMeta.shots;
    cacheSessionDetail(sessionMeta);
    if (dashboardSessions[pk]) {
      store.loader.processed = Math.min(total, store.loader.processed + 1);
      updateLoading(total);
      return;
    }
    dashboardSessions[pk] = {
      ...buildSessionMeta(sessionMeta, text.length, shots.length),
      status: shots.length ? 'processing' : 'ready',
      ready: shots.length === 0
    };
    store.loader.currentPk = pk;
    if (!shots.length) {
      store.loader.processed = Math.min(total, store.loader.processed + 1);
      updateLoading(total);
      dashboardShots[pk] = [];
      return;
    }
    store.loader.inFlight += 1;
    updateLoading(total);
    const processingTask = runWorker({ ...sessionMeta, shots })
      .then(workerResult => {
        cacheProcessedShots(pk as number, workerResult.shots);
        dashboardShots[pk as number] = workerResult.shots;
        const mode = getActiveDriftMode();
        dashboardAggregates[pk as number] = {
          stats: workerResult.stats?.[mode] || {},
          metrics: workerResult.metrics?.[mode] || {},
          statsByMode: workerResult.stats,
          metricsByMode: workerResult.metrics
        };
        const processedCount =
          workerResult.shots?.corrected?.length ??
          workerResult.shots?.original?.length ??
          shots.length;
        const current = dashboardSessions[pk as number];
        if (!current) {
          return;
        }
        dashboardSessions[pk as number] = {
          ...current,
          shot_count: current.shot_count ?? processedCount,
          ready: true,
          status: 'ready',
          metrics: workerResult.metrics?.[mode] || {},
          metricsByMode: workerResult.metrics,
          statsSummary: workerResult.stats?.[mode] || {},
          statsSummaryByMode: workerResult.stats,
          drift: workerResult.shots?.drift ?? null
        };
      })
      .catch(err => console.error(err))
      .finally(() => {
        store.loader.inFlight = Math.max(0, store.loader.inFlight - 1);
        store.loader.processed = Math.min(total, store.loader.processed + 1);
        updateLoading(total);
      });
    processingTasks.push(processingTask);
  } catch (err) {
    console.error(err);
    store.loader.processed = Math.min(total, store.loader.processed + 1);
    updateLoading(total);
  }
}

export async function loadFromHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  store.handle = handle;
  store.folder = handle.name;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('data_folder', handle.name);
  }
  startScanningLoad();
  const sources = await collectSources(handle);
  await ingestSources(sources, handle.name, handle);
}

export async function loadFromFileList(files: File[]): Promise<void> {
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

export async function bootstrapCache(): Promise<void> {
  await hydrateStoreFromCache();
}

async function restoreCachedSession(pk: number): Promise<boolean> {
  if (hasSessionShots(pk)) return true;
  const cached = await loadCachedSession(pk);
  if (!cached.session?.meta) return false;
  cacheSessionDetail(cached.session.meta);
  if (cached.shots?.shots) {
    cacheProcessedShots(pk, cached.shots.shots);
  }
  store.sessions = {
    ...store.sessions,
    [pk]: cached.session.meta
  };
  return hasSessionShots(pk);
}

async function getReadableSavedHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!store.folder) return null;
  const handle = await getHandle();
  if (!handle) return null;
  const perm = await handle.queryPermission({ mode: 'read' });
  return perm === 'granted' ? handle : null;
}

export async function ensureDashboardData(): Promise<DataLoadResult> {
  await bootstrapCache();
  if (hasCompleteSessionData()) return readyResult();
  if (Object.keys(store.sessions).length) return readyResult();
  if (!store.folder) return needsUserActionResult();
  startRestoringLoad();
  const handle = await getReadableSavedHandle();
  if (!handle) {
    stopLoading();
    return needsUserActionResult();
  }
  await loadFromHandle(handle);
  return Object.keys(store.sessions).length > 0 ? readyResult() : { status: 'missing-session', message: 'No sessions were found.' };
}

export async function ensureSessionData(pk: number): Promise<DataLoadResult> {
  if (hasSessionShots(pk)) return readyResult();
  if (await restoreCachedSession(pk)) return readyResult();
  if (!store.folder) return needsUserActionResult();
  store.loader = {
    total: 1,
    processed: 0,
    pending: 1,
    active: true,
    message: `Loading session ${pk}`,
    currentPk: pk,
    inFlight: 1
  };
  store.loading = false;
  const handle = await getReadableSavedHandle();
  if (!handle) {
    stopLoading();
    return needsUserActionResult();
  }
  const source = await findSessionSource(handle, pk);
  if (!source) {
    stopLoading();
    return { status: 'missing-session', message: `Session ${pk} is not available in the selected folder.` };
  }
  try {
    const file = await source.getFile();
    const result = await processSessionFile(file);
    const meta = store.sessions[pk];
    const shots = getProcessedShotVariants(pk);
    if (meta && shots) {
      await upsertCachedSession({ pk, meta }, { pk, shots }, store.folder);
    }
    store.loader.processed = 1;
    updateLoading(1);
    stopLoading();
    return result.status === 'ready' && hasSessionShots(pk) ? readyResult() : result;
  } catch {
    stopLoading();
    return { status: 'error', message: `Session ${pk} could not be loaded.` };
  }
}

export async function ensureShotData(sessionPk: number, shotPk: number): Promise<DataLoadResult> {
  const sessionResult = await ensureSessionData(sessionPk);
  if (sessionResult.status !== 'ready') return sessionResult;
  const variants = getProcessedShotVariants(sessionPk);
  const shots = variants?.[getActiveDriftMode()] || variants?.corrected || variants?.original || [];
  if (!shots.some((shot: any) => shot.pk === shotPk)) {
    return { status: 'missing-shot', message: `Shot ${shotPk} is unavailable.` };
  }
  return readyResult();
}

export async function requestDataAccessForRoute(files?: File[]): Promise<DataLoadResult> {
  try {
    if (files?.length) {
      await loadFromFileList(files);
      return Object.keys(store.sessions).length ? readyResult() : { status: 'missing-session', message: 'No sessions were found.' };
    }
    if (!('showDirectoryPicker' in window)) {
      return needsUserActionResult('Select session JSON files to continue.');
    }
    const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
    await saveHandle(handle);
    await loadFromHandle(handle);
    return Object.keys(store.sessions).length ? readyResult() : { status: 'missing-session', message: 'No sessions were found.' };
  } catch {
    return needsUserActionResult();
  }
}

export async function ensureData(): Promise<boolean> {
  const result = await ensureDashboardData();
  return result.status === 'ready';
}
