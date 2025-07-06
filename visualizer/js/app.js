/* global Vue, APP */
(function (root) {
  const { createApp } = Vue;
  const app = createApp({ template: `<router-view></router-view>` });
  if (root.PrimeVue) {
    app.use(root.PrimeVue);
  }
  app.use(root.APP.router).mount('#app');
})(this);
