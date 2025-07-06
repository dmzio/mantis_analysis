import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../js/store.js";
global.APP = { store };
import DashboardPage from "../../js/components/DashboardPage.js";

describe("DashboardPage", () => {
  it("uses provided store", () => {
    const wrapper = mount(DashboardPage, { global: { provide: { store } } });
    expect(wrapper.vm.store).toStrictEqual(store);
  });
});
