---
title: 'ADR-002: Frontend i18n Architecture'
---

# ADR-002: URL-Preserving Frontend Internationalization (`i18next`)

- **Status**: Accepted
- **Context**: The platform relies on fixed route paths across 5 portals, Google OAuth callbacks, notification `targetUrl` links, and chatbot route navigation.
- **Decision**: Implement `i18next` + `react-i18next` with 10 typed domain namespaces (`vi`/`en`), `localStorage` persistence, URL preservation, `<html lang>` sync, Axios `Accept-Language` header injection, backend `errorCode` translation, and CI parity checks (`npm run i18n:check`).
- **Consequences**: Zero breakage to OAuth/deep links, and adding new languages requires only adding a `locales/{lang}/` folder and registering one entry in `config.ts`.
