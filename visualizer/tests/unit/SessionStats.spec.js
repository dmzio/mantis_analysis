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
          SessionShotGroup: { template: '<div class="group"></div>' },
          SessionVectorPlots: { template: '<div class="vectors"></div>' }
        }
      }
    });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('img.session-photo').attributes('src')).toBe('/foo.jpg');
    expect(wrapper.find('.group').exists()).toBe(true);
    expect(wrapper.find('.vectors').exists()).toBe(true);
  });

  it('renders notes and omits unused metadata', () => {
    const shots = [{ pitch: [0, 0], yaw: [0, 0] }];
    const wrapper = mount(SessionStats, {
      props: {
        shots,
        processedShots: shots,
        session: {
          notes: 'Work on trigger prep next time.',
          right_handed_display: 'Right',
          course_number: '5',
          fire_type_display: 'Live fire'
        }
      },
      global: {
        plugins: [PrimeVue],
        stubs: {
          RawTraceVisualizer: { template: '<svg></svg>' },
          SessionShotGroup: { template: '<div class="group"></div>' },
          SessionVectorPlots: { template: '<div class="vectors"></div>' }
        }
      }
    });
    const notes = wrapper.find('.session-stats__notes');
    expect(notes.exists()).toBe(true);
    expect(notes.text()).toContain('trigger prep next time');
    const meta = wrapper.find('.session-stats__meta');
    expect(meta.text()).toContain('Fire Type');
    expect(meta.text()).not.toContain('Handedness');
    expect(meta.text()).not.toContain('Course');
  });

  it('shows duration as mm:ss in the summary', () => {
    const shots = [{ pitch: [0, 0], yaw: [0, 0] }];
    const wrapper = mount(SessionStats, {
      props: {
        shots,
        processedShots: shots,
        session: {
          time_display: '126.s',
          shot_count: 1
        }
      },
      global: {
        plugins: [PrimeVue],
        stubs: {
          RawTraceVisualizer: { template: '<svg></svg>' },
          SessionShotGroup: { template: '<div class="group"></div>' },
          SessionVectorPlots: { template: '<div class="vectors"></div>' }
        }
      }
    });
    const summary = wrapper.find('.session-stats__summary-line');
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toContain('duration 02:06');
  });

  it('toggles layout classes when photo is missing', async () => {
    const shots = [{ pitch: [0, 0], yaw: [0, 0] }];
    const wrapper = mount(SessionStats, {
      props: {
        shots,
        processedShots: shots,
        photo: ''
      },
      global: {
        plugins: [PrimeVue],
        stubs: {
          RawTraceVisualizer: { template: '<svg></svg>' },
          SessionShotGroup: { template: '<div class="group"></div>' },
          SessionVectorPlots: { template: '<div class="vectors"></div>' }
        }
      }
    });
    const visuals = wrapper.find('.session-stats__visuals');
    expect(visuals.classes()).toContain('session-stats__visuals--no-photo');
    await wrapper.setProps({ photo: '/images/example.jpg' });
    expect(visuals.classes()).toContain('session-stats__visuals--with-photo');
  });
});
