import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../js/store.js";
global.APP = { store };
import LandingPage from "../../js/components/LandingPage.js";

describe("LandingPage", () => {
  it("renders header", () => {
    const wrapper = mount(LandingPage, { global: { provide: { store } } });
    expect(wrapper.text()).toMatch(/pick folder with session dumps/);
  });
});
