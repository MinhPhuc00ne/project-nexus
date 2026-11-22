import { describe, expect, it, beforeEach } from 'vitest';
import i18n from '../index';
import { formatCurrency } from '../formatters';
import { normalizeLanguage } from '../config';

describe('i18n infrastructure', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('normalizes raw browser locales cleanly', () => {
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('vi-VN')).toBe('vi');
    expect(normalizeLanguage('fr-FR')).toBe('vi');
  });

  it('switches language between vi and en and updates document lang', async () => {
    expect(i18n.t('common:nav.home')).toBe('Trang chủ');
    await i18n.changeLanguage('en');
    expect(i18n.t('common:nav.home')).toBe('Home');
    expect(document.documentElement.lang).toBe('en');
  });

  it('formats currency according to locale', () => {
    const formattedVi = formatCurrency(150000, 'vi');
    const formattedEn = formatCurrency(150000, 'en');
    expect(formattedVi).toContain('150');
    expect(formattedEn).toContain('150');
  });

  it('switches report reasons, seller presets, and service error keys cleanly to en', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('common:reportModal.productReasons.0')).toBe('Counterfeit / Not authentic');
    expect(i18n.t('common:reportModal.shopReasons.0')).toBe(
      'Suspected scam / Off-platform bank transfer request',
    );
    expect(i18n.t('seller:productForm.presetGroups.0.name')).toBe('Color');
    expect(i18n.t('errors:services.missingRefreshToken')).toBe('Refresh token not found.');
    expect(i18n.t('errors:services.invalidAuctionLotData')).toBe('Invalid auction lot data.');
    expect(i18n.t('errors:services.cartMergeUnconfirmed')).toBe(
      'Server did not confirm the cart merge result.',
    );
    expect(i18n.t('errors:services.missingProductId')).toBe('Missing product ID.');
  });
});
