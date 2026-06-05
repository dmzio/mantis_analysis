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
import DataAccessPrompt from './DataAccessPrompt';
import store from '../store';
import { ensureShotData } from '../dataLoader';
import { getProcessedShotRevision, getProcessedShots, getSessionDrift } from '../sessionData';
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
    RingStabilityPlot,
    DataAccessPrompt
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
    const loadingShot = ref(true);
    const needsDataAccess = ref(false);
    const dataAccessMessage = ref('');
    let loadSeq = 0;
    const shotModeOptions = [
      { label: 'Corrected', value: 'corrected' },
      { label: 'Original', value: 'original' }
    ];

    const hydrateShot = () => {
      void getProcessedShotRevision(sessionPk.value);
      const shotsArr = getProcessedShots(sessionPk.value, shotMode.value);
      if (!shotsArr.length) {
        if (loadingShot.value) return false;
        loadError.value = 'Shot data is not yet available.';
        return false;
      }
      const found = shotsArr.find((s: any) => s.pk === shotPk.value);
      if (!found) {
        if (loadingShot.value) return false;
        loadError.value = `Shot ${shotPk.value} is unavailable.`;
        return false;
      }
      loadingShot.value = false;
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

    const loadShot = async () => {
      const seq = ++loadSeq;
      loadingShot.value = true;
      loadError.value = null;
      needsDataAccess.value = false;
      const result = await ensureShotData(sessionPk.value, shotPk.value);
      if (seq !== loadSeq) return;
      if (result.status === 'needs-user-action') {
        loadingShot.value = false;
        needsDataAccess.value = true;
        dataAccessMessage.value = result.message;
        return;
      }
      if (result.status !== 'ready') {
        loadingShot.value = false;
        loadError.value = result.message || 'Session data is not available.';
        return;
      }
      loadingShot.value = false;
      hydrateShot();
    };

    watch(
      () => [
        (store.sessions as Record<number, any>)[sessionPk.value]?.ready,
        getProcessedShotRevision(sessionPk.value),
        shotPk.value,
        shotMode.value
      ],
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
        void loadShot();
      },
      { immediate: true }
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
      loadError,
      loadingShot,
      needsDataAccess,
      dataAccessMessage,
      loadShot
    };
  },
  template: `
    <div class="session-view">
      <div v-if="loadingShot" class="session-view__loading" data-testid="shot-loading">Loading shot</div>
      <DataAccessPrompt
        v-else-if="needsDataAccess"
        :message="dataAccessMessage"
        @loaded="loadShot"
      />
      <div v-else-if="loadError" class="session-view__error" data-testid="shot-error">{{ loadError }}</div>
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
