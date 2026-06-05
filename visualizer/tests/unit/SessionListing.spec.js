import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import SessionListing from "../../src/components/SessionListing";
import router from "../../src/router";

const dataTableStub = {
  inheritAttrs: false,
  props: ['value', 'scrollable', 'scrollHeight', 'size', 'tableStyle', 'rowClass'],
  emits: ['row-click'],
  template: '<div v-bind="$attrs"><slot /></div>'
};

const columnStub = {
  inheritAttrs: false,
  props: ['field', 'header', 'style', 'headerClass', 'bodyClass'],
  template: '<div><slot /><slot name="body" :data="{}" :index="0" /></div>'
};

describe("SessionListing", () => {
  it("renders session data", () => {
    const sessions = [{
      date: "2024-01-01",
      pk: 1,
      shots: [1, 2, 3],
      shot_count: 3,
      metrics: {
        percent10: { mean: 52.3, sd: 3.4 }
      }
    }];
    const wrapper = mount(SessionListing, {
      props: { sessions, activeSessionPks: [1] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    expect(wrapper.find('[data-testid="session-table"]').exists()).toBe(true);
  });

  it("navigates to details", async () => {
    const sessions = [{ date: "2024-01-01", pk: 2, shots: [] }];
    const push = vi.fn();
    const originalPush = router.push;
    router.push = push;
    const wrapper = mount(SessionListing, {
      props: { sessions, activeSessionPks: [] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    wrapper.vm.toDetails(sessions[0]);
    expect(push).toHaveBeenCalledWith('/session/2');
    expect(wrapper.vm.sessionHref(sessions[0])).toBe('#/session/2');
    router.push = originalPush;
  });

  it("formats metric values with fallback", () => {
    const sessions = [{
      date: "2024-01-01",
      pk: 1,
      shots: [],
      metrics: {
        percent10: { mean: 47.123, sd: 2.5 }
      }
    }];
    const wrapper = mount(SessionListing, {
      props: { sessions, activeSessionPks: [] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    const metricDef = wrapper.vm.metricDefinitions.find(m => m.key === 'percent10');
    if (!metricDef) throw new Error('Metric definition missing');
    expect(wrapper.vm.metricValue(sessions[0], metricDef)).toBe('47.1');
    expect(wrapper.vm.metricTooltip(sessions[0], metricDef)).toContain('± 2.5');
    expect(wrapper.vm.metricValue({}, metricDef)).toBe('—');
  });

  it("uses compact table metrics", () => {
    const wrapper = mount(SessionListing, {
      props: { sessions: [], activeSessionPks: [] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    expect(wrapper.vm.tableMetricDefinitions.map(metric => metric.key)).toEqual([
      'percent10',
      'hold',
      'split',
      'length1s',
      'deltaPull'
    ]);
  });

  it("marks active sessions and emits toggle", () => {
    const sessions = [{ date: "2024-01-01", pk: 10, shots: [] }];
    const wrapper = mount(SessionListing, {
      props: { sessions, activeSessionPks: [10] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    expect(wrapper.vm.rowClass(sessions[0])).toEqual({ 'session-listing__row--active': true });
    wrapper.vm.handleRowClick({ data: sessions[0], originalEvent: { target: document.createElement('div') } });
    expect(wrapper.emitted('toggle-session')).toBeTruthy();
  });

  it("positions the preview popover to the right of the trigger", () => {
    const wrapper = mount(SessionListing, {
      props: { sessions: [], activeSessionPks: [] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    const trigger = document.createElement('span');
    trigger.getBoundingClientRect = () => ({
      left: 40,
      right: 140,
      top: 100,
      bottom: 120,
      width: 100,
      height: 20,
      x: 40,
      y: 100,
      toJSON: () => ({})
    });
    const container = document.createElement('div');
    container.classList.add('p-popover-flipped');
    container.setAttribute('data-p-popover-flipped', 'true');
    container.getBoundingClientRect = () => ({
      left: 0,
      right: 300,
      top: 0,
      bottom: 180,
      width: 300,
      height: 180,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    wrapper.vm.alignPreviewToRight({ currentTarget: trigger }, container);

    expect(container.style.left).toBe('154px');
    expect(container.hasAttribute('data-p-popover-flipped')).toBe(false);
    expect(container.classList.contains('p-popover-flipped')).toBe(false);
  });

  it("does not show hover previews on mobile width", () => {
    const wrapper = mount(SessionListing, {
      props: { sessions: [], activeSessionPks: [] },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 430 });

    expect(wrapper.vm.shouldShowPreview(new Event('mouseenter'))).toBe(false);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

});
