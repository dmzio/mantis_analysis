import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import router from "../../src/router";
import store from "../../src/store";
import SessionView from "../../src/components/SessionView";

store.sessions = [{ session: { pk: 1, shots: [{pk:11, score:"95", problem:"OK", pitch:[0,0], yaw:[0,0]}] } }];

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
});

describe("SessionView", () => {
  it("shows stats and shots", async () => {
    await router.push('/session/1');
    const wrapper = mount(SessionView, { global: { plugins: [PrimeVue, router] } });
    expect(wrapper.find('[data-testid="shot-table"]').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Total shots:\s*1/);
  });
});
