import { defineComponent, reactive, computed, watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import store from '../store';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import SessionStats from './SessionStats';
import SessionAggregates from './SessionAggregates';
import { ensureData } from '../dataLoader';
import { getProcessedShots } from '../sessionData';

export default defineComponent({
  name: 'SessionView',
  components: { Tabs, TabList, Tab, TabPanels, TabPanel, SessionStats, SessionAggregates },
  setup() {
    const route = useRoute();
    const sessionPk = computed(() => Number(route.params.pk));
    const session = reactive<Record<string, any>>({});
    const loadError = ref<string | null>(null);
    const processedShots = computed(() => {
      const meta = store.sessions[sessionPk.value];
      void meta?.ready;
      return getProcessedShots(sessionPk.value);
    });
    const shots = computed(() => processedShots.value);
    const photo = computed(() => {
      return (
        (store.photos as Record<number, string>)[sessionPk.value] ||
        (session.photo as string | undefined)
      );
    });
    const syncSession = () => {
      const data = (store.sessions as Record<number, any>)[sessionPk.value];
      if (!data) {
        loadError.value = 'Session data is not available.';
        return;
      }
      loadError.value = null;
      Object.keys(session).forEach(key => {
        delete (session as Record<string, any>)[key];
      });
      Object.assign(session, data);
    };
    ensureData().then(ok => {
      if (!ok) {
        loadError.value = 'Session data is not available.';
        return;
      }
      syncSession();
    });
    watch(
      () => store.sessions[sessionPk.value],
      () => syncSession(),
      { immediate: true }
    );
    return { session, shots, processedShots, sessionPk, photo, loadError };
  },
  template: `
    <div class="session-view">
      <div v-if="loadError" class="session-view__error" data-testid="session-error">{{ loadError }}</div>
      <Tabs v-else value="stats">
        <TabList>
          <Tab value="stats">Session Stats</Tab>
          <Tab value="averages">Averages</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="stats">
            <SessionStats
              :shots="shots"
              :photo="photo"
              :processed-shots="processedShots"
              :session="session"
            />
          </TabPanel>
          <TabPanel value="averages">
            <SessionAggregates :shots="processedShots" :sessionPk="sessionPk" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  `
});
