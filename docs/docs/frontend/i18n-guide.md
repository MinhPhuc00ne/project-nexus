---
title: Multilingual Guide (i18n)
---

# Multilingual Architecture (`i18next` + `react-i18next`)

The Frontend implements a domain-namespace i18n architecture (`frontend/src/i18n/`) that preserves current URLs (default `vi`), synchronizes `<html lang>`, and injects the `Accept-Language` header into every Axios request.

## 1. Directory Structure and 10 Namespaces

```text
frontend/src/i18n/
├── config.ts                 # SUPPORTED_LANGUAGES, normalizeLanguage() ('en-US' -> 'en', fallback 'vi')
├── formatters.ts             # formatCurrency(amount, lang), formatDateTime() using Intl locales
├── index.ts                  # Initializes i18next, LanguageDetector, updates document.documentElement.lang
└── locales/
    ├── vi/                   # 10 Vietnamese JSON files
    └── en/                   # 10 English JSON files
```

| Namespace  | Domain Scope                                                                     |
| :--------- | :------------------------------------------------------------------------------- |
| `common`   | Navigation, footer, toasts, loading states, report modal, shared labels          |
| `errors`   | Service error messages (`services.*`) and Backend `errorCode` translations       |
| `auth`     | Login, registration, OTP verification, forgot and reset password                 |
| `guest`    | Homepage, search, category browsing, product and shop details                    |
| `auction`  | 3D auction room, bidding, lot history, complaints                                |
| `commerce` | Cart, checkout, PayOS, Wallet, COD, cancellations, and returns                   |
| `buyer`    | Buyer portal: orders, wallet, reputation, address book, notifications            |
| `seller`   | Seller portal: product form, inventory, GHN orders, auction consignment, finance |
| `staff`    | Staff portal: support inbox, seller approvals, disputes, banners, FAQ            |
| `admin`    | Admin portal: platform governance, refunds, system settings                      |

## 2. Automated Parity Check (`npm run i18n:check`)

`frontend/scripts/check-i18n-parity.mjs` verifies:

1. Every JSON file in `vi/` has a counterpart in `en/` and vice versa.
2. All nested keys match 100% across locales.
3. All interpolation placeholders (`{{variable}}`) match identically without translated variable names.

## 3. Adding a New Locale (e.g., Japanese `ja`)

1. Copy `frontend/src/i18n/locales/vi/` to `frontend/src/i18n/locales/ja/` and translate all 10 JSON files.
2. Register `{ code: 'ja', label: '日本語', shortLabel: 'JA', intlLocale: 'ja-JP' }` in `frontend/src/i18n/config.ts`.
3. Import the `ja` JSON resources into `frontend/src/i18n/index.ts`.
4. Run `npm run i18n:check` and `npm test --workspace=nexus-frontend` to verify parity and formatters.
