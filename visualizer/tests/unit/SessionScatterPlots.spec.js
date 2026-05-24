import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionScatterPlots from '../../src/components/SessionScatterPlots';

function makeSession(pk, date, metrics) {
  return {
    pk,
    date,
    fmtDate: date,
    metrics
  };
}

describe('SessionScatterPlots', () => {
  it('builds chart data with standard deviation bands', () => {
    const sessions = [
      makeSession(1, '2024-01-01', {
        percent10: { mean: 40, sd: 5 },
        hold: { mean: 1.2, sd: 0.1 },
        split: { mean: 0.8, sd: 0.05 },
        length1s: { mean: 15, sd: 2 },
        deltaPull: { mean: 4.5, sd: 0.25 }
      }),
      makeSession(2, '2024-01-02', {
        percent10: { mean: 60, sd: 4 },
        hold: { mean: 1.4, sd: 0.2 },
        split: { mean: 0.7, sd: 0.05 },
        length1s: { mean: 17, sd: 1.5 },
        deltaPull: { mean: 3.8, sd: 0.15 }
      })
    ];
    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    const charts = wrapper.vm.charts;
    expect(charts.length).toBe(5);
    const firstChart = charts[0];
    expect(firstChart.key).toBe('percent10');
    expect(firstChart.data.datasets[2].data[0]).toBe(40);
    expect(firstChart.data.datasets[0].data[0]).toBe(45);
    expect(firstChart.data.datasets[1].fill).toBe('-1');
    const deltaChart = charts.find(c => c.key === 'deltaPull');
    expect(deltaChart.label).toBe('Δpull (mm)');
  });

  it('sorts sessions chronologically', () => {
    const sessions = [
      makeSession(2, '2024-01-02', {
        percent10: { mean: 55, sd: 2 }
      }),
      makeSession(1, '2024-01-01', {
        percent10: { mean: 45, sd: 3 }
      })
    ];
    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    const labels = wrapper.vm.charts[0].data.labels;
    expect(labels[0]).toContain('Jan');
    expect(labels[0] <= labels[1]).toBe(true);
  });

  it('shares computed labels across metric charts', () => {
    const sessions = [
      makeSession(2, '2024-01-02', {
        percent10: { mean: 55, sd: 2 },
        hold: { mean: 1.2, sd: 0.1 }
      }),
      makeSession(1, '2024-01-01', {
        percent10: { mean: 45, sd: 3 },
        hold: { mean: 1.1, sd: 0.1 }
      })
    ];
    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    const charts = wrapper.vm.charts;
    expect(charts[0].data.labels).toBe(charts[1].data.labels);
    expect(charts[0].fullLabels).toBe(charts[1].fullLabels);
    expect(charts[0].options.scales.y.title.text).toBe('% in 10');
  });
});
