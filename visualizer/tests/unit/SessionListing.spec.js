import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import SessionListing from "../../src/components/SessionListing";
import router from "../../src/router";
import { vi } from "vitest";
import { formatDate } from "../../src/dateFmt";

describe("SessionListing", () => {
  it("renders session data", () => {
    const sessions = [{ date: "2024-01-01", pk: 1, shots: [1, 2, 3] }];
    const wrapper = mount(SessionListing, {
      props: { sessions },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: { template: '<table><slot /></table>' },
          Column: { template: '<td></td>' },
          Button: { template: '<button></button>' }
        }
      }
    });
    expect(wrapper.vm.shotCount(sessions[0])).toBe(3);
    expect(wrapper.vm.fmtDate({ date: '2024-01-01' })).toBe(formatDate('2024-01-01'));
    expect(wrapper.find('table').exists()).toBe(true);
  });

  it("navigates to details", async () => {
    const sessions = [{ date: "2024-01-01", pk: 2, shots: [] }];
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(SessionListing, {
      props: { sessions },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: { template: '<table><slot /></table>' },
          Column: { template: '<td></td>' },
          Button: { template: '<button></button>' }
        }
      }
    });
    wrapper.vm.toDetails(sessions[0]);
    expect(push).toHaveBeenCalledWith('/session/2');
  });
});
