import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import router from "../../src/router";
import store from "../../src/store";
import SessionView from "../../src/components/SessionView";
import SessionSidebar from "../../src/components/SessionSidebar";
import { cacheProcessedShots, clearSessionData } from "../../src/sessionData";

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
    await wrapper.vm.$nextTick();
    expect(wrapper.find('svg').exists()).toBe(true);
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
    await router.push('/session/1');
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(SessionView, { global: { plugins: [PrimeVue, router] } });
    await Promise.resolve();
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="session-error"]').exists()).toBe(true);
  });
});
