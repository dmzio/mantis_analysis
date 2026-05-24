import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import RawTraceVisualizer from '../../src/components/RawTraceVisualizer';
import { setActiveTraceStyle } from '../../src/traceStyles';

beforeEach(() => {
  setActiveTraceStyle('target');
});

afterEach(() => {
  setActiveTraceStyle('target');
});

describe('RawTraceVisualizer', () => {
  it('renders play button', () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    expect(wrapper.find('[data-testid="play-btn"]').exists()).toBe(true);
  });

  it('updates progress via slider', async () => {
    const shots = [{ pitch: [0,0,0], yaw: [0,0,0], pull_index: 1, shot_index: 2 }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    const slider = wrapper.find('[data-testid="timeline"]');
    await slider.setValue(1);
    expect(wrapper.vm.progress).toBe(1);
  });

  it('mounts canvas renderer', async () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="trace-canvas"]').exists()).toBe(true);
  });

  it('renders ring labels', async () => {
    const shots = [{ pitch: [0,0], yaw: [0,0] }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    const labelCount = wrapper.findAll('.ring-label').length + wrapper.findAll('.target-ring-numeral').length;
    expect(labelCount).toBeGreaterThan(0);
  });

  it('draws track when shot data arrives later', async () => {
    const wrapper = mount(RawTraceVisualizer, { props: { shots: [] }, global: { plugins: [PrimeVue] } });
    expect(wrapper.vm.progress).toBe(0);
    const updated = { pitch: [0, 0, 0], yaw: [0, 0, 0], pull_index: 1, shot_index: 2 };
    await wrapper.setProps({ shots: [updated] });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.progress).toBe(1);
  });

  it('sizes viewBox using the smaller dimension', async () => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function() {
      const classes = (this.getAttribute?.('class') || '');
      if (classes.includes('trace-stage')) {
        return { width: 600, height: 240, top: 0, left: 0, right: 600, bottom: 240 };
      }
      return original.call(this);
    };
    const shots = [{ pitch: [0, 0], yaw: [0, 0] }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 240 240');
    HTMLElement.prototype.getBoundingClientRect = original;
  });

  it('renders target style geometry by default', async () => {
    const shots = [{ pitch: [0, 0], yaw: [0, 0] }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-trace-style="target"]').exists()).toBe(true);
    expect(wrapper.find('.target-visual').exists()).toBe(true);
    expect(wrapper.findAll('.target-ring').length).toBeGreaterThanOrEqual(10);
    expect(wrapper.find('[data-score="1"]').exists()).toBe(true);
    expect(wrapper.find('[data-score="10"]').exists()).toBe(true);
    expect(wrapper.findAll('.target-ring-numeral').length).toBeGreaterThan(0);
  });

  it('switches to MantisX style when requested', async () => {
    setActiveTraceStyle('mantisx');
    const shots = [{ pitch: [0, 0], yaw: [0, 0] }];
    const wrapper = mount(RawTraceVisualizer, { props: { shots }, global: { plugins: [PrimeVue] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('circle.ring').length).toBeGreaterThan(0);
    expect(wrapper.find('.target-visual').exists()).toBe(false);
  });
});
