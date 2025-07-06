import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SessionViewer from "../../js/components/SessionViewer.js";

describe("SessionViewer", () => {
  it("renders header", () => {
    const wrapper = mount(SessionViewer);
    expect(wrapper.text()).toContain("Session Visualizer");
  });
});
