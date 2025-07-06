/* global Vue, APP */
(function (root) {
  const { createApp } = Vue;
  createApp({ template: `<router-view></router-view>` })
    .use(root.APP.router)
    .mount('#app');
})(this);
