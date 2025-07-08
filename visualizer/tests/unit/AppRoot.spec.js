import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AppRoot from "../../src/App";
import store from "../../src/store";
import router from "../../src/router";

describe("AppRoot", () => {
  it("resets data and redirects", () => {
    store.folder = "data";
    store.sessions = [{}, {}];
    localStorage.setItem("data_folder", "data");
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(AppRoot, {
      global: {
        stubs: ["router-view", "Menubar"],
        mocks: { $route: { path: '/dashboard' } }
      }
    });
    (wrapper.vm).reset();
    expect(store.folder).toBe("");
    expect(store.sessions.length).toBe(0);
    expect(localStorage.getItem("data_folder")).toBeNull();
    expect(push).toHaveBeenCalledWith("/");
  });
});
