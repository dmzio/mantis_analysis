import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ProcessedTraceVisualizer from '../../src/components/ProcessedTraceVisualizer';

describe('ProcessedTraceVisualizer', () => {
  it('renders play button', () => {
    const shots = [{ rel_pitch_moa: [0,0], rel_yaw_moa: [0,0], start_index: 0 }];
    const wrapper = mount(ProcessedTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-testid="play-btn"]').exists()).toBe(true);
  });

  it('mounts canvas renderer', async () => {
    const shots = [{ rel_pitch_moa: [0, 0], rel_yaw_moa: [0, 0], start_index: 0 }];
    const wrapper = mount(ProcessedTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="trace-canvas"]').exists()).toBe(true);
  });

  it('renders ring labels', async () => {
    const shots = [{ rel_pitch_moa: [0], rel_yaw_moa: [0], start_index: 0 }];
    const wrapper = mount(ProcessedTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    const labelCount = wrapper.findAll('.ring-label').length + wrapper.findAll('.target-ring-numeral').length;
    expect(labelCount).toBeGreaterThan(0);
  });
});
