import { reactive } from 'vue';

const store = reactive({
  sessions: [],
  folder: typeof localStorage === 'undefined' ? '' : localStorage.getItem('data_folder') || ''
});

if (typeof window !== 'undefined') {
  (window.APP = window.APP || {}).store = store;
}

export default store;
