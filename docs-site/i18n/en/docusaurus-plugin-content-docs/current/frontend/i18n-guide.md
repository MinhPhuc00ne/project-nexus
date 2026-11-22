---
title: Internationalization (i18n) Guide
---

# Frontend Internationalization (`i18next` + `react-i18next`)

The frontend uses domain-scoped **namespaces** (`frontend/src/i18n/`), preserves URLs without locale prefixes (defaulting to `vi`), syncs `<html lang>`, and attaches `Accept-Language` on every Axios request.

## 10 Namespaces

`common`, `errors`, `auth`, `guest`, `auction`, `commerce`, `buyer`, `seller`, `staff`, `admin`.

## Adding a New Language (e.g. Japanese `ja`)

1. Copy `frontend/src/i18n/locales/vi/` to `frontend/src/i18n/locales/ja/` and translate the 10 JSON files.
2. Register `{ code: 'ja', label: '日本語', shortLabel: 'JA', intlLocale: 'ja-JP' }` in `frontend/src/i18n/config.ts`.
3. Import the `ja` JSON resources into `frontend/src/i18n/index.ts`.
4. Run `npm run i18n:check` to verify 100% key and interpolation parity.
