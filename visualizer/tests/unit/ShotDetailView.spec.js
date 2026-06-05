import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import router from '../../src/router';
import store from '../../src/store';
import ShotDetailView from '../../src/components/ShotDetailView';
import ShotDetailSidebar from '../../src/components/ShotDetailSidebar';
import { nextTick } from 'vue';
import { cacheProcessedShots, clearSessionData } from '../../src/sessionData';
import { appSettings, resetAppSettings } from '../../src/appSettings';
import * as loader from '../../src/dataLoader';

vi.mock('primevue/chart', () => ({
  default: { name: 'Chart', template: '<canvas></canvas>' }
}));

const sampleShot = {
  pk: 11,
  pitch: [0, 0],
  yaw: [0, 0],
  shot_index: 1,
  percent_10: 0.5
};

function seed() {
  clearSessionData();
  resetAppSettings();
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
  let ensureShotSpy;

  beforeEach(() => {
    ensureShotSpy = vi.spyOn(loader, 'ensureShotData').mockResolvedValue({ status: 'ready', message: '' });
  });

  afterEach(() => {
    ensureShotSpy.mockRestore();
  });

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
          SelectButton: { template: '<div data-testid="shot-mode-select"></div>' },
          DataAccessPrompt: { props: ['message'], template: '<div data-testid="data-access-prompt">{{ message }}</div>' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    await vi.waitFor(() => {
      expect(wrapper.find('svg').exists()).toBe(true);
    });
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
    ensureShotSpy.mockResolvedValue({ status: 'missing-shot', message: 'Shot 1 is unavailable.' });
    await router.push('/session/2/shot/1');
    const originalPush = router.push;
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
          SelectButton: { template: '<div data-testid="shot-mode-select"></div>' },
          DataAccessPrompt: { props: ['message'], template: '<div data-testid="data-access-prompt">{{ message }}</div>' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="shot-error"]').exists()).toBe(true);
    });
    expect(push).not.toHaveBeenCalled();
    router.push = originalPush;
  });

  it('defaults to global drift mode and can inspect the original shot locally', async () => {
    clearSessionData();
    resetAppSettings();
    appSettings.driftCorrection = true;
    store.sessions = { 1: { pk: 1, ready: true } };
    cacheProcessedShots(1, {
      original: [{ ...sampleShot, percent_10: 0.25 }],
      corrected: [{ ...sampleShot, percent_10: 0.75, drift_correction: { method: 'session_hold_linear' } }],
      drift: { method: 'session_hold_linear', yawSlope: 1, pitchSlope: 0 }
    });
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
          SelectButton: { template: '<div data-testid="shot-mode-select"></div>' },
          DataAccessPrompt: { props: ['message'], template: '<div data-testid="data-access-prompt">{{ message }}</div>' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    await vi.waitFor(() => {
      expect(wrapper.vm.processed.percent_10).toBe(0.75);
    });
    expect(wrapper.vm.shotMode).toBe('corrected');
    wrapper.vm.shotMode = 'original';
    await nextTick();
    expect(wrapper.vm.processed.percent_10).toBe(0.25);
  });

  it('shows a data access prompt when a shot deep link needs folder access', async () => {
    clearSessionData();
    store.sessions = {};
    ensureShotSpy.mockResolvedValue({
      status: 'needs-user-action',
      message: 'Select the session export folder to continue.'
    });
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
          DataAccessPrompt: { props: ['message'], template: '<div data-testid="data-access-prompt">{{ message }}</div>' }
        }
      }
    });

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="data-access-prompt"]').exists()).toBe(true);
    });
    expect(wrapper.find('[data-testid="data-access-prompt"]').text()).toContain('Select the session export folder');
  });
});
