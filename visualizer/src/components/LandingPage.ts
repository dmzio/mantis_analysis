import { defineComponent } from 'vue';
import store from '../store';
import router from '../router';

export default defineComponent({
  name: 'LandingPage',
  template: `
      <div class="landing-page">
        <header>pick folder with session dumps</header>
        <p v-if="store.folder">Selected: {{ store.folder }}</p>
        <input type="file" webkitdirectory multiple @change="choose" />
        <button v-if="store.folder && !hasSessions" @click="load">load</button>
      </div>
    `,
  mounted() {
    if (store.folder && Object.keys(store.sessions).length) {
      router.push('/dashboard');
    }
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
    choose(e: Event) {
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
    async load() {
      try {
        const listing = await fetch(store.folder + '/').then(r => r.text());
        const files = Array.from(listing.matchAll(/href="(\d+\.json)"/g)).map(m => m[1]);
        if (!files.length) return;
        store.sessions = {};
        let remain = files.length;
        const done = () => { if (--remain === 0) router.push('/dashboard'); };
        files.forEach(name => {
          fetch(store.folder + '/' + name)
            .then(r => r.json())
            .then(obj => {
              const id = obj.session?.pk ?? obj.pk;
              if (id !== undefined) {
                (store.sessions as Record<number, any>)[id] = obj.session || obj;
              }
            })
            .catch(err => console.error(err))
            .finally(done);
        });
      } catch (err) {
        console.error(err);
      }
    }
  }
});

