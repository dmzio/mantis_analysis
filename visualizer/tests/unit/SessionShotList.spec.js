import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionShotList from '../../src/components/SessionShotList';
import router from '../../src/router';

describe('SessionShotList', () => {
  it('renders shots', () => {
    const shots = [{ pk: 1, score: '95', problem: 'OK' }];
    const wrapper = mount(SessionShotList, {
      props: { shots, sessionPk: 1 },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: { template: '<table><slot /></table>' },
          Column: { template: '<td></td>' },
          Button: { template: '<button></button>' },
          EyeIcon: { template: '<span></span>' }
        }
      }
    });
    expect(wrapper.find('table').exists()).toBe(true);
  });

  it('navigates to shot details', () => {
    const shots = [{ pk: 2, score: '90', problem: 'OK' }];
    const push = vi.fn();
    router.push = push;
    const wrapper = mount(SessionShotList, {
      props: { shots, sessionPk: 3 },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: { template: '<table><slot /></table>' },
          Column: { template: '<td></td>' },
          Button: { template: '<button></button>' },
          EyeIcon: { template: '<span></span>' }
        }
      }
    });
    wrapper.vm.toDetails(shots[0]);
    expect(push).toHaveBeenCalledWith('/session/3/shot/2');
  });
});
