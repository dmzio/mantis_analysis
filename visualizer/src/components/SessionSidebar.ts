import { defineComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import SessionShotList from './SessionShotList';
import { useCustomIcon } from '../icons';
import store from '../store';

const BackIcon = useCustomIcon('arrow_back');

export default defineComponent({
  name: 'SessionSidebar',
  components: { Button, SessionShotList, BackIcon },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const pk = Number(route.params.pk);
    const session = (store.sessions as Record<number, any>)[pk] || { shots: [] };
    const shots: any[] = session.shots || [];
    const goDash = () => router.push('/dashboard');
    return { shots, goDash };
  },
  template: `
    <div class="session-sidebar-content">
      <Button @click="goDash" class="p-button-sm">
        <template #icon><BackIcon /></template>
        Dashboard
      </Button>
      <SessionShotList :shots="shots" />
    </div>
  `
});
