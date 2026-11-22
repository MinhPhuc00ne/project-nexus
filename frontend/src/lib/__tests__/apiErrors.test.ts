import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, getApiErrorMessages } from '../apiErrors';

describe('apiErrors', () => {
  it('extracts deduplicated error messages from errors array', () => {
    const result = getApiErrorMessages({
      errors: ['Email is invalid', 'Email is invalid', ' Password too short '],
      message: 'Fallback message',
    });

    expect(result).toEqual(['Email is invalid', 'Password too short']);
  });

  it('falls back to message string when errors array is empty', () => {
    expect(getApiErrorMessage({ message: 'Unauthorized' })).toBe('Unauthorized');
  });

  it('returns default fallback when payload is empty or invalid', () => {
    expect(getApiErrorMessage(null, 'Default error')).toBe('Default error');
    expect(getApiErrorMessage({})).toBe('Yêu cầu thất bại.');
  });
});
