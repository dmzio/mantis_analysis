import { reactive } from 'vue';
import { clearHandle } from './fsHandles';

interface StoreState {
  /** raw session data indexed by pk */
  sessions: Record<number, any>;
  /** processed shot information indexed by pk */
  processed: Record<number, any>;
  /** cached session aggregates indexed by pk */
  aggregates: Record<number, any>;
  /** object URLs for session photos indexed by pk */
  photos: Record<number, string>;
  folder: string;
  handle: FileSystemDirectoryHandle | null;
  loading: boolean;
}

const store = reactive<StoreState>({
  sessions: {},
  processed: {},
  aggregates: {},
  photos: {},
  folder:
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem('data_folder') || '',
  handle: null,
  loading: false
});

export async function resetStore() {
  store.sessions = {};
  store.processed = {};
  store.aggregates = {};
  Object.values(store.photos).forEach(url => URL.revokeObjectURL(url));
  store.photos = {};
  store.folder = '';
  store.handle = null;
  store.loading = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('data_folder');
  }
  await clearHandle();
}

export default store;
