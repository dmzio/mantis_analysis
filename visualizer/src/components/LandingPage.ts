import { defineComponent } from 'vue';
import Button from 'primevue/button';
import store from '../store';
import router from '../router';
import { getHandle, saveHandle } from '../fsHandles';
import { loadFromHandle } from '../dataLoader';
import { parseSessionFile } from '../sessionParser';

export default defineComponent({
  name: 'LandingPage',
  components: { Button },
  template: `
      <div class="landing-page">
        <header>pick folder with session dumps</header>
        <p v-if="store.folder">Selected: {{ store.folder }}</p>
        <Button label="Select Folder" @click="pick" />
        <input ref="fallback" type="file" webkitdirectory multiple style="display:none" @change="chooseFallback" />
      </div>
    `,
  mounted() {
    this.autoLoad();
  },
  computed: {
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
    chooseFallback(e: Event) {
      const input = e.target as HTMLInputElement;
      const files = Array.from(input.files || []);
      if (!files.length) return;
      const prefix = (files[0].webkitRelativePath || '').split('/')[0];
      store.folder = prefix;
      localStorage.setItem('data_folder', prefix);
      store.sessions = {};
      let remain = files.length;
      store.loading = true;
      const done = () => {
        if (--remain === 0) {
          store.loading = false;
          router.push('/dashboard');
        }
      };
      files.forEach(f => {
        if (!f.name.endsWith('.json')) { done(); return; }
        parseSessionFile(f)
          .then(res => {
            if (res) {
              const [id, obj] = res;
              (store.sessions as Record<number, any>)[id] = obj;
            }
          })
          .catch(err => console.error(err))
          .finally(done);
      });
    }
  }
});
