import { defineComponent, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import TraceVisualizer from './TraceVisualizer';
import RawStabilityPlot from './RawStabilityPlot';
import store from '../store';
import { ensureData } from '../dataLoader';

export default defineComponent({
  name: 'ShotDetailView',
  components: { TabView, TabPanel, TraceVisualizer, RawStabilityPlot },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const shot = reactive<any>({});
    ensureData().then(ok => {
      if (!ok) { router.push('/'); return; }
      const spk = Number(route.params.spk);
      const pk = Number(route.params.pk);
      const session = (store.sessions as Record<number, any>)[spk];
      if (!session) { router.push('/'); return; }
      const found = (session.shots || []).find((s: any) => s.pk === pk);
      if (!found) { router.push('/'); return; }
      Object.assign(shot, found);
    });
    return { shot };
  },
  template: `
    <div class="session-view">
      <TabView>
        <TabPanel header="Track">
          <div class="shot-layout">
            <RawStabilityPlot :shot="shot" />
            <TraceVisualizer :shots="[shot]" />
          </div>
        </TabPanel>
      </TabView>
    </div>
  `
});
