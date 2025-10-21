import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionAggregates from '../../src/components/SessionAggregates';
import store from '../../src/store';
import { aggregateSeries } from '../../src/sessionAggregates';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.SVGElement.prototype.getTotalLength = () => 100;
  }
  store.aggregates = {};
});

describe('SessionAggregates', () => {
  it('aggregates data and stores stats', () => {
    const shots = [
      {
        rel_pitch_moa:[0,0], rel_yaw_moa:[0,1], shot_index:1, start_index:0, pull_index_calc:0,
        sample_rate:1, length_1s:1, delta_pull:2, percent_10:0.5,
        hold_duration_s: 0.2,
        trigger_hold_s: 0.15, trigger_pull_s: 0.12, split_s: 1, score_numeric: 95,
        ellipse_major_mm: 5, ellipse_minor_mm: 3, ellipse_area_mm2: 40
      },
      {
        rel_pitch_moa:[0,1], rel_yaw_moa:[0,1], shot_index:1, start_index:0, pull_index_calc:0,
        sample_rate:1, length_1s:2, delta_pull:3, percent_10:0.7,
        hold_duration_s: 0.25,
        trigger_hold_s: 0.18, trigger_pull_s: 0.14, split_s: 1.1, score_numeric: 94,
        ellipse_major_mm: 6, ellipse_minor_mm: 4, ellipse_area_mm2: 50
      }
    ];
    mount(SessionAggregates, {
      props: { shots, sessionPk: 1 },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });
    expect(store.aggregates[1]).toBeTruthy();
    expect(store.aggregates[1].stats.hold_duration_s.mean).toBeGreaterThan(0);
  });

  it('averages across step when downsampling', () => {
    const shots = [
      { rel_pitch_moa:[0,2,4,6], rel_yaw_moa:[0,0,0,0], shot_index: 2, start_index: 0, sample_rate: 1 },
      { rel_pitch_moa:[1,3,5,7], rel_yaw_moa:[0,0,0,0], shot_index: 2, start_index: 0, sample_rate: 1 }
    ];
    const series = aggregateSeries(shots, 'abs_deviation_moa', 2);
    expect(series.length).toBe(2);
    expect(series[0].mean).toBeCloseTo(1.5);
    expect(series[0].sd).toBeCloseTo(0.5);
  });
});
