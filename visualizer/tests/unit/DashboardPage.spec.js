import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import router from "../../src/router";
import DashboardPage from "../../src/components/DashboardPage";
import SessionListing from "../../src/components/SessionListing";
import SessionScatterPlots from "../../src/components/SessionScatterPlots";
import SessionMeanVectorTimeline from "../../src/components/SessionMeanVectorTimeline";
import * as loader from "../../src/dataLoader";
import { cacheProcessedShots, clearSessionData } from "../../src/sessionData";
import { appSettings, resetAppSettings } from "../../src/appSettings";

const flushMounted = async (wrapper) => {
  await Promise.resolve();
  await wrapper.vm.$nextTick();
  await Promise.resolve();
  await wrapper.vm.$nextTick();
};

const buttonStub = {
  props: ["label", "size", "severity", "outlined"],
  emits: ["click"],
  template: '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>'
};

const monthsAgoDate = (months) => {
  const ref = new Date();
  const d = new Date(ref);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
};

const mountOptions = {
  global: {
    plugins: [router],
    provide: { store },
    stubs: {
      Button: buttonStub,
      Chart: { template: "<canvas></canvas>" },
      DataAccessPrompt: { props: ['message'], template: '<div data-testid="data-access-prompt">{{ message }}</div>' }
    }
  }
};

describe("DashboardPage", () => {
  let ensureSpy;
  beforeEach(() => {
    store.sessions = {};
    store.aggregates = {};
    store.photos = {};
    store.loader = { total: 0, processed: 0, pending: 0, active: false, message: '', currentPk: null, inFlight: 0 };
    store.loading = false;
    clearSessionData();
    resetAppSettings();
    ensureSpy = vi.spyOn(loader, 'ensureDashboardData').mockResolvedValue({ status: 'ready', message: '' });
  });
  afterEach(() => {
    ensureSpy.mockRestore();
  });

  it("uses provided store", async () => {
    const wrapper = await mount(DashboardPage, mountOptions);
    expect(wrapper.vm.store).toStrictEqual(store);
  });

  it("renders session listing", async () => {
    store.sessions = { 1: { date: monthsAgoDate(1), pk: 1, ready: true } };
    const wrapper = await mount(DashboardPage, mountOptions);
    await flushMounted(wrapper);
    expect(wrapper.findComponent(SessionListing).exists()).toBe(true);
    expect(wrapper.findComponent(SessionMeanVectorTimeline).exists()).toBe(true);
    expect(wrapper.findComponent(SessionScatterPlots).exists()).toBe(true);
  });

  it("waits for loading to finish before rendering scatter plots", async () => {
    store.loading = true;
    store.sessions = {
      1: { date: monthsAgoDate(1), pk: 1, ready: true },
      2: { date: monthsAgoDate(2), pk: 2, ready: true }
    };
    const wrapper = await mount(DashboardPage, mountOptions);
    await flushMounted(wrapper);
    expect(wrapper.findComponent(SessionListing).exists()).toBe(true);
    expect(wrapper.findComponent(SessionScatterPlots).exists()).toBe(false);

    store.loading = false;
    await flushMounted(wrapper);
    expect(wrapper.findComponent(SessionScatterPlots).exists()).toBe(true);
  });

  it("sorts sessions by date descending", async () => {
    store.sessions = {
      1: { date: "2024-01-01", pk: 1, ready: true },
      2: { date: "2024-01-02", pk: 2, ready: true }
    };
    const wrapper = await mount(DashboardPage, mountOptions);
    const table = wrapper.findComponent(SessionListing);
    const rows = table.props('sessions');
    expect(rows[0].pk).toBe(2);
  });

  it("shows a data access prompt when dashboard data needs folder access", async () => {
    store.sessions = {};
    ensureSpy.mockResolvedValue({
      status: 'needs-user-action',
      message: 'Select the session export folder to continue.'
    });
    const wrapper = await mount(DashboardPage, mountOptions);
    await flushMounted(wrapper);
    expect(wrapper.find('[data-testid="data-access-prompt"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="data-access-prompt"]').text()).toContain('Select the session export folder');
  });

  it("computes dashboard metrics when aggregates unavailable", async () => {
    const shots = [
      { percent_10: 0.6, hold_duration_s: 1.5, split_s: 0.8, length_1s: 120, delta_pull: 4.2 },
      { percent_10: 0.8, hold_duration_s: 1.0, split_s: 0.6, length_1s: 100, delta_pull: 3.8 }
    ];
    store.sessions = {
      1: { date: "2024-01-01", pk: 1, ready: true }
    };
    cacheProcessedShots(1, shots);
    const wrapper = await mount(DashboardPage, mountOptions);
    const listing = wrapper.findComponent(SessionListing);
    const [session] = listing.props('sessions');
    expect(session.metrics.percent10.mean).toBeCloseTo(70);
    expect(session.metrics.hold.mean).toBeCloseTo(1.25);
    expect(store.sessions[1].metrics).toBeUndefined();
    expect(store.sessions[1].metricsByMode).toBeUndefined();
    expect(store.aggregates[1]).toBeUndefined();
  });

  it("uses metrics from the active drift mode", async () => {
    store.sessions = {
      1: { date: "2024-01-01", pk: 1, ready: true }
    };
    cacheProcessedShots(1, {
      original: [
        { percent_10: 0.2, hold_duration_s: 1, split_s: 1, length_1s: 50, delta_pull: 2 }
      ],
      corrected: [
        { percent_10: 0.9, hold_duration_s: 2, split_s: 1, length_1s: 25, delta_pull: 1, drift_correction: {} }
      ],
      drift: { method: 'session_hold_linear' }
    });

    const wrapper = await mount(DashboardPage, mountOptions);
    let [session] = wrapper.findComponent(SessionListing).props('sessions');
    expect(session.metrics.percent10.mean).toBeCloseTo(90);
    appSettings.driftCorrection = false;
    await wrapper.vm.$nextTick();
    [session] = wrapper.findComponent(SessionListing).props('sessions');
    expect(session.metrics.percent10.mean).toBeCloseTo(20);
  });

  it("activates sessions via presets and feeds plots", async () => {
    store.sessions = {
      1: { date: monthsAgoDate(2), pk: 1, ready: true },
      2: { date: monthsAgoDate(7), pk: 2, ready: true },
      3: { date: null, pk: 3, ready: true }
    };
    const wrapper = await mount(DashboardPage, mountOptions);
    await flushMounted(wrapper);
    expect(wrapper.vm.sessionList.length).toBe(3);
    expect(wrapper.vm.filterInitialized).toBe(true);
    const scatter = wrapper.findComponent(SessionScatterPlots);
    expect(wrapper.vm.activeSessionIds).toContain(1);
    expect(wrapper.vm.activeSessionIds).not.toContain(2);
    expect(scatter.props('sessions').map(session => session.pk)).toEqual([1]);
    const allButton = wrapper.findAll('button').find(btn => btn.text().includes('all'));
    expect(allButton).toBeTruthy();
    if (!allButton) throw new Error('Filter button not found');
    await allButton.trigger('click');
    expect(wrapper.vm.activeSessionIds).toEqual(expect.arrayContaining([1, 2]));
  });

  it("toggles active sessions via handler", async () => {
    store.sessions = {
      1: { date: monthsAgoDate(1), pk: 1, ready: true },
      2: { date: monthsAgoDate(2), pk: 2, ready: true }
    };
    const wrapper = await mount(DashboardPage, mountOptions);
    await flushMounted(wrapper);
    const rows = wrapper.findComponent(SessionListing).props('sessions');
    expect(wrapper.vm.activeSessionIds).toEqual(expect.arrayContaining([rows[0].pk]));
    wrapper.vm.toggleSessionActivity(rows[0]);
    await flushMounted(wrapper);
    expect(wrapper.vm.activeSessionIds).not.toContain(rows[0].pk);
  });

  it("auto-enables later sessions while auto filter is active", async () => {
    store.sessions = {
      1: { date: monthsAgoDate(1), pk: 1, ready: true }
    };
    const wrapper = await mount(DashboardPage, mountOptions);
    await flushMounted(wrapper);
    expect(wrapper.vm.activeSessionIds).toContain(1);
    store.sessions[2] = { date: monthsAgoDate(2), pk: 2, ready: true };
    await flushMounted(wrapper);
    expect(wrapper.vm.activeSessionIds).toEqual(expect.arrayContaining([1, 2]));
  });
});
