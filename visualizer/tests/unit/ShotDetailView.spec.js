import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import router from '../../src/router';
import store from '../../src/store';
import ShotDetailView from '../../src/components/ShotDetailView';
import ShotDetailSidebar from '../../src/components/ShotDetailSidebar';
import { nextTick } from 'vue';
import { cacheProcessedShots, clearSessionData } from '../../src/sessionData';

const sampleShot = {
  pk: 11,
  pitch: [0, 0],
  yaw: [0, 0],
  shot_index: 1,
  percent_10: 0.5
};

function seed() {
  clearSessionData();
  store.sessions = { 1: { pk: 1, ready: true } };
  cacheProcessedShots(1, [sampleShot]);
}

beforeEach(() => {
  seed();
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
          Tabs: {
            props: ['value'],
            emits: ['update:value'],
            template: '<div><slot /></div>'
          },
          TabList: { template: '<div><slot /></div>' },
          Tab: { template: '<button><slot /></button>' },
          TabPanels: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          RawTraceVisualizer: { template: '<svg></svg>' },
          ProcessedTraceVisualizer: { template: '<svg></svg>' },
          ProcessedStabilityPlot: { template: '<canvas></canvas>' },
          ProcessedSpeedPlot: { template: '<canvas></canvas>' },
          AbsDeviationPlot: { template: '<canvas></canvas>' },
          AbsSpeedPlot: { template: '<canvas></canvas>' },
          RingStabilityPlot: { template: '<canvas></canvas>' },
          ToggleSwitch: { template: '<input type="checkbox" />' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    await nextTick();
    await nextTick();
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
          BreadCrumb: { template: '<nav data-testid="breadcrumb"></nav>' },
          Button: {
            inheritAttrs: false,
            props: ['disabled'],
            template: '<button :disabled="disabled" v-bind="$attrs"><slot name="icon"></slot><slot /></button>'
          }
        }
      }
    });
    expect(wrapper.find('[data-testid="shot-details"]').exists()).toBe(true);
  });

  it('shows an error when shot metadata is missing', async () => {
    clearSessionData();
    store.sessions = {};
    await router.push('/session/2/shot/1');
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(ShotDetailView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          Tabs: {
            props: ['value'],
            emits: ['update:value'],
            template: '<div><slot /></div>'
          },
          TabList: { template: '<div><slot /></div>' },
          Tab: { template: '<button><slot /></button>' },
          TabPanels: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          RawTraceVisualizer: { template: '<svg></svg>' },
          ProcessedTraceVisualizer: { template: '<svg></svg>' },
          ProcessedStabilityPlot: { template: '<canvas></canvas>' },
          AbsDeviationPlot: { template: '<canvas></canvas>' },
          AbsSpeedPlot: { template: '<canvas></canvas>' },
          RingStabilityPlot: { template: '<canvas></canvas>' },
          ToggleSwitch: { template: '<input type="checkbox" />' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    await Promise.resolve();
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="shot-error"]').exists()).toBe(true);
  });
});
