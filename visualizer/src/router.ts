import { createRouter, createWebHashHistory } from 'vue-router';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import SessionViewer from './components/SessionViewer';
import SessionView from './components/SessionView';
import SessionSidebar from './components/SessionSidebar';
import ShotDetailView from './components/ShotDetailView';
import ShotDetailSidebar from './components/ShotDetailSidebar';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/dashboard', component: DashboardPage },
  { path: '/viewer', component: SessionViewer },
  { path: '/session/:pk', components: { default: SessionView, sidebar: SessionSidebar } },
  { path: '/session/:spk/shot/:pk', components: { default: ShotDetailView, sidebar: ShotDetailSidebar } }
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL === './' ? '' : import.meta.env.BASE_URL),
  routes
});

export default router;
