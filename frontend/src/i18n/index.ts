import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  I18N_NAMESPACES,
  I18N_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
} from './config';

import viCommon from './locales/vi/common.json';
import viErrors from './locales/vi/errors.json';
import viAuth from './locales/vi/auth.json';
import viGuest from './locales/vi/guest.json';
import viAuction from './locales/vi/auction.json';
import viCommerce from './locales/vi/commerce.json';
import viBuyer from './locales/vi/buyer.json';
import viSeller from './locales/vi/seller.json';
import viStaff from './locales/vi/staff.json';
import viAdmin from './locales/vi/admin.json';

import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enAuth from './locales/en/auth.json';
import enGuest from './locales/en/guest.json';
import enAuction from './locales/en/auction.json';
import enCommerce from './locales/en/commerce.json';
import enBuyer from './locales/en/buyer.json';
import enSeller from './locales/en/seller.json';
import enStaff from './locales/en/staff.json';
import enAdmin from './locales/en/admin.json';

export const resources = {
  vi: {
    common: viCommon,
    errors: viErrors,
    auth: viAuth,
    guest: viGuest,
    auction: viAuction,
    commerce: viCommerce,
    buyer: viBuyer,
    seller: viSeller,
    staff: viStaff,
    admin: viAdmin,
  },
  en: {
    common: enCommon,
    errors: enErrors,
    auth: enAuth,
    guest: enGuest,
    auction: enAuction,
    commerce: enCommerce,
    buyer: enBuyer,
    seller: enSeller,
    staff: enStaff,
    admin: enAdmin,
  },
} as const;

function syncDocumentLanguage(lng: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = normalizeLanguage(lng);
}

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES.map((item) => item.code),
      defaultNS: 'common',
      ns: [...I18N_NAMESPACES],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: I18N_STORAGE_KEY,
        caches: ['localStorage'],
      },
      react: {
        useSuspense: false,
      },
    });

  i18n.on('languageChanged', syncDocumentLanguage);
  syncDocumentLanguage(i18n.resolvedLanguage || DEFAULT_LANGUAGE);
}

export default i18n;
