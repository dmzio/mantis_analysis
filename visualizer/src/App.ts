import { defineComponent } from 'vue';
import Menubar from 'primevue/menubar';
import router from './router';
import store, { resetStore } from './store';

export default defineComponent({
  name: 'AppRoot',
  components: { Menubar },
  methods: {
    reset() {
      resetStore();
      router.push('/');
    }
  },
  computed: {
    items() {
      return [ { label: 'Reset data', id: 'reset-menu', command: this.reset } ];
    }
  },
  template: `
    <div>
      <Menubar v-if="$route.path !== '/'" :model="items" />
      <router-view></router-view>
    </div>
  `
});
