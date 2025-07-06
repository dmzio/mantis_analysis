import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import DashboardPage from "../../src/components/DashboardPage";
import SessionListing from "../../src/components/SessionListing";

describe("DashboardPage", () => {
  it("uses provided store", () => {
    const wrapper = mount(DashboardPage, { global: { provide: { store } } });
    expect(wrapper.vm.store).toStrictEqual(store);
  });

  it("renders session listing", () => {
    store.sessions = [{ session: { date: "2024-01-01", pk: 1, shots: [1] } }];
    const wrapper = mount(DashboardPage, { global: { provide: { store } } });
    expect(wrapper.findComponent(SessionListing).exists()).toBe(true);
  });
});
