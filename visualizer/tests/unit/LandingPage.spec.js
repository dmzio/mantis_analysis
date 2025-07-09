import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import LandingPage from "../../src/components/LandingPage";
import router from "../../src/router";

describe("LandingPage", () => {
  it("renders header", () => {
    const wrapper = mount(LandingPage, { global: { provide: { store } } });
    expect(wrapper.text()).toMatch(/pick folder with session dumps/);
  });

  it("redirects to dashboard if folder and sessions loaded", () => {
    store.folder = "data";
    store.sessions = { 1: { pk: 1 } };
    const push = vi.fn();
    router.push = push;
    mount(LandingPage, { global: { provide: { store } } });
    expect(push).toHaveBeenCalledWith("/dashboard");
    store.folder = "";
    store.sessions = {};
  });

  it("does not redirect when sessions missing", () => {
    store.folder = "data";
    store.sessions = {};
    const push = vi.fn();
    router.push = push;
    mount(LandingPage, { global: { provide: { store } } });
    expect(push).not.toHaveBeenCalled();
    store.folder = "";
  });
});
