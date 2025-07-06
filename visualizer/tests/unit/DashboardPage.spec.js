import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import DashboardPage from "../../src/components/DashboardPage";

describe("DashboardPage", () => {
  it("uses provided store", () => {
    const wrapper = mount(DashboardPage, { global: { provide: { store } } });
    expect(wrapper.vm.store).toStrictEqual(store);
  });
});
