import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import AppRoot from "../../src/App";
import store from "../../src/store";
import router from "../../src/router";
import { appSettings, resetAppSettings } from "../../src/appSettings";

describe("AppRoot", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppSettings();
  });

  it("resets data and redirects", async () => {
    store.folder = "data";
    store.sessions = { 1: {}, 2: {} };
    localStorage.setItem("data_folder", "data");
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(AppRoot, {
      global: {
        stubs: ["router-view", "Menubar", "ToggleSwitch", "SelectButton"],
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
        stubs: ["router-view", "Menubar", "ToggleSwitch", "SelectButton"],
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

  it("persists and applies trace style selection", async () => {
    localStorage.setItem("appSettings", JSON.stringify({ traceStyle: "mantisx", dark: true }));
    const wrapper = mount(AppRoot, {
      global: {
        stubs: ["router-view", "Menubar", "ToggleSwitch", "SelectButton"],
        mocks: { $route: { path: '/dashboard' } }
      }
    });
    expect(document.body.classList.contains("trace-style-mantisx")).toBe(true);
    wrapper.vm.pendingSettings.traceStyle = "target";
    wrapper.vm.saveSettings();
    await wrapper.vm.$nextTick();
    expect(document.body.classList.contains("trace-style-target")).toBe(true);
    const stored = JSON.parse(localStorage.getItem("appSettings") || "{}");
    expect(stored.traceStyle).toBe("target");
  });

  it("persists drift correction setting", async () => {
    const wrapper = mount(AppRoot, {
      global: {
        stubs: ["router-view", "Menubar", "ToggleSwitch", "SelectButton"],
        mocks: { $route: { path: '/dashboard' } }
      }
    });
    expect(wrapper.vm.driftCorrection).toBe(true);
    wrapper.vm.pendingSettings.driftCorrection = false;
    wrapper.vm.saveSettings();
    await wrapper.vm.$nextTick();
    expect(appSettings.driftCorrection).toBe(false);
    const stored = JSON.parse(localStorage.getItem("appSettings") || "{}");
    expect(stored.driftCorrection).toBe(false);
  });
});
