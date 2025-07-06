/* global Vue, APP */
(function(root, factory){
  if(typeof module === 'object' && module.exports){
    module.exports = factory(require('vue'), require('../store.js').default);
  } else {
    (root.APP = root.APP || {}).LandingPage = factory(root.Vue, root.APP.store);
  }
})(this, function(Vue, store){
  return {
    name: 'LandingPage',
    template: `
      <div class="landing-page">
        <header>pick folder with session dumps</header>
        <input type="file" webkitdirectory multiple @change="choose" />
      </div>
    `,
    methods: {
      choose(e){
        const files = Array.from(e.target.files || []);
        if(!files.length) return;
        const prefix = (files[0].webkitRelativePath || '').split('/')[0];
        store.folder = prefix;
        localStorage.setItem('data_folder', prefix);
        store.sessions = [];
        let remain = files.length;
        const done = () => { if(--remain===0){ root.APP.router.push('/dashboard'); } };
        files.forEach(f=>{
          if(!f.name.endsWith('.json')){ done(); return; }
          const reader = new FileReader();
          reader.onload = ev => { try{ store.sessions.push(JSON.parse(ev.target.result)); }catch(err){ console.error(err); } done(); };
          reader.readAsText(f);
        });
      }
    }
  };
});
