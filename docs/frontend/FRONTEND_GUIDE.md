# Project Nexus - Frontend Engineering Guide

This guide provides frontend engineers with a complete walkthrough of the architecture, state management, mock layer, component standards, and local development workflow for the **Nexus Web Portal** (`frontend/web`).

---

## 1. Tech Stack Overview

- **Framework:** React 19 + TypeScript (Strict Mode)
- **Build Tool:** Vite 8 (Hot Module Replacement)
- **Styling:** Tailwind CSS v4 + `@tailwindcss/vite`
- **3D Graphics:** Three.js (WebGL 3D live auctions and showcase models)
- **Icons:** Lucide React
- **Routing:** React Router 7 (`react-router-dom`)
- **Shared Contracts:** `@nexus/types` (Monorepo shared library)

---

## 2. Monorepo Integration & Vite Configuration

The frontend consumes contracts from `@nexus/types`. To support instant hot reloading and eliminate CommonJS/ESM compilation conflicts during local development, `frontend/web/vite.config.ts` defines an alias that maps directly to TypeScript source:

```typescript
// frontend/web/vite.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@nexus/types': fileURLToPath(new URL('../../packages/types/src/index.ts', import.meta.url)),
    },
  },
});
```

> **Why this matters:** Vite compiles TypeScript on the fly using esbuild. Engineers can update shared DTOs or enums in `packages/types/src/` and see the changes reflected immediately in the browser without running manual rebuild commands.

---

## 3. Authentication & Session Architecture (`AuthContext`)

The authentication layer is centralized in [`frontend/web/src/contexts/AuthContext.tsx`](../frontend/web/src/contexts/AuthContext.tsx), wrapping the entire application in `App.tsx`.

### 3.1 In-Flight Request Deduplication

Previously, mounting multiple layout components on page load caused 6–7 redundant requests to `/api/v1/users/me`. `AuthContext` solves this with an in-flight Promise reference:

```typescript
const inFlightPromiseRef = useRef<Promise<UserProfile | null> | null>(null);

const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
  const currentToken = getStoredToken();
  if (!currentToken) {
    setUser(null);
    setIsLoading(false);
    return null;
  }

  // Deduplicate: Reuse existing pending promise
  if (inFlightPromiseRef.current) {
    return inFlightPromiseRef.current;
  }

  const promise = (async () => {
    try {
      const profile = await getMe();
      setUser(profile);
      return profile;
    } catch (error) {
      console.warn('[AuthContext] Could not fetch profile:', error);
      return null;
    } finally {
      setIsLoading(false);
      inFlightPromiseRef.current = null;
    }
  })();

  inFlightPromiseRef.current = promise;
  return promise;
}, []);
```

### 3.2 Cross-Tab Session Synchronization

`AuthContext` listens to both browser `storage` events and custom `nexus:auth-change` events:

- Logging in or logging out in one tab instantly synchronizes state across all open tabs.
- Updating user profile or switching between Buyer and Seller modes updates the UI immediately.

### 3.3 Consuming Auth State

Use the custom hook `useAuth()` in any component:

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, isAuthenticated, isAdmin, isSeller, logout } = useAuth();
  // ...
}
```

---

## 4. Mock Layer & Graceful Fallback Strategy

Located in `frontend/web/src/mocks/`:

- [`config.ts`](../frontend/web/src/mocks/config.ts): Environment reader (`VITE_USE_MOCK=true/false`).
- [`products.mock.ts`](../frontend/web/src/mocks/products.mock.ts): Realistic products, categories, 3D keys.
- [`tickets.mock.ts`](../frontend/web/src/mocks/tickets.mock.ts): Support staff ticket conversations.

### 4.1 Service Fallback Implementation

Services (e.g. [`products.service.ts`](../frontend/web/src/services/products.service.ts)) implement automated fallback:

```typescript
export async function getProducts(params?: ProductFilterParams): Promise<ProductItem[]> {
  if (isMockEnabled()) {
    await mockDelay(150);
    return filterMockProducts(params);
  }

  try {
    const res = await api.get('/catalog/products', { params });
    return res.data.data;
  } catch (error) {
    console.warn('[ProductsService] API failed, falling back to mock:', error);
    return filterMockProducts(params);
  }
}
```

**Benefits:**

1. Frontend development and testing proceed unhindered even if the backend is offline.
2. Setting `VITE_USE_MOCK=false` attempts live API calls, falling back smoothly if an endpoint is incomplete.

---

## 5. Clean Code Standards & Component Limits (< 300 Lines Guideline)

- **Guideline & Core Purpose:** Keeping files under **~300 lines** is strongly recommended to maintain high cohesion and prevent "God Components". Unrelated responsibilities and disparate logic must not be bundled together in the same file, as this creates maintenance bottlenecks and makes searching or editing code difficult.
- **Pragmatic Flexibility:** The 300-line limit is an architectural guideline and best practice rather than an absolute restriction. If a file legitimately exceeds 300 lines while adhering strictly to a single, coherent responsibility and natural design, it is fully permitted.
- **Decomposition Strategy:**
  - Break visual sections into subcomponents (e.g., `ProductImageGallery.tsx`, `CartOrderSummary.tsx`).
  - Extract reusable business logic and side effects into custom hooks (e.g., `useLiveAuction.ts`).
  - Move static navigation and tables into configuration files (e.g., `staffNavigationData.ts`).
  - Keep styling clean using Tailwind CSS utilities.

---

## 6. Development Workflow Commands

Run all commands from the repository root:

```bash
# Start frontend development server on port 5173
npm run dev:web

# Build frontend for production
npm run build:web

# Check formatting across all files
npm run format:check

# Format code automatically with Prettier
npm run format

# Run linter checks
npm run lint
```
