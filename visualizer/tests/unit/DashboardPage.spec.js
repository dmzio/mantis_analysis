import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import router from "../../src/router";
import DashboardPage from "../../src/components/DashboardPage";
import SessionListing from "../../src/components/SessionListing";
import SessionScatterPlots from "../../src/components/SessionScatterPlots";
import * as loader from "../../src/dataLoader";

describe("DashboardPage", () => {
  it("uses provided store", () => {
    const wrapper = mount(DashboardPage, { global: { plugins: [router], provide: { store } } });
  expect(wrapper.vm.store).toStrictEqual(store);
  });

  it("renders session listing", async () => {
    store.sessions = { 1: { date: "2024-01-01", pk: 1, shots: [1] } };
    vi.spyOn(loader, 'ensureData').mockResolvedValue(true);
    const wrapper = await mount(DashboardPage, { global: { plugins: [router], provide: { store } } });
    expect(wrapper.findComponent(SessionListing).exists()).toBe(true);
    expect(wrapper.findComponent(SessionScatterPlots).exists()).toBe(true);
  });

  it("sorts sessions by date descending", async () => {
    store.sessions = {
      1: { date: "2024-01-01", pk: 1, shots: [] },
      2: { date: "2024-01-02", pk: 2, shots: [] }
    };
    vi.spyOn(loader, 'ensureData').mockResolvedValue(true);
    const wrapper = await mount(DashboardPage, { global: { plugins: [router], provide: { store } } });
    const table = wrapper.findComponent(SessionListing);
    const rows = table.props('sessions');
    expect(rows[0].pk).toBe(2);
  });

  it("redirects to landing when empty", async () => {
    store.sessions = {};
    const push = vi.fn();
    router.push = push;
    vi.spyOn(loader, 'ensureData').mockResolvedValue(false);
    await mount(DashboardPage, { global: { plugins: [router], provide: { store } } });
    await Promise.resolve();
    await Promise.resolve();
    expect(push).toHaveBeenCalledWith("/");
  });
});
