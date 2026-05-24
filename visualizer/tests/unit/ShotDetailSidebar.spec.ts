import { describe, expect, it, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import router from '../../src/router';
import store from '../../src/store';
import ShotDetailSidebar from '../../src/components/ShotDetailSidebar';
import { cacheProcessedShots, clearSessionData } from '../../src/sessionData';
import type { PreprocessedShot } from '../../src/shotProcessor';

const multiShots: PreprocessedShot[] = [
  { pk: 1, session_pk: 1, shot_index: 1, pitch: [0], yaw: [0], hold_duration_s: 0.25, split_s: 0.12, post_shot_stability_500ms_mm: 3.2 },
  { pk: 2, session_pk: 1, shot_index: 2, pitch: [0], yaw: [0], hold_duration_s: 0.3, split_s: 0.11, post_shot_stability_500ms_mm: 2.8 },
  { pk: 3, session_pk: 1, shot_index: 3, pitch: [0], yaw: [0], hold_duration_s: 0.2, split_s: 0.1, post_shot_stability_500ms_mm: 4.1 }
];

const buttonStub = {
  inheritAttrs: false,
  props: ['disabled'],
  template: '<button :disabled="disabled" v-bind="$attrs"><slot name="icon"></slot><slot /></button>'
};

const commonStubs = {
  DataTable: { template: '<table></table>' },
  Column: { template: '<td></td>' },
  BreadCrumb: { name: 'BreadCrumb', props: ['home', 'model'], template: '<nav></nav>' },
  Button: buttonStub
};

beforeEach(() => {
  clearSessionData();
  store.sessions = { 1: { pk: 1, ready: true } };
  cacheProcessedShots(1, multiShots);
});

describe('ShotDetailSidebar navigation', () => {
  it('keeps the active tab when moving between shots', async () => {
    await router.push({ path: '/session/1/shot/2', query: { tab: 'raw' } });
    const pushSpy = vi.spyOn(router, 'push').mockImplementation(() => Promise.resolve(router.currentRoute.value));
    try {
      const wrapper = mount(ShotDetailSidebar, {
        global: {
          plugins: [PrimeVue, router],
          stubs: { ...commonStubs }
        }
      });
      await nextTick();
      await wrapper.find('[data-testid="shot-prev"]').trigger('click');
      await nextTick();
      await wrapper.find('[data-testid="shot-next"]').trigger('click');
      await nextTick();
      expect(pushSpy).toHaveBeenNthCalledWith(1, { path: '/session/1/shot/1', query: { tab: 'raw' } });
      expect(pushSpy).toHaveBeenNthCalledWith(2, { path: '/session/1/shot/3', query: { tab: 'raw' } });
    } finally {
      pushSpy.mockRestore();
    }
  });

  it('disables the next button when the current shot is the last one', async () => {
    await router.push({ path: '/session/1/shot/3', query: { tab: 'track' } });
    const wrapper = mount(ShotDetailSidebar, {
      global: {
        plugins: [PrimeVue, router],
        stubs: { ...commonStubs }
      }
    });
    await nextTick();
    const nextButton = wrapper.find('[data-testid="shot-next"]');
    expect(nextButton.element.hasAttribute('disabled')).toBe(true);
    const prevButton = wrapper.find('[data-testid="shot-prev"]');
    expect(prevButton.element.hasAttribute('disabled')).toBe(false);
  });

  it('exposes post-shot stability in the stability table data', async () => {
    await router.push({ path: '/session/1/shot/1', query: { tab: 'track' } });
    const wrapper = mount(ShotDetailSidebar, {
      global: {
        plugins: [PrimeVue, router],
        stubs: { ...commonStubs }
      }
    });
    await nextTick();
    const stabilityRows = wrapper.vm.stability as Array<{ key: string; value: string }>;
    expect(stabilityRows.some(row => row.key === 'Post-shot stability 500 ms' && row.value === '3.2 mm')).toBe(true);
  });

  it('keeps breadcrumb navigation inside the router', async () => {
    await router.push({ path: '/session/1/shot/2', query: { tab: 'track' } });
    const pushSpy = vi.spyOn(router, 'push').mockImplementation(() => Promise.resolve(router.currentRoute.value));
    try {
      const wrapper = mount(ShotDetailSidebar, {
        global: {
          plugins: [PrimeVue, router],
          stubs: { ...commonStubs }
        }
      });
      const breadcrumb = wrapper.findComponent({ name: 'BreadCrumb' });
      const preventDefault = vi.fn();
      breadcrumb.props('home').command({ originalEvent: { preventDefault } });
      expect(preventDefault).toHaveBeenCalled();
      expect(pushSpy).toHaveBeenCalledWith('/dashboard');

      preventDefault.mockClear();
      breadcrumb.props('model')[0].command({ originalEvent: { preventDefault } });
      expect(preventDefault).toHaveBeenCalled();
      expect(pushSpy).toHaveBeenCalledWith('/session/1');
    } finally {
      pushSpy.mockRestore();
    }
  });
});
