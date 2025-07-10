import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import RawStabilityPlot from '../../src/components/RawStabilityPlot';

describe('RawStabilityPlot', () => {
  it('renders chart', () => {
    const shot = { pitch: [0,1], yaw: [0,-1], shot_index: 1, sample_rate: 1 };
    const wrapper = mount(RawStabilityPlot, {
      props: { shot },
      global: {
        plugins: [PrimeVue],
        stubs: { Chart: { template: '<canvas></canvas>' } }
      }
    });
    expect(wrapper.find('canvas').exists()).toBe(true);
  });
});
