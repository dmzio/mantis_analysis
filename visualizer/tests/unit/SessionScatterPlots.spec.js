import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionScatterPlots from '../../src/components/SessionScatterPlots';
import store from '../../src/store';


describe('SessionScatterPlots', () => {
  it('builds chart data from sessions', () => {
    store.processed = {
      1: { shots: [{ percent_10: 0.5, length_1s: 1, delta_pull: 3 }] },
      2: { shots: [{ percent_10: 0.8, length_1s: 2, delta_pull: 4 }] }
    };
    const sessions = [
      { pk: 1, date: '2024-01-01', fmtDate: '2024 Jan 01 00:00' },
      { pk: 2, date: '2024-01-02', fmtDate: '2024 Jan 02 00:00' }
    ];
    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    const charts = wrapper.vm.charts;
    expect(charts.length).toBe(3);
    expect(charts[0].data.datasets[0].data[0]).toBe(50);
    expect(charts[2].label).toContain('Δpull');
  });
});
