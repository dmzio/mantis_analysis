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
    <div class="layout-wrapper">
      <div class="layout-topbar" v-if="$route.path !== '/'">
        <Menubar :model="items" class="main-menubar" />
      </div>
      <router-view name="sidebar" class="layout-sidebar" />
      <div class="layout-main-container">
        <div class="layout-main">
          <router-view class="view-container" />
        </div>
      </div>
    </div>
  `
});
