import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import ProcessedTraceVisualizer from '../../src/components/ProcessedTraceVisualizer';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
});

describe('ProcessedTraceVisualizer', () => {
  it('renders play button', () => {
    const shots = [{ rel_pitch_moa: [0,0], rel_yaw_moa: [0,0], start_index: 0 }];
    const wrapper = mount(ProcessedTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-testid="play-btn"]').exists()).toBe(true);
  });

  it('renders ring labels', () => {
    const shots = [{ rel_pitch_moa: [0], rel_yaw_moa: [0], start_index: 0 }];
    const wrapper = mount(ProcessedTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.findAll('.ring-label').length).toBeGreaterThan(0);
  });
});
