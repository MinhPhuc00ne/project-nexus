# Frontend Engineering Guide

This guide provides frontend engineers with a comprehensive overview of the monorepo architecture, session management, component standardization, and API integration within the `frontend/` application.

## 1. Technology Stack Overview

- Framework: React 19 and TypeScript (Strict Mode)
- Bundler and Development Server: Vite 8 (Hot Module Replacement)
- Styling: Tailwind CSS v4 and `@tailwindcss/vite`
- Icon Libraries: Lucide React and `@ant-design/icons`
- Routing: React Router 7 (`react-router-dom`)
- Contract Typing: `@nexus/types` (Monorepo shared library)
- HTTP Client: Centralized Axios instance (`src/services/api.ts`)

## 2. Monorepo Integration and Vite Configuration

The web client directly consumes type contracts from `@nexus/types`. To support instant Hot Module Replacement and avoid CommonJS and ESM resolution conflicts during local development, `frontend/vite.config.ts` defines path aliases mapping directly to TypeScript source files:

```typescript
// frontend/vite.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@nexus/types': fileURLToPath(new URL('../packages/types/src/index.ts', import.meta.url)),
    },
  },
});
```

This configuration enables Vite to compile TypeScript source code on the fly using esbuild. When engineers update DTOs, Enums, or event payloads in `packages/types/src/`, browser views update immediately without requiring manual re-compilation.

## 3. Session Architecture and Authentication Management

The authentication layer is centralized in `frontend/src/contexts/AuthContext.tsx`, wrapping the root application tree in `App.tsx`.

### In-Flight Request Deduplication

When multiple components mounted concurrently or transitioning routes invoke `fetchCurrentUser()`, `AuthContext` maintains an `inFlightPromiseRef` reference. If a network request is already pending, subsequent invocations attach to the existing Promise rather than dispatching redundant network calls to `/users/me`.

### Multi-Tab Session Synchronization via Storage Events

`AuthContext` listens to browser storage events and the internal `nexus:auth-change` event stream:

- Logging in or logging out in one browser tab instantly synchronizes session state across all open tabs.
- Toggling between Buyer and Seller roles updates the active user interface immediately without triggering full page reloads.

## 4. Standardized Service Integration and Database Seeding

The frontend application connects directly to backend REST API endpoints and real-time WebSocket channels through the centralized Axios client in `src/services/api.ts`:

- All demo fixtures and initial datasets are consolidated directly into `backend/prisma/seed.ts`.
- Frontend services handle strongly-typed response structures, surface descriptive error messages during network anomalies, and maintain seamless user experiences.
- The real-time auction service (`src/services/auction.service.ts`) synchronizes current highest bids, leading bidder identity, and anti-sniping countdown updates upon successful bid commitments.
