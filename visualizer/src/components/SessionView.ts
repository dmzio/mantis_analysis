import { defineComponent, reactive, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import store from '../store';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import SessionStats from './SessionStats';
import SessionAggregates from './SessionAggregates';
import { ensureData } from '../dataLoader';

export default defineComponent({
  name: 'SessionView',
  components: { TabView, TabPanel, SessionStats, SessionAggregates },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const sessionPk = computed(() => Number(route.params.pk));
    const session = reactive<any>({ shots: [] as any[] });
    const shots = computed(() => session.shots as any[]);
    const photo = computed(() => session.photo as string | undefined);
    const processedShots = computed(() => {
      const psession = (store.processed as Record<number, any>)[sessionPk.value] || { shots: [] };
      return psession.shots || [];
    });
    ensureData().then(ok => {
      if (!ok) {
        router.push('/');
        return;
      }
      const data = (store.sessions as Record<number, any>)[sessionPk.value] || { shots: [] };
      Object.assign(session, data);
      session.shots = data.shots || [];
    });
    return { session, shots, processedShots, sessionPk, photo };
  },
  template: `
    <div class="session-view">
      <TabView>
        <TabPanel header="Session Stats">
          <SessionStats :shots="shots" :photo="photo" />
        </TabPanel>
        <TabPanel header="Averages">
          <SessionAggregates :shots="processedShots" :sessionPk="sessionPk" />
        </TabPanel>
      </TabView>
    </div>
  `
});
