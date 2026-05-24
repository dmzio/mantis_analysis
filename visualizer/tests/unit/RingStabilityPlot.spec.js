import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import RingStabilityPlot from '../../src/components/RingStabilityPlot';

describe('RingStabilityPlot', () => {
  it('renders chart', () => {
    const shot = {
      rel_pitch_moa: [0,0,0],
      rel_yaw_moa: [0,1,2],
      shot_index: 2,
      start_index: 0,
      pull_index_calc: 1,
      sample_rate: 1
    };
    const wrapper = mount(RingStabilityPlot, {
      props: { shot },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    expect(wrapper.find('canvas').exists()).toBe(true);
    expect(wrapper.vm.chartData.datasets[0].data.length).toBe(3);
    expect(wrapper.vm.chartOptions.scales.y.reverse).toBe(true);
  });
});
