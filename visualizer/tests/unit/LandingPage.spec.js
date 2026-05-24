import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import LandingPage from "../../src/components/LandingPage";
import router from "../../src/router";

describe("LandingPage", () => {
  it("renders header", () => {
    const wrapper = mount(LandingPage, { global: { provide: { store } } });
    expect(wrapper.find("h1").text()).toBe("Deep Mantis");
    expect(wrapper.find("h2").text()).toBe("Session explorer");
    expect(wrapper.text()).toMatch(/pick folder with session dumps/);
    expect(wrapper.text()).toContain("Interactive dashboards tailored for air pistol trainings.");
    expect(wrapper.find(".landing-logo").attributes("src")).toMatch(/deep-mantis\.svg/);
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

  it("shows loading during fallback read", async () => {
    const FileReaderMock = vi.fn(() => ({
      onload: null,
      readAsText() {
        if (this.onload) {
          setTimeout(() => this.onload({ target: { result: '{"pk":1,"shots":[]}' } }), 0);
        }
      }
    }));
    vi.stubGlobal('FileReader', FileReaderMock);
    const wrapper = mount(LandingPage, { global: { provide: { store } } });
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    await wrapper.vm.chooseFallback({ target: { files: [file] } });
    await new Promise(r => setTimeout(r));
    expect(store.loading).toBe(false);
    vi.unstubAllGlobals();
  });
});
