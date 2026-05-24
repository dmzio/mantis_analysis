import { defineComponent, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BreadCrumb from 'primevue/breadcrumb';
import SessionShotList from './SessionShotList';
import store from '../store';
import { getProcessedShots } from '../sessionData';

export default defineComponent({
  name: 'SessionSidebar',
  components: { BreadCrumb, SessionShotList },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const sessionPk = computed(() => Number(route.params.pk));
    const shots = computed(() => {
      const meta = store.sessions[sessionPk.value];
      void meta?.ready;
      return getProcessedShots(sessionPk.value);
    });
    const items = computed(() => [
      { label: `Session ${sessionPk.value}`, disabled: true }
    ]);
    const home = {
      label: 'Dashboard',
      command: ({ originalEvent }: any) => {
        originalEvent?.preventDefault();
        router.push('/dashboard');
      }
    };
    return { shots, sessionPk, items, home };
  },
  template: `
    <div class="session-sidebar-content">
      <BreadCrumb :home="home" :model="items" data-testid="breadcrumb" class="p-mb-2" />
      <SessionShotList :shots="shots" :sessionPk="sessionPk" />
    </div>
  `
});
