import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import router from "../../src/router";
import store from "../../src/store";
import SessionView from "../../src/components/SessionView";
import SessionSidebar from "../../src/components/SessionSidebar";
import { cacheProcessedShots, clearSessionData } from "../../src/sessionData";
import * as loader from "../../src/dataLoader";

vi.mock('primevue/chart', () => ({
  default: { name: 'Chart', template: '<canvas></canvas>' }
}));

const sampleShot = {
  pk: 11,
  score: "95",
  percent_10: 0.5,
  length_1s: 1,
  delta_pull: 0.2,
  abs_deviation_moa: [0, 1],
  abs_speed_mm_s: [1, 1],
  ring_position: [10, 9],
  shot_index: 1,
  start_index: 0,
  pull_index_calc: 0,
  sample_rate: 1,
  pitch: [0, 0],
  yaw: [0, 0]
};

const sessionViewStateStubs = {
  Tabs: { template: '<div><slot /></div>' },
  TabList: { template: '<div><slot /></div>' },
  Tab: { template: '<button><slot /></button>' },
  TabPanels: { template: '<div><slot /></div>' },
  TabPanel: { template: '<div><slot /></div>' },
  RawTraceVisualizer: { template: '<svg></svg>' },
  Chart: { template: '<canvas></canvas>' },
  DataAccessPrompt: { props: ['message'], template: '<div data-testid="data-access-prompt">{{ message }}</div>' }
};

function seedStore() {
  clearSessionData();
  store.sessions = {
    1: { pk: 1, photo: "/foo.jpg", ready: true }
  };
  store.aggregates = {
    1: { stats: { length_1s: { mean: 1, sd: 0 } }, metrics: {} }
  };
  cacheProcessedShots(1, [sampleShot]);
}

beforeEach(() => {
  seedStore();
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
});

describe("SessionView", () => {
  let ensureSpy;

  beforeEach(() => {
    ensureSpy = vi.spyOn(loader, 'ensureSessionData').mockResolvedValue({ status: 'ready', message: '' });
  });

  afterEach(() => {
    ensureSpy.mockRestore();
  });

  it("shows stats", async () => {
    await router.push('/session/1');
    const wrapper = mount(SessionView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          Tabs: { template: '<div><slot /></div>' },
          TabList: { template: '<div><slot /></div>' },
          Tab: { template: '<button><slot /></button>' },
          TabPanels: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          RawTraceVisualizer: { template: '<svg></svg>' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    await vi.waitFor(() => {
      expect(wrapper.find('svg').exists()).toBe(true);
    });
    expect(wrapper.find('img.session-photo').attributes('src')).toBe('/foo.jpg');
  });

  it("renders sidebar with shot list", async () => {
    await router.push('/session/1');
    const wrapper = mount(SessionSidebar, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: {
            props: ['scrollHeight', 'scrollable', 'virtualScrollerOptions'],
            template: '<div data-testid="shot-table"><slot /></div>'
          },
          Column: { template: '<div></div>' },
          BreadCrumb: { template: '<nav data-testid="breadcrumb"></nav>' }
        }
      }
    });
    expect(wrapper.find('[data-testid="shot-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(true);
  });

  it("keeps dashboard breadcrumb navigation inside the router", async () => {
    await router.push('/session/1');
    const breadcrumbStub = {
      name: 'BreadCrumb',
      props: ['home', 'model'],
      template: '<nav data-testid="breadcrumb"></nav>'
    };
    const wrapper = mount(SessionSidebar, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          BreadCrumb: breadcrumbStub,
          SessionShotList: { template: '<div></div>' }
        }
      }
    });
    const breadcrumb = wrapper.findComponent({ name: 'BreadCrumb' });
    const preventDefault = vi.fn();
    const push = vi.spyOn(router, 'push').mockResolvedValue();
    breadcrumb.props('home').command({ originalEvent: { preventDefault } });
    expect(preventDefault).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/dashboard');
    push.mockRestore();
  });

  it("shows an error when there is no session data", async () => {
    clearSessionData();
    store.sessions = {};
    ensureSpy.mockResolvedValue({ status: 'missing-session', message: 'Session data is not available.' });
    await router.push('/session/1');
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(SessionView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: sessionViewStateStubs
      }
    });
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="session-error"]').exists()).toBe(true);
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a loading state while direct session navigation restores data", async () => {
    clearSessionData();
    store.sessions = {};
    ensureSpy.mockReturnValue(new Promise(() => {}));
    await router.push('/session/1');

    const wrapper = mount(SessionView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: sessionViewStateStubs
      }
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="session-loading"]').text()).toContain('Loading session');
    expect(wrapper.find('[data-testid="session-error"]').exists()).toBe(false);
  });

  it("shows a data access prompt when direct session navigation needs folder access", async () => {
    clearSessionData();
    store.sessions = {};
    ensureSpy.mockResolvedValue({
      status: 'needs-user-action',
      message: 'Select the session export folder to continue.'
    });
    await router.push('/session/1');

    const wrapper = mount(SessionView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: sessionViewStateStubs
      }
    });

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="data-access-prompt"]').exists()).toBe(true);
    });
    expect(wrapper.find('[data-testid="data-access-prompt"]').text()).toContain('Select the session export folder');
  });
});
