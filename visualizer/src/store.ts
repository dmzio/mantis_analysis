import { reactive } from 'vue';
import { clearHandle } from './fsHandles';

interface StoreState {
  sessions: Record<number, any>;
  folder: string;
  handle: FileSystemDirectoryHandle | null;
}

const store = reactive<StoreState>({
  sessions: {},
  folder:
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem('data_folder') || '',
  handle: null
});

export async function resetStore() {
  store.sessions = {};
  store.folder = '';
  store.handle = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('data_folder');
  }
  await clearHandle();
}

export default store;
