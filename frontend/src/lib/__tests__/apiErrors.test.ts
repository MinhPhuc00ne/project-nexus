import { describe, expect, it, beforeEach } from 'vitest';
import i18n from '../../i18n';
import { getApiErrorMessage, getApiErrorMessages } from '../apiErrors';

describe('apiErrors', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('extracts deduplicated error messages from errors array', () => {
    const result = getApiErrorMessages({
      errors: ['Email is invalid', 'Email is invalid', ' Password too short '],
      message: 'Fallback message',
    });

    expect(result).toEqual(['Email is invalid', 'Password too short']);
  });

  it('translates known backend errorCode based on active language', async () => {
    expect(getApiErrorMessage({ errorCode: 'CANNOT_PURCHASE_OWN_PRODUCT', message: 'Raw' })).toBe(
      'Bạn không thể tự mua sản phẩm do chính shop của mình đăng bán.',
    );

    await i18n.changeLanguage('en');
    expect(getApiErrorMessage({ errorCode: 'CANNOT_PURCHASE_OWN_PRODUCT', message: 'Raw' })).toBe(
      'You cannot purchase products listed by your own shop.',
    );
  });

  it('falls back to message string when errors array is empty', () => {
    expect(getApiErrorMessage({ message: 'Unauthorized' })).toBe('Unauthorized');
  });

  it('returns default fallback when payload is empty or invalid', () => {
    expect(getApiErrorMessage(null, 'Default error')).toBe('Default error');
    expect(getApiErrorMessage({})).toBe('Yêu cầu thất bại.');
  });
});
