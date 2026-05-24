import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionShotList from '../../src/components/SessionShotList';
import router from '../../src/router';

const dataTableStub = {
  inheritAttrs: false,
  props: ['value', 'scrollable', 'scrollHeight', 'size', 'tableStyle', 'virtualScrollerOptions'],
  template: '<div v-bind="$attrs"><slot /></div>'
};

const columnStub = {
  inheritAttrs: false,
  props: ['field', 'header', 'style', 'headerClass', 'bodyClass'],
  template: '<div><slot /><slot name="body" :data="{}" :index="0" /></div>'
};

describe('SessionShotList', () => {
  it('renders shots', () => {
    const shots = [{ pk: 1, score: '95', problem: 'OK' }];
    const wrapper = mount(SessionShotList, {
      props: { shots, sessionPk: 1 },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    expect(wrapper.find('[data-testid="shot-table"]').exists()).toBe(true);
  });

  it('formats timing columns', () => {
    const wrapper = mount(SessionShotList, {
      props: { shots: [], sessionPk: 1 },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    expect(wrapper.vm.fmtSeconds(0.123)).toBe('0.12');
    expect(wrapper.vm.fmtSeconds(null)).toBe('');
  });

  it('navigates to shot details', () => {
    const shots = [{ pk: 2, score: '90', problem: 'OK' }];
    const push = vi.fn();
    const originalPush = router.push;
    router.push = push;
    const wrapper = mount(SessionShotList, {
      props: { shots, sessionPk: 3 },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    wrapper.vm.toDetails(shots[0]);
    expect(push).toHaveBeenCalledWith('/session/3/shot/2');
    expect(wrapper.vm.shotHref(shots[0])).toBe('#/session/3/shot/2');
    router.push = originalPush;
  });

  it('sets virtual scroller options for smoother scrolling', () => {
    const wrapper = mount(SessionShotList, {
      props: { shots: [], sessionPk: 1 },
      global: {
        plugins: [PrimeVue, router],
        stubs: {
          DataTable: dataTableStub,
          Column: columnStub
        }
      }
    });
    expect(wrapper.vm.virtualOptions.itemSize).toBeGreaterThan(30);
  });
});
