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
    const formatSeconds = (val: number | null | undefined) => {
      if (val === null || val === undefined) return '';
      const num = Number(val);
      return Number.isFinite(num) ? num.toFixed(2) : '';
    };
    const formatMm = (val: number | null | undefined) => {
      if (val === null || val === undefined) return '';
      const num = Number(val);
      return Number.isFinite(num) ? num.toFixed(1) : '';
    };
    const timing = computed(() => {
      const s = shot.value as Record<string, any> | null;
      if (!s) return [] as any[];
      return [
        { key: 'Hold', value: formatSeconds(s.hold_duration_s) },
        { key: 'Split', value: formatSeconds(s.split_s) }
      ].filter(row => row.value !== '');
    });
    const stability = computed(() => {
      const s = shot.value as Record<string, any> | null;
      if (!s) return [] as any[];
      const radial = s.impact_pitch_mm !== undefined && s.impact_yaw_mm !== undefined
        ? Math.hypot(s.impact_pitch_mm, s.impact_yaw_mm)
        : null;
      return [
        { key: 'Hold ellipse major', value: formatMm(s.ellipse_major_mm) },
        { key: 'Hold ellipse minor', value: formatMm(s.ellipse_minor_mm) },
        { key: 'Hold ellipse angle', value: s.ellipse_angle_deg != null ? `${s.ellipse_angle_deg.toFixed(1)}°` : '' },
        { key: 'Hold area', value: s.ellipse_area_mm2 != null ? `${s.ellipse_area_mm2.toFixed(1)} mm²` : '' },
        { key: 'Impact offset', value: radial != null ? `${radial.toFixed(1)} mm` : '' }
      ].filter(row => row.value !== '');
    });
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
    return { items, home, details, timing, stability };
  },
  template: `
    <div class="session-sidebar-content">
      <BreadCrumb :home="home" :model="items" data-testid="breadcrumb" class="p-mb-2" />
      <div v-if="timing.length" class="card p-2">
        <h4>Timing</h4>
        <DataTable :value="timing" size="small">
          <Column field="key" header="Phase" />
          <Column field="value" header="Seconds" />
        </DataTable>
      </div>
      <div v-if="stability.length" class="card p-2 p-mt-2">
        <h4>Stability</h4>
        <DataTable :value="stability" size="small">
          <Column field="key" header="Metric" />
          <Column field="value" header="Value" />
        </DataTable>
      </div>
      <DataTable :value="details" data-testid="shot-details">
        <Column field="key" header="Detail" />
        <Column field="value" header="Value" />
      </DataTable>
    </div>
  `
});
