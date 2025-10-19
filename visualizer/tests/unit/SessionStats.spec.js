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
    const wrapper = mount(SessionStats, {
      props: { shots, photo: '/foo.jpg', processedShots: shots },
      global: {
        plugins: [PrimeVue],
        stubs: {
          RawTraceVisualizer: { template: '<svg></svg>' },
          SessionShotGroup: { template: '<div class="group"></div>' }
        }
      }
    });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('img.session-photo').attributes('src')).toBe('/foo.jpg');
    expect(wrapper.find('.group').exists()).toBe(true);
  });
});
