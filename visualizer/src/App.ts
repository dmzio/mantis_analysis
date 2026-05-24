import { defineComponent } from 'vue';
import Menubar from 'primevue/menubar';
import ToggleSwitch from 'primevue/toggleswitch';
import ProgressSpinner from 'primevue/progressspinner';
import ProgressBar from 'primevue/progressbar';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import router from './router';
import store, { resetStore } from './store';
import {
  DEFAULT_TRACE_STYLE,
  TRACE_STYLE_OPTIONS,
  TraceStyleId,
  setActiveTraceStyle
} from './traceStyles';

export default defineComponent({
  name: 'AppRoot',
  components: { Menubar, ToggleSwitch, ProgressSpinner, ProgressBar, Dialog, Button, SelectButton },
  computed: {
    store() {
      return store;
    },
    items() {
      return [ { label: 'Reset data', id: 'reset-menu', command: this.reset } ];
    },
    loaderPercent(): number {
      const { total, processed } = store.loader;
      if (!total) return 0;
      return Math.round((processed / total) * 100);
    },
    loaderMessage(): string {
      return store.loader.message;
    }
  },
  data() {
    const storedSettings = typeof localStorage === 'undefined'
      ? {}
      : JSON.parse(localStorage.getItem('appSettings') || '{}');
    const legacyDark = typeof localStorage === 'undefined'
      ? true
      : (localStorage.getItem('darkMode') ?? 'true') === 'true';
    const dark = storedSettings.dark ?? legacyDark;
    const traceStyle = (storedSettings.traceStyle as TraceStyleId) ?? DEFAULT_TRACE_STYLE;
    return {
      dark,
      traceStyle,
      traceStyleOptions: TRACE_STYLE_OPTIONS,
      showSettings: false,
      pendingSettings: { dark, traceStyle }
    };
  },
  mounted() {
    this.applyDark(this.dark);
    this.applyTraceStyle(this.traceStyle);
  },
  watch: {
    dark(val: boolean) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('darkMode', String(val));
      }
      this.persistSettings({ dark: val });
      this.applyDark(val);
    },
    traceStyle(val: TraceStyleId) {
      this.persistSettings({ traceStyle: val });
      this.applyTraceStyle(val);
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
    },
    applyTraceStyle(val: TraceStyleId) {
      setActiveTraceStyle(val);
    },
    persistSettings(partial: Record<string, unknown>) {
      if (typeof localStorage === 'undefined') return;
      const current = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const next = { ...current, ...partial };
      localStorage.setItem('appSettings', JSON.stringify(next));
    },
    openSettings() {
      this.pendingSettings = { dark: this.dark, traceStyle: this.traceStyle };
      this.showSettings = true;
    },
    cancelSettings() {
      this.pendingSettings = { dark: this.dark, traceStyle: this.traceStyle };
      this.showSettings = false;
    },
    saveSettings() {
      this.dark = this.pendingSettings.dark;
      this.traceStyle = this.pendingSettings.traceStyle;
      this.showSettings = false;
    }
  },
  template: `
    <div class="app-wrapper">
      <div v-if="store.loading" class="loading-overlay">
        <ProgressSpinner style="width:150px;height:150px" />
      </div>
      <div class="topbar" v-if="$route.path !== '/'">
        <Menubar :model="items" class="main-menubar">
          <template #end>
            <Button
              icon="pi pi-cog"
              class="p-button-rounded p-button-text settings-btn"
              aria-label="Open settings"
              @click="openSettings"
            />
            <ToggleSwitch v-model="dark" data-testid="theme-toggle" />
          </template>
        </Menubar>
      </div>
      <div v-if="store.loader.active && !store.loading" class="loader-banner">
        <ProgressBar :value="loaderPercent">
          <span>{{ loaderMessage }}</span>
        </ProgressBar>
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

      <Dialog
        v-model:visible="showSettings"
        modal
        header="Settings"
        :style="{ width: '480px', maxWidth: '90vw' }"
      >
        <div class="settings-form">
          <label class="settings-field">
            <span>Dark mode</span>
            <ToggleSwitch v-model="pendingSettings.dark" />
          </label>
          <label class="settings-field">
            <span>Trace visualizer style</span>
            <SelectButton
              v-model="pendingSettings.traceStyle"
              :options="traceStyleOptions"
              optionLabel="label"
              optionValue="value"
            />
          </label>
        </div>
        <template #footer>
          <Button label="Cancel" class="p-button-text" @click="cancelSettings" />
          <Button label="Save" @click="saveSettings" />
        </template>
      </Dialog>
    </div>
  `
});
