import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ProcessedStabilityPlot from '../../src/components/ProcessedStabilityPlot';

describe('ProcessedStabilityPlot', () => {
  it('renders chart', () => {
    const shot = {
      rel_pitch_moa: [0,1,2],
      rel_yaw_moa: [0,-1,-2],
      shot_index: 2,
      start_index: 0,
      pre_shot_1s_index: 1,
      sample_rate: 1
    };
    const wrapper = mount(ProcessedStabilityPlot, {
      props: { shot },
      global: {
        plugins: [PrimeVue],
        stubs: { Chart: { template: '<canvas></canvas>' } }
      }
    });
    expect(wrapper.find('canvas').exists()).toBe(true);
    expect(wrapper.vm.chartData.datasets[0].data.length).toBe(3);
  });

  it('trims data when requested', () => {
    const shot = {
      rel_pitch_moa: [0,1,2,3],
      rel_yaw_moa: [0,-1,-2,-3],
      shot_index: 2,
      start_index: 0,
      pre_shot_1s_index: 1,
      sample_rate: 1
    };
    const wrapper = mount(ProcessedStabilityPlot, {
      props: { shot, trimPreShot: true },
      global: {
        plugins: [PrimeVue],
        stubs: { Chart: { template: '<canvas></canvas>' } }
      }
    });
    expect(wrapper.vm.chartData.datasets[0].data.length).toBe(3);
  });
});
