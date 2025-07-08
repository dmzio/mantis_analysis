import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import TraceVisualizer from '../../src/components/TraceVisualizer';

describe('TraceVisualizer', () => {
  it('renders play button', () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-testid="play-btn"]').exists()).toBe(true);
  });
});
