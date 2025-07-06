/* global VueRouter, APP */
(function (root) {
  const { createRouter, createWebHistory } = VueRouter;
  const routes = [
    { path: '/', component: root.APP.SessionViewer }
  ];
  root.APP.router = createRouter({
    history: createWebHistory(),
    routes
  });
})(this);
