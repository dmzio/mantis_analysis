import { defineComponent } from 'vue';
import store from '../store';
import router from '../router';

export default defineComponent({
  name: 'LandingPage',
  template: `
      <div class="landing-page">
        <header>pick folder with session dumps</header>
        <input type="file" webkitdirectory multiple @change="choose" />
      </div>
    `,
  mounted() {
    if (store.folder && Object.keys(store.sessions).length) {
      router.push('/dashboard');
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
    }
  }
});
