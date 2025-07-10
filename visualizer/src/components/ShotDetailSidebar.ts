import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';
import BreadCrumb from 'primevue/breadcrumb';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import store from '../store';

export default defineComponent({
  name: 'ShotDetailSidebar',
  components: { BreadCrumb, DataTable, Column },
  setup() {
    const route = useRoute();
    const sessionPk = computed(() => Number(route.params.spk));
    const shotPk = computed(() => Number(route.params.pk));
    const shot = computed(() => {
      const session = (store.sessions as Record<number, any>)[sessionPk.value];
      if (!session) return null;
      return (session.shots || []).find((s: any) => s.pk === shotPk.value) || null;
    });
    const items = computed(() => [
      { label: `Session ${sessionPk.value}`, url: `/session/${sessionPk.value}` },
      { label: `Shot ${shotPk.value}`, disabled: true }
    ]);
    const home = { label: 'Dashboard', url: '/dashboard' };
    const details = computed(() => {
      const s = shot.value as Record<string, any> | null;
      if (!s) return [] as any[];
      return Object.keys(s).map(k => {
        if (Array.isArray(s[k]) && (k.includes('pitch') || k.includes('yaw'))) {
          return { key: k, value: s[k].length };
        }
        return { key: k, value: Array.isArray(s[k]) ? s[k].join(', ') : s[k] };
      });
    });
    return { items, home, details };
  },
  template: `
    <div class="session-sidebar-content">
      <BreadCrumb :home="home" :model="items" data-testid="breadcrumb" class="p-mb-2" />
      <DataTable :value="details" data-testid="shot-details">
        <Column field="key" header="Detail" />
        <Column field="value" header="Value" />
      </DataTable>
    </div>
  `
});
