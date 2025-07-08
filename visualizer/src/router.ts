import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import SessionViewer from './components/SessionViewer';
import SessionView from './components/SessionView';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/dashboard', component: DashboardPage },
  { path: '/viewer', component: SessionViewer },
  { path: '/session/:pk', component: SessionView }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
