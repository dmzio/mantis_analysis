/* global VueRouter, APP */
(function (root) {
  const { createRouter, createWebHistory } = VueRouter;
  const routes = [
    { path: '/', component: root.APP.LandingPage },
    { path: '/dashboard', component: root.APP.DashboardPage },
    { path: '/viewer', component: root.APP.SessionViewer }
  ];
  root.APP.router = createRouter({
    history: createWebHistory(),
    routes
  });
})(this);
