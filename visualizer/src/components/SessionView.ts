import { defineComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import store from '../store';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import SessionStats from './SessionStats';

export default defineComponent({
  name: 'SessionView',
  components: { TabView, TabPanel, SessionStats },
  setup() {
    const route = useRoute();
    const router = useRouter();
    if (!Object.keys(store.sessions).length) {
      router.push('/');
      return { session: {}, shots: [] };
    }
    const pk = Number(route.params.pk);
    const session =
      (store.sessions as Record<number, any>)[pk] || {
        shots: []
      };
    const shots: any[] = session.shots || [];
    return { session, shots };
  },
  template: `
    <div class="session-view">
      <TabView>
        <TabPanel header="Session Stats">
          <SessionStats :shots="shots" />
        </TabPanel>
      </TabView>
    </div>
  `
});
