import { reactive } from 'vue';
import { clearHandle } from './fsHandles';
import { clearSessionData } from './sessionData';
import { clearCachedSessions } from './db/cacheDb';

interface LoaderState {
  total: number;
  processed: number;
  pending: number;
  active: boolean;
  message: string;
  currentPk: number | null;
  inFlight: number;
}

interface StoreState {
  sessions: Record<number, any>;
  aggregates: Record<number, any>;
  photos: Record<number, string>;
  folder: string;
  handle: FileSystemDirectoryHandle | null;
  loading: boolean;
  loader: LoaderState;
}

const initialLoader: LoaderState = {
  total: 0,
  processed: 0,
  pending: 0,
  active: false,
  message: '',
  currentPk: null,
  inFlight: 0
};

const store = reactive<StoreState>({
  sessions: {},
  aggregates: {},
  photos: {},
  folder:
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem('data_folder') || '',
  handle: null,
  loading: false,
  loader: { ...initialLoader }
});

export async function resetStore() {
  store.sessions = {};
  store.aggregates = {};
  Object.values(store.photos).forEach(url => URL.revokeObjectURL(url));
  store.photos = {};
  store.folder = '';
  store.handle = null;
  store.loading = false;
  store.loader = { ...initialLoader };
  clearSessionData();
  await clearCachedSessions();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('data_folder');
  }
  await clearHandle();
}

export default store;
