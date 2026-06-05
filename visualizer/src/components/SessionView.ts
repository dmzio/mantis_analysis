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
import DataAccessPrompt from './DataAccessPrompt';
import { ensureSessionData } from '../dataLoader';
import { getProcessedShotRevision, getProcessedShots } from '../sessionData';

export default defineComponent({
  name: 'SessionView',
  components: { Tabs, TabList, Tab, TabPanels, TabPanel, SessionStats, SessionAggregates, DataAccessPrompt },
  setup() {
    const route = useRoute();
    const sessionPk = computed(() => Number(route.params.pk));
    const session = reactive<Record<string, any>>({});
    const loadError = ref<string | null>(null);
    const loadingSession = ref(true);
    const needsDataAccess = ref(false);
    const dataAccessMessage = ref('');
    let loadSeq = 0;
    const processedShots = computed(() => {
      const meta = store.sessions[sessionPk.value];
      void meta?.ready;
      void getProcessedShotRevision(sessionPk.value);
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
        if (loadingSession.value) return;
        loadError.value = 'Session data is not available.';
        return;
      }
      loadingSession.value = false;
      loadError.value = null;
      Object.keys(session).forEach(key => {
        delete (session as Record<string, any>)[key];
      });
      Object.assign(session, data);
    };
    const loadSession = async () => {
      const seq = ++loadSeq;
      loadingSession.value = true;
      loadError.value = null;
      needsDataAccess.value = false;
      const result = await ensureSessionData(sessionPk.value);
      if (seq !== loadSeq) return;
      if (result.status === 'needs-user-action') {
        loadingSession.value = false;
        needsDataAccess.value = true;
        dataAccessMessage.value = result.message;
        return;
      }
      if (result.status !== 'ready') {
        loadingSession.value = false;
        loadError.value = result.message || 'Session data is not available.';
        return;
      }
      loadingSession.value = false;
      syncSession();
    };
    watch(
      () => store.sessions[sessionPk.value],
      () => syncSession(),
      { immediate: true }
    );
    watch(
      sessionPk,
      () => {
        void loadSession();
      },
      { immediate: true }
    );
    return {
      session,
      shots,
      processedShots,
      sessionPk,
      photo,
      loadError,
      loadingSession,
      needsDataAccess,
      dataAccessMessage,
      loadSession
    };
  },
  template: `
    <div class="session-view">
      <div v-if="loadingSession" class="session-view__loading" data-testid="session-loading">Loading session</div>
      <DataAccessPrompt
        v-else-if="needsDataAccess"
        :message="dataAccessMessage"
        @loaded="loadSession"
      />
      <div v-else-if="loadError" class="session-view__error" data-testid="session-error">{{ loadError }}</div>
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
