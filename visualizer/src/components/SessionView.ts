import { defineComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import store from '../store';
import Button from 'primevue/button';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import SessionShotList from './SessionShotList';
import SessionStats from './SessionStats';
import { useCustomIcon } from '../icons';
const BackIcon = useCustomIcon('arrow_back');

export default defineComponent({
  name: 'SessionView',
  components: { Button, TabView, TabPanel, SessionShotList, SessionStats, BackIcon },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const pk = Number(route.params.pk);
    const session =
      store.sessions.find((s: any) => (s.session?.pk ?? s.pk) === pk) || {
        session: { shots: [] },
        shots: []
      };
    const shots: any[] = session.session?.shots || session.shots || [];
    const goDash = () => router.push('/dashboard');
    return { session, shots, goDash };
  },
  template: `
    <div class="session-view">
      <div class="left">
        <Button @click="goDash" class="p-button-sm">
          <template #icon>
            <BackIcon />
          </template>
          Dashboard
        </Button>
        <SessionShotList :shots="shots" />
      </div>
      <div class="right">
        <TabView>
          <TabPanel header="Session Stats">
            <SessionStats :shots="shots" />
          </TabPanel>
        </TabView>
      </div>
    </div>
  `
});
