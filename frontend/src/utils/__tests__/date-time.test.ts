import { describe, expect, it } from 'vitest';
import { minEndDateTime } from '../date-time';

describe('date-time utilities', () => {
  it('returns undefined for null or invalid date strings', () => {
    expect(minEndDateTime(null)).toBeUndefined();
    expect(minEndDateTime('')).toBeUndefined();
    expect(minEndDateTime('not-a-date')).toBeUndefined();
  });

  it('returns a datetime-local string 1 minute after start with seconds zeroed', () => {
    const result = minEndDateTime('2026-11-22T10:15:45');
    expect(result).toBe('2026-11-22T10:16');
  });
});
