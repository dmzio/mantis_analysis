import store from './store';
import { getHandle } from './fsHandles';
import { parseSessionFile } from './sessionParser';

export async function loadFromHandle(handle: FileSystemDirectoryHandle): Promise<void> {
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
    for await (const entry of entries) {
      try {
        const file = await (entry as FileSystemFileHandle).getFile();
        const result = await parseSessionFile(file);
        if (result) {
          const [id, obj] = result;
          (store.sessions as Record<number, any>)[id] = obj;
        }
      } catch (err) {
        console.error(err);
      }
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
  const perm = await (handle as any).queryPermission({ mode: 'read' });
  if (perm !== 'granted') return false;
  await loadFromHandle(handle);
  return Object.keys(store.sessions).length > 0;
}
