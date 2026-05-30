import { describe, it, expect, beforeEach } from 'vitest';
import { appSettings, resetAppSettings } from '../../src/appSettings';
import {
  cacheProcessedShots,
  clearSessionData,
  getProcessedShots,
  getSessionDrift
} from '../../src/sessionData';

describe('sessionData drift variants', () => {
  beforeEach(() => {
    clearSessionData();
    resetAppSettings();
  });

  it('selects corrected shots by default and original shots when correction is disabled', () => {
    cacheProcessedShots(1, {
      original: [{ pk: 11, pitch: [0, 1], yaw: [0, 1] } as any],
      corrected: [{ pk: 11, pitch: [0, 0], yaw: [0, 0], drift_correction: { method: 'session_hold_linear' } } as any],
      drift: { method: 'session_hold_linear', yawSlope: 1, pitchSlope: 1 } as any
    });

    expect(getProcessedShots(1)[0].drift_correction).toBeTruthy();
    appSettings.driftCorrection = false;
    expect(getProcessedShots(1)[0].drift_correction).toBeUndefined();
    expect(getProcessedShots(1, 'corrected')[0].drift_correction).toBeTruthy();
    expect(getSessionDrift(1)?.method).toBe('session_hold_linear');
  });

  it('normalizes array-only cache records as both variants', () => {
    cacheProcessedShots(2, [{ pk: 21, pitch: [0], yaw: [0] } as any]);
    expect(getProcessedShots(2, 'original')).toHaveLength(1);
    expect(getProcessedShots(2, 'corrected')).toHaveLength(1);
    expect(getProcessedShots(2, 'corrected')[0].pk).toBe(21);
  });
});
