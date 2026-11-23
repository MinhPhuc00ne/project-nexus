import i18n from './index';
import { getIntlLocale } from './config';

/**
 * Formats a numeric amount in VND using the active or specified locale.
 *
 * @param amount - Monetary value to format
 * @param language - Optional language override
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, language?: string): string {
  const locale = getIntlLocale(language ?? i18n.resolvedLanguage);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Formats a date value as a localized short date string.
 *
 * @param value - Date instance, timestamp, or ISO string
 * @param language - Optional language override
 * @returns Formatted date string or empty string when invalid
 */
export function formatDate(value: Date | string | number, language?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = getIntlLocale(language ?? i18n.resolvedLanguage);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a date value as a localized date and time string.
 *
 * @param value - Date instance, timestamp, or ISO string
 * @param language - Optional language override
 * @returns Formatted date-time string or empty string when invalid
 */
export function formatDateTime(value: Date | string | number, language?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = getIntlLocale(language ?? i18n.resolvedLanguage);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
