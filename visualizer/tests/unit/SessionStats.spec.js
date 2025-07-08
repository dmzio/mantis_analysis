import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionStats from '../../src/components/SessionStats';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
});

describe('SessionStats', () => {
  it('shows total shots and visualizer', () => {
    const shots = [
      { pitch: [0,0], yaw: [0,0] },
      { pitch: [0,0], yaw: [0,0] },
      { pitch: [0,0], yaw: [0,0] }
    ];
    const wrapper = mount(SessionStats, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.text()).toMatch(/Total shots:\s*3/);
    expect(wrapper.find('[data-testid="play-btn"]').exists()).toBe(true);
  });
});
