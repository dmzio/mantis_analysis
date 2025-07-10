import { defineComponent, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import store from '../store';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import SessionStats from './SessionStats';
import { ensureData } from '../dataLoader';

export default defineComponent({
  name: 'SessionView',
  components: { TabView, TabPanel, SessionStats },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const session = reactive<any>({ shots: [] as any[] });
    const shots = session.shots as any[];
    ensureData().then(ok => {
      if (!ok) {
        router.push('/');
        return;
      }
      const pk = Number(route.params.pk);
      const data = (store.sessions as Record<number, any>)[pk] || { shots: [] };
      Object.assign(session, data);
      session.shots = data.shots || [];
    });
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
