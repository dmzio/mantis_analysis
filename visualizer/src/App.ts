import { defineComponent } from 'vue';
import Menubar from 'primevue/menubar';
import InputSwitch from 'primevue/inputswitch';
import router from './router';
import store, { resetStore } from './store';

export default defineComponent({
  name: 'AppRoot',
  components: { Menubar, InputSwitch },
  computed: {
    items() {
      return [ { label: 'Reset data', id: 'reset-menu', command: this.reset } ];
    }
  },
  data() {
    const dark = typeof localStorage === 'undefined'
      ? true
      : (localStorage.getItem('darkMode') ?? 'true') === 'true';
    return { dark };
  },
  mounted() {
    this.applyDark(this.dark);
  },
  watch: {
    dark(val: boolean) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('darkMode', String(val));
      }
      this.applyDark(val);
    }
  },
  methods: {
    async reset() {
      await resetStore();
      router.push('/');
    },
    applyDark(val: boolean) {
      document.body.classList.toggle('p-dark', val);
      document.body.setAttribute('data-theme', val ? 'lara-dark-blue' : 'lara-light-blue');
      document.body.classList.toggle('p-theme-lara-dark-blue', val);
      document.body.classList.toggle('p-theme-lara-light-blue', !val);
    }
  },
  template: `
    <div class="app-wrapper">
      <div class="topbar" v-if="$route.path !== '/'">
        <Menubar :model="items" class="main-menubar">
          <template #end>
            <InputSwitch v-model="dark" data-testid="theme-toggle" />
          </template>
        </Menubar>
      </div>
      <template v-if="$route.path !== '/'">
        <div class="app-body">
          <router-view name="sidebar" class="sidebar" />
          <div class="main-content">
            <router-view class="view-container" />
          </div>
        </div>
      </template>
      <router-view v-else class="view-container" />
    </div>
  `
});
