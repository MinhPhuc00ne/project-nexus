export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VI', intlLocale: 'vi-VN' },
  { code: 'en', label: 'English', shortLabel: 'EN', intlLocale: 'en-US' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';
export const I18N_STORAGE_KEY = 'nexus:language';

export const I18N_NAMESPACES = [
  'common',
  'errors',
  'auth',
  'guest',
  'auction',
  'commerce',
  'buyer',
  'seller',
  'staff',
  'admin',
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

/**
 * Resolves a raw locale string to a supported language code.
 *
 * @param raw - Raw language tag from browser or storage
 * @returns Supported language code defaulting to Vietnamese
 */
export function normalizeLanguage(raw?: string | null): SupportedLanguage {
  if (!raw) return DEFAULT_LANGUAGE;
  const base = raw.toLowerCase().split('-')[0];
  const matched = SUPPORTED_LANGUAGES.find((item) => item.code === base);
  return matched ? matched.code : DEFAULT_LANGUAGE;
}

/**
 * Looks up the BCP-47 Intl locale corresponding to a supported language.
 *
 * @param lang - Supported language code
 * @returns BCP-47 locale string for Intl APIs
 */
export function getIntlLocale(lang?: string | null): string {
  const code = normalizeLanguage(lang);
  return SUPPORTED_LANGUAGES.find((item) => item.code === code)?.intlLocale ?? 'vi-VN';
}
