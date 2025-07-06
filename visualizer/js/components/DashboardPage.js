/* global Vue, APP */
(function(root, factory){
  if(typeof module === 'object' && module.exports){
    module.exports = factory(require('vue'), require('../store.js').default);
  } else {
    (root.APP = root.APP || {}).DashboardPage = factory(root.Vue, root.APP.store);
  }
})(this, function(Vue, store){
  return {
    name: 'DashboardPage',
    template: `
      <div class="dashboard-page">
        <header>Sessions</header>
        <ul>
          <li v-for="(s, i) in store.sessions" :key="i">{{ s.session?.name || s.name || 'session '+(i+1) }}</li>
        </ul>
      </div>
    `,
    computed:{
      store(){ return store; }
    }
  };
});
