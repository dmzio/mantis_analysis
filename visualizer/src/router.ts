import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import SessionViewer from './components/SessionViewer';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/dashboard', component: DashboardPage },
  { path: '/viewer', component: SessionViewer }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
