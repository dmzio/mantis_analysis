import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionShotGroup from '../../src/components/SessionShotGroup';

describe('SessionShotGroup', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
    }
  });

  it('shows grouping metrics', () => {
    const shots = [
      { impact_pitch_mm: 2, impact_yaw_mm: 1, ellipse_major_mm: 5, ellipse_minor_mm: 3, ellipse_angle_deg: 10 },
      { impact_pitch_mm: -3, impact_yaw_mm: -2, ellipse_major_mm: 6, ellipse_minor_mm: 4, ellipse_angle_deg: 12 }
    ];
    const wrapper = mount(SessionShotGroup, {
      props: { shots },
      global: { plugins: [PrimeVue] }
    });
    expect(wrapper.text()).toContain('Mean radial distance');
    expect(wrapper.text()).toContain('Extreme spread');
    expect(wrapper.text()).toContain('Avg hold ellipse');
  });
});
