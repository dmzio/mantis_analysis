import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ProcessedSpeedPlot from '../../src/components/ProcessedSpeedPlot';

describe('ProcessedSpeedPlot', () => {
  it('renders chart', () => {
    const shot = {
      rel_pitch_moa: [0,0,0],
      rel_yaw_moa: [0,1,2],
      shot_index: 2,
      sample_rate: 1
    };
    const wrapper = mount(ProcessedSpeedPlot, {
      props: { shot },
      global: {
        plugins: [PrimeVue],
        stubs: { Chart: { template: '<canvas></canvas>' } }
      }
    });
    expect(wrapper.find('canvas').exists()).toBe(true);
    expect(wrapper.vm.chartData.datasets[0].data.length).toBe(3);
  });
});
