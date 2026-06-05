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
        deltaPull: { mean: 20, sd: 7, median: 4.5, q1: 4, q3: 6 },
        postShotMax: { mean: 30, sd: 8, median: 12, q1: 10, q3: 15 }
      }),
      makeSession(2, '2024-01-02', {
        percent10: { mean: 60, sd: 4 },
        hold: { mean: 1.4, sd: 0.2 },
        split: { mean: 0.7, sd: 0.05 },
        length1s: { mean: 17, sd: 1.5 },
        deltaPull: { mean: 15, sd: 6, median: 3.8, q1: 3, q3: 5 },
        postShotMax: { mean: 25, sd: 9, median: 9, q1: 8, q3: 11 }
      })
    ];
    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    const charts = wrapper.vm.charts;
    expect(charts.length).toBe(6);
    const firstChart = charts[0];
    expect(firstChart.key).toBe('percent10');
    expect(firstChart.data.datasets[2].data[0]).toBe(40);
    expect(firstChart.data.datasets[0].data[0]).toBe(45);
    expect(firstChart.data.datasets[1].fill).toBe('-1');
    const deltaChart = charts.find(c => c.key === 'deltaPull');
    expect(deltaChart.label).toBe('Δpull (mm)');
    expect(deltaChart.data.datasets[2].data[0]).toBe(4.5);
    expect(deltaChart.data.datasets[0].data[0]).toBe(6);
    expect(deltaChart.data.datasets[1].data[0]).toBe(4);
    const postShotChart = charts.find(c => c.key === 'postShotMax');
    expect(postShotChart.label).toBe('Post max (mm)');
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

  it('attaches mean pull vectors to delta pull points', () => {
    const sessions = [
      makeSession(1, '2024-01-01', {
        deltaPull: { mean: 4, sd: 0.5, median: 4.2, q1: 3.8, q3: 4.7 }
      }),
      makeSession(2, '2024-01-02', {
        deltaPull: { mean: 8, sd: 0.5, median: 8.1, q1: 7.8, q3: 8.6 }
      })
    ];
    sessions[0].meanPullVector = { xMm: 3, yMm: 4, magnitudeMm: 5, angleDeg: 53.13, shotCount: 10 };
    sessions[1].meanPullVector = { xMm: -2, yMm: 0, magnitudeMm: 2, angleDeg: 180, shotCount: 8 };

    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });

    const deltaChart = wrapper.vm.charts.find(c => c.key === 'deltaPull');
    expect(deltaChart.vectorItems).toHaveLength(2);
    expect(deltaChart.vectorItems[0]).toMatchObject({
      pk: 1,
      xMm: 3,
      yMm: 4,
      magnitudeMm: 5,
      value: 4.2
    });
    expect(deltaChart.plugins.some(plugin => plugin.id === 'delta-pull-vector-overlay')).toBe(true);
    expect(deltaChart.options.plugins.tooltip.callbacks.afterLabel({ dataIndex: 0 })).toEqual([
      'Mean pull vector: 5.0 mm',
      'X/Y: 3.0 / 4.0 mm',
      'Angle: 53°',
      'Vector shots: 10'
    ]);
  });

  it('uses padded metric ranges for selected dashboard values', () => {
    const sessions = [
      makeSession(1, '2024-01-01', {
        percent10: { mean: 4, sd: 0.5, median: 4, q1: 3.5, q3: 4.5 }
      }),
      makeSession(2, '2024-01-02', {
        percent10: { mean: 7, sd: 0.5, median: 7, q1: 6.5, q3: 7.5 }
      })
    ];

    const wrapper = mount(SessionScatterPlots, {
      props: { sessions },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    const percentChart = wrapper.vm.charts.find(c => c.key === 'percent10');

    expect(percentChart.options.scales.y.min).toBeGreaterThanOrEqual(0);
    expect(percentChart.options.scales.y.min).toBeLessThan(3.5);
    expect(percentChart.options.scales.y.max).toBeGreaterThan(7.5);
    expect(percentChart.options.scales.y.max).toBeLessThan(100);
  });
});
