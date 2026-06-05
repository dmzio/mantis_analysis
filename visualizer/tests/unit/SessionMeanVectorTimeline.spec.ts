import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import SessionMeanVectorTimeline from '../../src/components/SessionMeanVectorTimeline';

function makeSession(pk: number, date: string, xMm: number, yMm: number, shotCount = 10) {
  const magnitudeMm = Math.hypot(xMm, yMm);
  return {
    pk,
    date,
    fmtDate: date,
    firearm_label: `Pistol ${pk}`,
    drill_label: `Drill ${pk}`,
    meanPullVector: {
      xMm,
      yMm,
      magnitudeMm,
      angleDeg: (Math.atan2(yMm, xMm) * 180) / Math.PI,
      shotCount
    }
  };
}

describe('SessionMeanVectorTimeline', () => {
  it('builds chronological strictly scaled arrow items', () => {
    const wrapper = mount(SessionMeanVectorTimeline, {
      props: {
        sessions: [
          makeSession(2, '2024-01-02', 20, 0),
          makeSession(1, '2024-01-01T09:00:00Z', 10, 0),
          makeSession(4, '2024-01-01T12:00:00Z', 0, 15),
          { pk: 3, date: '2024-01-03', fmtDate: '2024-01-03' }
        ]
      },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });

    expect(wrapper.text()).toContain('Mean pull vectors');
    expect(wrapper.vm.arrowItems.map((item: any) => item.pk)).toEqual([1, 4, 2]);
    expect(wrapper.vm.arrowItems[0].label).toBe(wrapper.vm.arrowItems[1].label);
    expect(wrapper.vm.arrowItems[0].originKey).toBe(wrapper.vm.arrowItems[1].originKey);
    expect(wrapper.vm.arrowItems[2].magnitudeMm).toBeCloseTo(20);
    expect(wrapper.vm.arrowItems[2].scaleRatio).toBeCloseTo(1);
    expect(wrapper.vm.arrowItems[0].scaleRatio).toBeCloseTo(0.5);
    expect(wrapper.vm.scaleReferenceMm).toBe(20);
    expect(wrapper.vm.chart.data.labels).toHaveLength(2);
    expect(wrapper.vm.chart.data.datasets[0].data).toHaveLength(2);
    expect(wrapper.vm.chart.plugins[0].verticalScaleRatio).toBeGreaterThan(0.85);
    expect(wrapper.vm.chart.plugins[0].drawEndpointDots).toBe(false);
    expect(wrapper.vm.chart.plugins.some((plugin: any) => plugin.id === 'mean-pull-vector-arrows')).toBe(true);
    expect(wrapper.text()).toContain('longest selected mean vector');
  });

  it('renders an empty state without finite mean vectors', () => {
    const wrapper = mount(SessionMeanVectorTimeline, {
      props: { sessions: [{ pk: 1, date: '2024-01-01', fmtDate: '2024-01-01' }] },
      global: { plugins: [PrimeVue], stubs: { Chart: { template: '<canvas></canvas>' } } }
    });

    expect(wrapper.text()).toContain('No mean pull vectors');
    expect(wrapper.vm.arrowItems).toHaveLength(0);
  });
});
