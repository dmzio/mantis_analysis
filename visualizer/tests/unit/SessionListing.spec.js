import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import SessionListing from "../../src/components/SessionListing";

describe("SessionListing", () => {
  it("renders session data", () => {
    const sessions = [{ session: { date: "2024-01-01", pk: 1, shots: [1, 2, 3] } }];
    const wrapper = mount(SessionListing, { props: { sessions }, global: { plugins: [PrimeVue] } });
    expect(wrapper.text()).toMatch(/2024-01-01/);
    expect(wrapper.vm.shotCount(sessions[0])).toBe(3);
    expect(wrapper.text()).toMatch(/1/);
  });
});
