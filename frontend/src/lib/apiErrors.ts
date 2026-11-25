import i18n from '../i18n';
import { normalizeLanguage } from '../i18n/config';

function messages(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((item): item is string => typeof item === 'string' && !!item.trim())
    .map((item) => item.trim());
}

/**
 * Extracts deduplicated error messages from a backend API error payload.
 *
 * @param payload - Unknown response body from Axios error
 * @returns Array of normalized error strings
 */
export function getApiErrorMessages(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as { errors?: unknown; message?: unknown; errorCode?: unknown };
  const errors = messages(record.errors);
  if (errors.length > 0) {
    return [...new Set(errors)];
  }

  if (typeof record.errorCode === 'string' && record.errorCode.trim()) {
    const lang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    const code = record.errorCode.trim();
    const translated = i18n.getResource(lang, 'errors', `codes.${code}`) as unknown;
    if (typeof translated === 'string' && translated.trim()) {
      return [translated];
    }
  }

  return [...new Set(messages(record.message))];
}

/**
 * Formats a localized user-facing error message from a backend API payload.
 *
 * @param payload - Unknown response body from Axios error
 * @param fallback - Optional fallback text
 * @returns Localized error string
 */
export function getApiErrorMessage(payload: unknown, fallback?: string): string {
  const resolvedFallback = fallback ?? i18n.t('errors:default');
  return getApiErrorMessages(payload).join(' · ') || resolvedFallback;
}
