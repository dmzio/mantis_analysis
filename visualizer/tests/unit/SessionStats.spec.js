import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SessionStats from '../../src/components/SessionStats';

describe('SessionStats', () => {
  it('shows total shots', () => {
    const wrapper = mount(SessionStats, { props: { shots: [1,2,3] } });
    expect(wrapper.text()).toMatch(/Total shots:\s*3/);
  });
});
