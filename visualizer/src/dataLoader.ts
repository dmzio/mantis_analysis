import store from './store';
import { getHandle } from './fsHandles';
import { preprocessShot } from './shotProcessor';
import { aggregateFields } from './sessionAggregates';

export async function loadFromHandle(handle: FileSystemDirectoryHandle, concurrency = 10): Promise<void> {
  store.loading = true;
  try {
    store.handle = handle;
    store.folder = handle.name;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('data_folder', handle.name);
    }
  const sessions: Record<number, any> = {};
  const processed: Record<number, any> = {};
  const photos: Record<number, string> = {};
  const entries: FileSystemHandle[] = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        entries.push(entry);
      }
    }
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency).map(async entry => {
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          const text = await file.text();
          const obj = JSON.parse(text);
          const id = obj.session?.pk ?? obj.pk;
          if (id !== undefined) {
            const session = obj.session || obj;
            sessions[id] = session;
            if (Array.isArray(session.shots)) {
              const shots = session.shots.map((s: any) => preprocessShot(s));
              processed[id] = { shots };
              store.aggregates[id] = {
                stats: aggregateFields(shots, ['length_1s', 'delta_pull', 'percent_10'])
              };
            }
          }
        } catch (err) {
          console.error(err);
        }
      });
      await Promise.all(batch);
    }

    // load session photos from optional subdirectory
    try {
      const photoDir = await handle.getDirectoryHandle('session_photo');
      for await (const entry of photoDir.values()) {
        if (entry.kind !== 'file') continue;
        const match = /^([0-9]+)/.exec(entry.name);
        if (!match) continue;
        const sid = Number(match[1]);
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          photos[sid] = URL.createObjectURL(file);
        } catch {
          // ignore
        }
      }
    } catch {
      // directory missing -> ignore
    }
    store.sessions = sessions;
    store.processed = processed;
    store.photos = photos;
  } finally {
    store.loading = false;
  }
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
