import { defineComponent } from 'vue';
import Button from 'primevue/button';
import store from '../store';
import router from '../router';
import { getHandle, saveHandle } from '../fsHandles';

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
          await this.loadFromHandle(handle);
        }
      }
    },
    async pick() {
      if ('showDirectoryPicker' in window) {
        try {
          const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
          await saveHandle(handle);
          await this.loadFromHandle(handle);
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
      const done = () => { if (--remain === 0) router.push('/dashboard'); };
      files.forEach(f => {
        if (!f.name.endsWith('.json')) { done(); return; }
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const obj = JSON.parse((ev.target as FileReader).result as string);
            const id = obj.session?.pk ?? obj.pk;
            if (id !== undefined) {
              (store.sessions as Record<number, any>)[id] = obj.session || obj;
            }
          } catch (err) {
            console.error(err);
          }
          done();
        };
        reader.readAsText(f);
      });
    },
    async loadFromHandle(handle: FileSystemDirectoryHandle) {
      store.handle = handle;
      store.folder = handle.name;
      localStorage.setItem('data_folder', handle.name);
      store.sessions = {};
      const names: FileSystemHandle[] = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          names.push(entry);
        }
      }
      let processed = 0;
      for await (const entry of names) {
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          const text = await file.text();
          const obj = JSON.parse(text);
          const id = obj.session?.pk ?? obj.pk;
          if (id !== undefined) {
            (store.sessions as Record<number, any>)[id] = obj.session || obj;
          }
        } catch (err) {
          console.error(err);
        }
        processed++;
        if (processed === names.length) router.push('/dashboard');
      }
    }
  }
});
