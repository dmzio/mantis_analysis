import { defineComponent, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import TraceVisualizer from './RawTraceVisualizer';
import ProcessedTraceVisualizer from './ProcessedTraceVisualizer';
import ProcessedStabilityPlot from './ProcessedStabilityPlot';
import store from '../store';
import { ensureData } from '../dataLoader';

export default defineComponent({
  name: 'ShotDetailView',
  components: { TabView, TabPanel, TraceVisualizer, ProcessedTraceVisualizer, ProcessedStabilityPlot },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const shot = reactive<any>({});
    const processed = reactive<any>({});
    ensureData().then(ok => {
      if (!ok) { router.push('/'); return; }
      const spk = Number(route.params.spk);
      const pk = Number(route.params.pk);
      const session = (store.sessions as Record<number, any>)[spk];
      if (!session) { router.push('/'); return; }
      const found = (session.shots || []).find((s: any) => s.pk === pk);
      if (!found) { router.push('/'); return; }
      Object.assign(shot, found);
      const processedSession = (store.processed as Record<number, any>)[spk];
      const foundProc = processedSession?.shots?.find((s: any) => s.pk === pk);
      if (foundProc) Object.assign(processed, foundProc);
    });
    return { shot, processed };
  },
  template: `
    <div class="session-view">
      <TabView>
        <TabPanel header="Track">
          <div class="shot-layout">
            <div class="plot-row">
              <ProcessedStabilityPlot :shot="processed" trim-pre-shot />
              <ProcessedStabilityPlot :shot="processed" />
            </div>
            <div class="trace-row">
              <TraceVisualizer :shots="[shot]" />
              <ProcessedTraceVisualizer :shots="[processed]" />
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>
  `
});
