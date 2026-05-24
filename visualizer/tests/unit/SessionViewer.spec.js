import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SessionViewer from "../../src/components/SessionViewer";

describe("SessionViewer", () => {
  it("renders header", () => {
    const wrapper = mount(SessionViewer);
    expect(wrapper.text()).toMatch(/Session\s+Visualizer/);
  });
});
