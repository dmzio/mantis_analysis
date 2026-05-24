import { describe, it, expect } from 'vitest';
import { formatSessionDuration } from '../../src/durationFmt';

describe('durationFmt', () => {
  it('renders seconds with padding and rounding', () => {
    expect(formatSessionDuration(0)).toBe('00:00');
    expect(formatSessionDuration(61.2)).toBe('01:01');
    expect(formatSessionDuration(179.7)).toBe('03:00');
  });

  it('understands colon and textual inputs', () => {
    expect(formatSessionDuration('1:02.7')).toBe('01:03');
    expect(formatSessionDuration('2m 3.1s')).toBe('02:03');
    expect(formatSessionDuration('52.2s')).toBe('00:52');
  });

  it('handles values with trailing dots', () => {
    expect(formatSessionDuration('126.s')).toBe('02:06');
  });

  it('returns empty string when duration is missing or invalid', () => {
    expect(formatSessionDuration(undefined)).toBe('');
    expect(formatSessionDuration('')).toBe('');
  });
});
