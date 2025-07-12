import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';
import BreadCrumb from 'primevue/breadcrumb';
import SessionShotList from './SessionShotList';
import store from '../store';

export default defineComponent({
  name: 'SessionSidebar',
  components: { BreadCrumb, SessionShotList },
  setup() {
    const route = useRoute();
    const sessionPk = computed(() => Number(route.params.pk));
    const shots = computed(() => {
      const psession = (store.processed as Record<number, any>)[sessionPk.value] || { shots: [] };
      return psession.shots || [];
    });
    const items = computed(() => [
      { label: `Session ${sessionPk.value}`, disabled: true }
    ]);
    const home = { label: 'Dashboard', url: '/dashboard' };
    return { shots, sessionPk, items, home };
  },
  template: `
    <div class="session-sidebar-content">
      <BreadCrumb :home="home" :model="items" data-testid="breadcrumb" class="p-mb-2" />
      <SessionShotList :shots="shots" :sessionPk="sessionPk" />
    </div>
  `
});
