import { describe, it, expect, beforeEach } from 'vitest';
import {
  appSettings,
  getActiveDriftMode,
  loadAppSettings,
  resetAppSettings,
  updateAppSettings
} from '../../src/appSettings';

describe('appSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppSettings();
  });

  it('enables drift correction by default', () => {
    expect(loadAppSettings().driftCorrection).toBe(true);
    expect(appSettings.driftCorrection).toBe(true);
    expect(getActiveDriftMode()).toBe('corrected');
  });

  it('persists drift correction mode', () => {
    updateAppSettings({ driftCorrection: false });
    expect(getActiveDriftMode()).toBe('original');
    const stored = JSON.parse(localStorage.getItem('appSettings') || '{}');
    expect(stored.driftCorrection).toBe(false);
  });
});
