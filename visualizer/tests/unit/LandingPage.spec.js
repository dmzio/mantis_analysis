import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import store from "../../src/store";
import LandingPage from "../../src/components/LandingPage";

describe("LandingPage", () => {
  it("renders header", () => {
    const wrapper = mount(LandingPage, { global: { provide: { store } } });
    expect(wrapper.text()).toMatch(/pick folder with session dumps/);
  });
});
