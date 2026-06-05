import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionVectorPlots from '../../src/components/SessionVectorPlots';

describe('SessionVectorPlots', () => {
  it('builds vector datasets with mean vectors, spread overlays, and target rings', () => {
    const shots = [
      {
        pk: 1,
        score_numeric: 95,
        delta_pull_x_mm: 2,
        delta_pull_y_mm: 0,
        delta_pull: 2,
        delta_pull_angle_deg: 0,
        post_shot_max_excursion_500ms_x_mm: 0,
        post_shot_max_excursion_500ms_y_mm: 4,
        post_shot_max_excursion_500ms_mm: 4,
        post_shot_max_excursion_500ms_angle_deg: 90
      },
      {
        pk: 2,
        score_numeric: 96,
        delta_pull_x_mm: 4,
        delta_pull_y_mm: 2,
        delta_pull: Math.hypot(4, 2),
        delta_pull_angle_deg: 26.565,
        post_shot_max_excursion_500ms_x_mm: 2,
        post_shot_max_excursion_500ms_y_mm: 6,
        post_shot_max_excursion_500ms_mm: Math.hypot(2, 6),
        post_shot_max_excursion_500ms_angle_deg: 71.565
      },
      {
        pk: 3,
        score_numeric: 80,
        delta_pull_x_mm: 100,
        delta_pull_y_mm: 100,
        delta_pull: Math.hypot(100, 100),
        delta_pull_angle_deg: 45,
        post_shot_max_excursion_500ms_x_mm: 100,
        post_shot_max_excursion_500ms_y_mm: 100,
        post_shot_max_excursion_500ms_mm: Math.hypot(100, 100),
        post_shot_max_excursion_500ms_angle_deg: 45
      }
    ];
    const wrapper = mount(SessionVectorPlots, {
      props: { shots },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    expect(wrapper.text()).toContain('Pull displacement vectors');
    expect(wrapper.text()).toContain('Post-shot max excursion vectors');
    const pull = wrapper.vm.charts.find(chart => chart.key === 'pull');
    expect(pull.data.datasets[0].data).toHaveLength(6);
    expect(pull.data.datasets[1].label).toBe('Mean vector');
    expect(pull.data.datasets[1].data[1].x).toBeCloseTo(35.333);
    expect(pull.data.datasets[1].data[1].y).toBeCloseTo(34);
    expect(pull.data.datasets[1].data[1].magnitude).toBeCloseTo(Math.hypot(35.3333333333, 34));
    expect(pull.data.datasets[1].data[1].sdX).toBeGreaterThan(0);
    expect(pull.data.datasets[2].label).toBe('Mean endpoint ±1 SD');
    expect(pull.options.plugins.legend.display).toBe(true);
    expect(pull.plugins.some(plugin => plugin.id === 'equal-aspect-scale')).toBe(true);
    expect(pull.plugins.some(plugin => plugin.id === 'target-rings')).toBe(true);
    expect(pull.plugins.some(plugin => plugin.id === 'summary-spread-1')).toBe(true);
    const post = wrapper.vm.charts.find(chart => chart.key === 'postShot');
    expect(post.data.datasets[1].data[1].x).toBeCloseTo(34);
    expect(post.data.datasets[1].data[1].y).toBeCloseTo(36.667);
  });
});
