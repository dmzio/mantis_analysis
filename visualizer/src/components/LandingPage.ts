import { defineComponent } from 'vue';
import Button from 'primevue/button';
import store from '../store';
import router from '../router';
import { getHandle, saveHandle } from '../fsHandles';
import { loadFromHandle, loadFromFileList } from '../dataLoader';
import logoUrl from '../assets/deep-mantis.svg';

export default defineComponent({
  name: 'LandingPage',
  components: { Button },
  template: `
      <section class="landing-page">
        <div class="landing-card">
          <div class="landing-card__copy">
            <h1>Deep Mantis</h1>
            <h2>Session explorer</h2>
            <p class="landing-subhead">pick folder with session dumps to begin</p>
            <p class="landing-lead">Import recorded training sessions, visualise every shot trace and review performance trends in a focused workspace.</p>
            <ul class="landing-highlights">
              <li>Interactive dashboards tailored for air pistol trainings.</li>
              <li>Automatic shot processing with stability, speed and accuracy insights.</li>
              <li>Dark and light themes for comfortable analysis in any environment.</li>
            </ul>
            <div class="landing-actions">
              <Button label="Select Folder" icon="pi pi-folder-open" @click="pick" />
              <span v-if="store.folder" class="landing-selected">
                <i class="pi pi-check-circle"></i>
                Selected: {{ store.folder }}
              </span>
            </div>
          </div>
          <div class="landing-card__visual" aria-hidden="true">
            <img class="landing-logo" :src="logoUrl" alt="" />
          </div>
        </div>
        <input ref="fallback" type="file" multiple style="display:none" @change="chooseFallback" />
      </section>
    `,
  mounted() {
    this.autoLoad();
  },
  computed: {
    logoUrl() {
      return logoUrl;
    },
    store() {
      return store;
    },
    hasSessions() {
      return Object.keys(store.sessions).length > 0;
    }
  },
  methods: {
    async autoLoad() {
      if (store.folder && Object.keys(store.sessions).length) {
        router.push('/dashboard');
        return;
      }
      const handle = await getHandle();
      if (handle) {
        const perm = await handle.queryPermission({ mode: 'read' });
        if (perm === 'granted') {
          await loadFromHandle(handle);
          router.push('/dashboard');
        }
      }
    },
    async pick() {
      if ('showDirectoryPicker' in window) {
        try {
          const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
          await saveHandle(handle);
          await loadFromHandle(handle);
          router.push('/dashboard');
        } catch (err) {
          console.error(err);
        }
      } else {
        const input = this.$refs.fallback as HTMLInputElement;
        input.click();
      }
    },
    async chooseFallback(e: Event) {
      const input = e.target as HTMLInputElement;
      const files = Array.from(input.files || []);
      if (!files.length) return;
      await loadFromFileList(files);
      router.push('/dashboard');
    }
  }
});
