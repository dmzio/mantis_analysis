import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import router from "../../src/router";
import store from "../../src/store";
import SessionView from "../../src/components/SessionView";
import SessionSidebar from "../../src/components/SessionSidebar";

store.sessions = { 1: { pk: 1, shots: [{pk:11, score:"95", pitch:[0,0], yaw:[0,0]}] } };
store.processed = { 1: { shots: [{
  pk:11,
  score:"95",
  percent_10:0.5,
  length_1s:1,
  delta_pull:0.2,
  abs_deviation_moa:[0,1],
  abs_speed_mm_s:[1,1],
  ring_position:[10,9],
  shot_index:1,
  start_index:0,
  pull_index_calc:0,
  sample_rate:1
}] } };

beforeEach(() => {
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
          TabView: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          RawTraceVisualizer: { template: '<svg></svg>' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it("renders sidebar with shot list", async () => {
    await router.push('/session/1');
    const wrapper = mount(SessionSidebar, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: { template: '<table data-testid="shot-table"></table>' },
          Column: { template: '<td></td>' },
          Button: { template: '<button></button>' },
          BreadCrumb: { template: '<nav data-testid="breadcrumb"></nav>' },
          EyeIcon: { template: '<span></span>' }
        }
      }
    });
    expect(wrapper.find('[data-testid="shot-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="breadcrumb"]').exists()).toBe(true);
  });

  it("computes aggregates", async () => {
    await router.push('/session/1');
    mount(SessionView, {
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          TabView: { template: '<div><slot /></div>' },
          TabPanel: { template: '<div><slot /></div>' },
          RawTraceVisualizer: { template: '<svg></svg>' },
          Chart: { template: '<canvas></canvas>' }
        }
      }
    });
    expect(store.aggregates[1]).toBeTruthy();
  });

  it("redirects to landing when empty", async () => {
    store.sessions = {};
    await router.push('/session/1');
    const push = vi.fn();
    router.push = push;
    mount(SessionView, { global: { plugins: [PrimeVue, router] } });
    await Promise.resolve();
    expect(push).toHaveBeenCalledWith('/');
  });
});
