import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import router from "../../src/router";
import store from "../../src/store";
import SessionView from "../../src/components/SessionView";
import SessionSidebar from "../../src/components/SessionSidebar";

store.sessions = { 1: { pk: 1, shots: [{pk:11, score:"95", problem:"OK", pitch:[0,0], yaw:[0,0]}] } };

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
          TraceVisualizer: { template: '<svg></svg>' }
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
          RouterLink: { template: '<a></a>' }
        }
      }
    });
    expect(wrapper.find('[data-testid="shot-table"]').exists()).toBe(true);
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
