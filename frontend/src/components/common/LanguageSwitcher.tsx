import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, normalizeLanguage, type SupportedLanguage } from '../../i18n/config';

export interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

/**
 * Allows users to switch the active UI language without altering the current URL.
 */
export default function LanguageSwitcher({
  compact = false,
  className = '',
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common');
  const activeLang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const handleChange = (nextLang: SupportedLanguage) => {
    if (nextLang !== activeLang) {
      void i18n.changeLanguage(nextLang);
    }
  };

  if (SUPPORTED_LANGUAGES.length <= 2) {
    const nextOption =
      SUPPORTED_LANGUAGES.find((item) => item.code !== activeLang) ?? SUPPORTED_LANGUAGES[0];

    return (
      <button
        type="button"
        onClick={() => handleChange(nextOption.code)}
        aria-label={t('language.switchAria')}
        title={t('language.switchAria')}
        data-testid="language-switcher"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${className}`.trim()}
      >
        <Languages className="size-3.5 text-slate-500" aria-hidden="true" />
        <span>
          {compact
            ? activeLang.toUpperCase()
            : `${activeLang.toUpperCase()} / ${nextOption.shortLabel}`}
        </span>
      </button>
    );
  }

  return (
    <label
      className={`inline-flex items-center gap-1.5 text-xs text-slate-700 ${className}`.trim()}
    >
      <Languages className="size-3.5 text-slate-500" aria-hidden="true" />
      <select
        aria-label={t('language.switchAria')}
        value={activeLang}
        onChange={(event) => handleChange(normalizeLanguage(event.target.value))}
        data-testid="language-switcher"
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.shortLabel} - {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}
