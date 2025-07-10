import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import TraceVisualizer from '../../src/components/TraceVisualizer';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
});

describe('TraceVisualizer', () => {
  it('renders play button', () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-testid="play-btn"]').exists()).toBe(true);
  });

  it('updates progress via slider', async () => {
    const shots = [{ pitch: [0,0,0], yaw: [0,0,0], pull_index: 1, shot_index: 2 }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    const slider = wrapper.find('[data-testid="timeline"]');
    await slider.setValue(1);
    expect(wrapper.vm.progress).toBe(1);
  });

  it('renders pull segment', () => {
    const shots = [{ pitch: [0,0,0], yaw: [0,0,0], pull_index: 1, shot_index: 2 }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-seg="pull"]').exists()).toBe(true);
  });

  it('shows datapoints', () => {
    const shots = [{ pitch: [0,0], yaw: [0,0], sample_rate: 100 }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-point="hold"]').exists()).toBe(true);
  });

  it('svg fills container', () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    const svg = wrapper.find('[data-testid="trace-svg"]');
    expect(svg.attributes('class')).toContain('trace-svg');
  });

  it('allows zooming out', () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(TraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.vm.zoom.scaleExtent()[0]).toBeLessThanOrEqual(0.05);
  });

  it('draws track when shot data arrives later', async () => {
    const wrapper = mount(TraceVisualizer, { props: { shots: [{}] }, global: { plugins: [PrimeVue] } });
    const updated = { pitch: [0, 0, 0], yaw: [0, 0, 0], pull_index: 1, shot_index: 2 };
    await wrapper.setProps({ shots: [updated] });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-seg="pull"]').exists()).toBe(true);
  });
});
