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

  it("redirects to dashboard if folder already set", () => {
    store.folder = "data";
    const push = vi.fn();
    router.push = push;
    mount(LandingPage, { global: { provide: { store } } });
    expect(push).toHaveBeenCalledWith("/dashboard");
    store.folder = "";
  });
});
