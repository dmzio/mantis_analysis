import { defineComponent, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import SelectButton from 'primevue/selectbutton';
import TraceVisualizer from './RawTraceVisualizer';
import ProcessedTraceVisualizer from './ProcessedTraceVisualizer';
import ProcessedStabilityPlot from './ProcessedStabilityPlot';
import ProcessedSpeedPlot from './ProcessedSpeedPlot';
import AbsDeviationPlot from './AbsDeviationPlot';
import AbsSpeedPlot from './AbsSpeedPlot';
import RingStabilityPlot from './RingStabilityPlot';
import store from '../store';
import { ensureData } from '../dataLoader';
import { getProcessedShots, getSessionDrift } from '../sessionData';
import { processShot, SessionDriftEstimate, ShotData } from '../shotProcessor';
import { appSettings, getActiveDriftMode, type DriftMode } from '../appSettings';

type ShotTab = 'track' | 'raw';

/**
 * Normalizes a route query value into a known tab identifier.
 */
function normalizeShotTab(value: string | string[] | undefined): ShotTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === 'raw' ? 'raw' : 'track';
}

export default defineComponent({
  name: 'ShotDetailView',
  components: {
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    SelectButton,
    TraceVisualizer,
    ProcessedTraceVisualizer,
    ProcessedStabilityPlot,
    ProcessedSpeedPlot,
    AbsDeviationPlot,
    AbsSpeedPlot,
    RingStabilityPlot
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const sessionPk = computed(() => Number(route.params.spk));
    const shotPk = computed(() => Number(route.params.pk));
    const shot = ref<ShotData | null>(null);
    const processed = ref<any>({});
    const sessionDrift = ref<SessionDriftEstimate | null>(null);
    const shotMode = ref<DriftMode>(getActiveDriftMode());
    const displayShot = ref<ShotData | null>(null);
    const rawProcessed = ref<any>(null);
    const activeTab = ref<ShotTab>(normalizeShotTab(route.query.tab));
    const loadError = ref<string | null>(null);
    const shotModeOptions = [
      { label: 'Corrected', value: 'corrected' },
      { label: 'Original', value: 'original' }
    ];

    const hydrateShot = () => {
      const shotsArr = getProcessedShots(sessionPk.value, shotMode.value);
      if (!shotsArr.length) {
        loadError.value = 'Shot data is not yet available.';
        return false;
      }
      const found = shotsArr.find((s: any) => s.pk === shotPk.value);
      if (!found) {
        loadError.value = `Shot ${shotPk.value} is unavailable.`;
        return false;
      }
      loadError.value = null;
      shot.value = {
        ...found,
        pitch: Array.isArray(found.pitch) ? [...found.pitch] : [],
        yaw: Array.isArray(found.yaw) ? [...found.yaw] : []
      };
      processed.value = { ...found };
      sessionDrift.value = getSessionDrift(sessionPk.value);
      return true;
    };

    ensureData().then(ok => {
      if (!ok) {
        loadError.value = 'Session data is not available.';
        return;
      }
      const meta = (store.sessions as Record<number, any>)[sessionPk.value];
      if (!meta) {
        loadError.value = 'Session data is not available.';
        return;
      }
      hydrateShot();
    });

    watch(
      () => [(store.sessions as Record<number, any>)[sessionPk.value]?.ready, shotPk.value, shotMode.value],
      ([ready]) => {
        if (ready) {
          hydrateShot();
        }
      },
      { immediate: true }
    );

    watch(
      () => [sessionPk.value, shotPk.value],
      () => {
        shotMode.value = getActiveDriftMode();
      }
    );

    watch(() => appSettings.driftCorrection, () => {
      shotMode.value = getActiveDriftMode();
    });

    watch(
      () => route.query.tab,
      tabValue => {
        activeTab.value = normalizeShotTab(tabValue);
      },
      { immediate: true }
    );

    watch(
      activeTab,
      nextTab => {
        if (normalizeShotTab(route.query.tab) === nextTab) {
          return;
        }
        const basePath = route.fullPath.split('?')[0];
        const nextQuery = { ...route.query, tab: nextTab };
        void router.replace({ path: basePath, query: nextQuery, hash: route.hash });
      }
    );

    watch(
      [shot],
      () => {
        if (!shot.value) {
          displayShot.value = null;
          rawProcessed.value = null;
          return;
        }
        const display = {
          ...shot.value,
          pitch: [...shot.value.pitch],
          yaw: [...shot.value.yaw]
        };
        displayShot.value = display;
        rawProcessed.value = processShot({
          ...display,
          pitch: [...display.pitch],
          yaw: [...display.yaw]
        });
      },
      { immediate: true, deep: true }
    );

    const driftAvailable = computed(() => !!sessionDrift.value);
    const driftSummary = computed(() => {
      if (!sessionDrift.value) return 'No valid hold window data.';
      const { yawSlope, pitchSlope, usedShots, shotCount, amplitude } = sessionDrift.value;
      const yaw = Number.isFinite(yawSlope) ? yawSlope : 0;
      const pitch = Number.isFinite(pitchSlope) ? pitchSlope : 0;
      const amp = Number.isFinite(amplitude) ? amplitude : 0;
      const used = Number.isFinite(usedShots) ? usedShots : 0;
      const total = Number.isFinite(shotCount) ? shotCount : 0;
      const slopeText = `${yaw.toFixed(3)}°/s, ${pitch.toFixed(3)}°/s`;
      const shotsText = `${used}/${total} shots`;
      return `${shotsText}; amp ${amp.toFixed(2)}°; slopes ${slopeText}`;
    });

    return {
      shot,
      processed,
      displayShot,
      rawProcessed,
      shotMode,
      shotModeOptions,
      driftAvailable,
      driftSummary,
      activeTab,
      loadError
    };
  },
  template: `
    <div class="session-view">
      <div v-if="loadError" class="session-view__error" data-testid="shot-error">{{ loadError }}</div>
      <Tabs v-else v-model:value="activeTab">
        <TabList>
          <Tab value="track">Track</Tab>
          <Tab value="raw">Raw</Tab>
        </TabList>
        <div class="shot-mode-bar">
          <div class="drift-toggle">
            <label class="drift-label">
              <span>Track data</span>
              <SelectButton
                v-model="shotMode"
                :options="shotModeOptions"
                optionLabel="label"
                optionValue="value"
                :disabled="!driftAvailable"
                data-testid="shot-mode-select"
              />
            </label>
            <small class="drift-summary">{{ driftSummary }}</small>
          </div>
        </div>
        <TabPanels>
          <TabPanel value="track">
            <div class="shot-layout">
              <div class="plot-row">
                <AbsDeviationPlot :shot="processed" />
                <ProcessedStabilityPlot :shot="processed" />
              </div>
              <div class="plot-row">
                <AbsSpeedPlot :shot="processed" />
                <ProcessedSpeedPlot :shot="processed" />
              </div>
              <div class="plot-row">
                <RingStabilityPlot :shot="processed" />
                <ProcessedTraceVisualizer :shots="[processed]" title="Processed trace" />
              </div>
            </div>
          </TabPanel>
          <TabPanel value="raw">
            <div class="shot-layout">
              <div class="plot-row">
                <ProcessedStabilityPlot v-if="rawProcessed" :shot="rawProcessed" trim-pre-shot />
              </div>
              <div class="trace-row">
                <TraceVisualizer :shots="displayShot ? [displayShot] : []" title="Raw trace" />
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  `
});
