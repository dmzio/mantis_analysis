import { reactive } from 'vue';

const store = reactive({
  sessions: [] as any[],
  folder:
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem('data_folder') || ''
});

export default store;
