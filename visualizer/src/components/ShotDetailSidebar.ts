import { defineComponent, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BreadCrumb from 'primevue/breadcrumb';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import store from '../store';
import { getShotByPk, getProcessedShots } from '../sessionData';
import { useCustomIcon } from '../icons';

const PrevIcon = useCustomIcon('navigate_before');
const NextIcon = useCustomIcon('navigate_next');

/**
 * Normalizes the tab query value so the navigation keeps a consistent target.
 */
function resolveShotTab(value: string | string[] | undefined): 'track' | 'raw' {
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === 'raw' ? 'raw' : 'track';
}

export default defineComponent({
  name: 'ShotDetailSidebar',
  components: { BreadCrumb, DataTable, Column, Button, PrevIcon, NextIcon },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const sessionPk = computed(() => Number(route.params.spk));
    const shotPk = computed(() => Number(route.params.pk));
    const shot = computed(() => {
      const meta = (store.sessions as Record<number, any>)[sessionPk.value];
      void meta?.ready;
      return getShotByPk(sessionPk.value, shotPk.value);
    });
    const navigate = (path: string, originalEvent?: Event) => {
      originalEvent?.preventDefault();
      router.push(path);
    };
    const items = computed(() => [
      {
        label: `Session ${sessionPk.value}`,
        command: ({ originalEvent }: any) => navigate(`/session/${sessionPk.value}`, originalEvent)
      },
      { label: `Shot ${shotPk.value}`, disabled: true }
    ]);
    const home = {
      label: 'Dashboard',
      command: ({ originalEvent }: any) => navigate('/dashboard', originalEvent)
    };
    const shots = computed(() => {
      const meta = (store.sessions as Record<number, any>)[sessionPk.value];
      void meta?.ready;
      return getProcessedShots(sessionPk.value);
    });
    const shotIndex = computed(() => shots.value.findIndex(s => s.pk === shotPk.value));
    const prevShotPk = computed(() => (shotIndex.value > 0 ? shots.value[shotIndex.value - 1]?.pk ?? null : null));
    const nextShotPk = computed(() => {
      const index = shotIndex.value;
      return index >= 0 && index < shots.value.length - 1 ? shots.value[index + 1]?.pk ?? null : null;
    });
    const shotTab = computed(() => resolveShotTab(route.query.tab));

    /**
     * Navigates to a sibling shot while preserving the currently selected tab.
     */
    const navigateToShot = (targetShotPk: number | null) => {
      if (targetShotPk === null) return;
      router.push({
        path: `/session/${sessionPk.value}/shot/${targetShotPk}`,
        query: { tab: shotTab.value }
      });
    };
    const goToPrevShot = () => navigateToShot(prevShotPk.value);
    const goToNextShot = () => navigateToShot(nextShotPk.value);
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
    const formatAngle = (val: number | null | undefined) => {
      if (val === null || val === undefined) return '';
      const num = Number(val);
      return Number.isFinite(num) ? `${num.toFixed(1)}°` : '';
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
        { key: 'Post-shot stability 500 ms', value: s.post_shot_stability_500ms_mm != null ? `${s.post_shot_stability_500ms_mm.toFixed(1)} mm` : '' },
        { key: 'Post-shot max excursion 500 ms', value: s.post_shot_max_excursion_500ms_mm != null ? `${s.post_shot_max_excursion_500ms_mm.toFixed(1)} mm` : '' },
        { key: 'Post-shot max direction', value: formatAngle(s.post_shot_max_excursion_500ms_angle_deg) },
        { key: 'Pull direction', value: formatAngle(s.delta_pull_angle_deg) },
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
    return { items, home, details, timing, stability, prevShotPk, nextShotPk, goToPrevShot, goToNextShot };
  },
  template: `
    <div class="session-sidebar-content">
      <BreadCrumb :home="home" :model="items" data-testid="breadcrumb" class="p-mb-2" />
      <div class="shot-nav-controls">
        <Button
          data-testid="shot-prev"
          class="p-button-text shot-nav-button"
          :disabled="!prevShotPk"
          @click="goToPrevShot"
        >
          <template #icon><PrevIcon /></template>
          Previous shot
        </Button>
        <Button
          data-testid="shot-next"
          class="p-button-text shot-nav-button"
          :disabled="!nextShotPk"
          @click="goToNextShot"
        >
          <template #icon><NextIcon /></template>
          Next shot
        </Button>
      </div>
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
