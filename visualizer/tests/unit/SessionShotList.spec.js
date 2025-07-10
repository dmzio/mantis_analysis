import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionShotList from '../../src/components/SessionShotList';

describe('SessionShotList', () => {
  it('renders shots', () => {
    const shots = [{ pk: 1, score: '95', problem: 'OK' }];
    const wrapper = mount(SessionShotList, {
      props: { shots },
      global: {
        plugins: [PrimeVue],
        stubs: {
          DataTable: { template: '<table><slot /></table>' },
          Column: { template: '<td></td>' }
        }
      }
    });
    expect(wrapper.find('table').exists()).toBe(true);
  });
});
