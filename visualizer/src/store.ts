import { reactive } from 'vue';
import { clearHandle } from './fsHandles';

interface StoreState {
  /** raw session data indexed by pk */
  sessions: Record<number, any>;
  /** processed shot information indexed by pk */
  processed: Record<number, any>;
  /** cached session aggregates indexed by pk */
  aggregates: Record<number, any>;
  folder: string;
  handle: FileSystemDirectoryHandle | null;
  loading: boolean;
}

const store = reactive<StoreState>({
  sessions: {},
  processed: {},
  aggregates: {},
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
  store.folder = '';
  store.handle = null;
  store.loading = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('data_folder');
  }
  await clearHandle();
}

export default store;
