import { reactive } from 'vue';

const store = reactive({
  sessions: {} as Record<number, any>,
  folder:
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem('data_folder') || ''
});

export function resetStore() {
  store.sessions = {};
  store.folder = '';
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('data_folder');
  }
}

export default store;
