import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ProcessedStabilityPlot from '../../src/components/ProcessedStabilityPlot';

describe('ProcessedStabilityPlot', () => {
  it('renders chart', () => {
    const shot = { rel_pitch_moa: [0,1], rel_yaw_moa: [0,-1], shot_index: 1, start_index: 0, sample_rate: 1 };
    const wrapper = mount(ProcessedStabilityPlot, {
      props: { shot },
      global: {
        plugins: [PrimeVue],
        stubs: { Chart: { template: '<canvas></canvas>' } }
      }
    });
    expect(wrapper.find('canvas').exists()).toBe(true);
  });
});
