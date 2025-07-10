import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import router from '../../src/router';
import store from '../../src/store';
import ShotDetailView from '../../src/components/ShotDetailView';
import ShotDetailSidebar from '../../src/components/ShotDetailSidebar';

store.sessions = { 1: { pk: 1, shots: [{ pk: 11, pitch:[0,0], yaw:[0,0] }] } };

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
});

describe('ShotDetailView', () => {
  it('shows trace', async () => {
    await router.push('/session/1/shot/11');
    const wrapper = mount(ShotDetailView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          TabView: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          TraceVisualizer: { template: '<svg></svg>' }
        }
      }
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('renders sidebar with breadcrumb', async () => {
    await router.push('/session/1/shot/11');
    const wrapper = mount(ShotDetailSidebar, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: { template: '<table data-testid="shot-details"></table>' },
          Column: { template: '<td></td>' },
          BreadCrumb: { template: '<nav data-testid="breadcrumb"></nav>' }
        }
      }
    });
    expect(wrapper.find('[data-testid="shot-details"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(true);
  });

  it('redirects when missing', async () => {
    store.sessions = {};
    await router.push('/session/2/shot/1');
    const push = vi.fn();
    router.push = push;
    mount(ShotDetailView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          TabView: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          TraceVisualizer: { template: '<svg></svg>' }
        }
      }
    });
    await Promise.resolve();
    expect(push).toHaveBeenCalledWith('/');
  });
});
