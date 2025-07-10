import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import { RouterLink } from 'vue-router';
import SessionShotList from './SessionShotList';
import { useCustomIcon } from '../icons';
import store from '../store';

const BackIcon = useCustomIcon('arrow_back');

export default defineComponent({
  name: 'SessionSidebar',
  components: { Button, SessionShotList, BackIcon, RouterLink },
  setup() {
    const route = useRoute();
    const shots = computed(() => {
      const pk = Number(route.params.pk);
      const session = (store.sessions as Record<number, any>)[pk] || { shots: [] };
      return session.shots || [];
    });
    return { shots };
  },
  template: `
    <div class="session-sidebar-content">
      <RouterLink to="/dashboard" class="p-button p-button-sm">
        <span class="p-button-icon p-button-icon-left"><BackIcon /></span>
        <span class="p-button-label">Dashboard</span>
      </RouterLink>
      <SessionShotList :shots="shots" />
    </div>
  `
});
