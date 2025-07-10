import store from './store';
import { getHandle } from './fsHandles';

export async function loadFromHandle(handle: FileSystemDirectoryHandle, concurrency = 10): Promise<void> {
  store.loading = true;
  try {
    store.handle = handle;
    store.folder = handle.name;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('data_folder', handle.name);
    }
    store.sessions = {};
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
            (store.sessions as Record<number, any>)[id] = obj.session || obj;
          }
        } catch (err) {
          console.error(err);
        }
      });
      await Promise.all(batch);
    }
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
