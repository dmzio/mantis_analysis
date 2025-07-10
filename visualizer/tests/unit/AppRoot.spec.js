import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AppRoot from "../../src/App";
import store from "../../src/store";
import router from "../../src/router";

describe("AppRoot", () => {
  it("resets data and redirects", async () => {
    store.folder = "data";
    store.sessions = { 1: {}, 2: {} };
    localStorage.setItem("data_folder", "data");
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(AppRoot, {
      global: {
        stubs: ["router-view", "Menubar", "InputSwitch"],
        mocks: { $route: { path: '/dashboard' } }
      }
    });
    await (wrapper.vm).reset();
    expect(store.folder).toBe("");
    expect(Object.keys(store.sessions).length).toBe(0);
    expect(localStorage.getItem("data_folder")).toBeNull();
    expect(push).toHaveBeenCalledWith("/");
  });

  it("toggles dark mode", () => {
    localStorage.setItem("darkMode", "true");
    const wrapper = mount(AppRoot, {
      global: {
        stubs: ["router-view", "Menubar", "InputSwitch"],
        mocks: { $route: { path: '/dashboard' } }
      }
    });
    expect(document.body.classList.contains("p-dark")).toBe(true);
    expect(document.body.classList.contains("p-theme-lara-dark-blue")).toBe(true);
    wrapper.vm.dark = false;
    return wrapper.vm.$nextTick().then(() => {
      expect(document.body.classList.contains("p-dark")).toBe(false);
      expect(document.body.classList.contains("p-theme-lara-light-blue")).toBe(true);
      expect(localStorage.getItem("darkMode")).toBe("false");
    });
  });
});
