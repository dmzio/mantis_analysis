import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionPreviewCard from '../../src/components/SessionPreviewCard';

describe('SessionPreviewCard', () => {
  it('renders main session facts and a photo thumbnail', () => {
    const session = {
      pk: 42,
      fmtDate: '2026 Jun 05 10:17',
      drill_label: 'Open Training',
      avg_score: 96.3,
      shot_count: 50,
      duration_label: '46:36',
      username: 'dmz',
      firearm_label: 'Feinwerkbau P8X 4.5mm',
      fire_type_display: 'dry practice',
      notes: 'strained hand\nlive, paper'
    };

    const wrapper = mount(SessionPreviewCard, {
      props: { session, photo: 'blob:photo-42' }
    });

    expect(wrapper.text()).toContain('Open Training');
    expect(wrapper.text()).toContain('2026 Jun 05 10:17');
    expect(wrapper.text()).toContain('96.3');
    expect(wrapper.text()).toContain('50 shots');
    expect(wrapper.text()).toContain('46:36');
    expect(wrapper.text()).toContain('dmz');
    expect(wrapper.text()).toContain('Feinwerkbau P8X 4.5mm');
    expect(wrapper.text()).toContain('dry practice');
    expect(wrapper.text()).toContain('strained hand');
    expect(wrapper.find('img.session-preview-card__photo').attributes('src')).toBe('blob:photo-42');
  });

  it('uses the full preview width when no photo is available', () => {
    const wrapper = mount(SessionPreviewCard, {
      props: {
        session: {
          pk: 43,
          fmtDate: '2026 Jun 05 10:17',
          drill_label: 'Open Training',
          shot_count: 50
        }
      }
    });

    expect(wrapper.classes()).toContain('session-preview-card--no-photo');
    expect(wrapper.find('img.session-preview-card__photo').exists()).toBe(false);
  });
});
