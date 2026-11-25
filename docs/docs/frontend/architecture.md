---
title: Frontend Architecture
---

# Frontend Architecture (`frontend/src`)

The client application is built with **React 19.3 + TypeScript 5.9 + Vite 8.3 + Tailwind CSS v4**, consuming `@nexus/types` directly for shared enums, DTOs, and WebSocket event names.

## 1. Five Portals & Routing (`src/routes/paths.ts`, `AppRouter.tsx`)

| Portal            | Layout & Guard                                                     | Key Routes                                                                                                                                                                                                                                 |
| :---------------- | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guest**         | `GuestLayout` (redirects `SUPPORT_STAFF` to `/staff/inbox`)        | `/`, `/search`, `/categories`, `/product/:id`, `/shop/:id`, `/auction`, `/auction/:id`                                                                                                                                                     |
| **Auth**          | Public auth pages                                                  | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp`                                                                                                                                                                |
| **Buyer**         | `ProtectedRoute([Role.BUYER, Role.SELLER])` + `BuyerLayout`        | `/cart`, `/checkout`, `/payment/success`, `/buyer/orders`, `/buyer/wallet`, `/buyer/bids`, `/buyer/disputes`, `/buyer/addresses`, `/buyer/reputation`, `/buyer/notifications`                                                              |
| **Seller**        | `ProtectedRoute([Role.SELLER])` + `SellerLayout`                   | `/seller`, `/seller/products`, `/seller/orders`, `/seller/shipping`, `/seller/auctions`, `/seller/finance`, `/seller/disputes`, `/seller/settings`                                                                                         |
| **Support Staff** | `ProtectedRoute([Role.SUPPORT_STAFF, Role.ADMIN])` + `StaffLayout` | `/staff/inbox`, `/staff/seller-approvals`, `/staff/disputes`, `/staff/auction-support`, `/staff/banners`, `/staff/faq`, `/staff/performance`                                                                                               |
| **Admin**         | `ProtectedRoute([Role.ADMIN])` + `AdminLayout` + `useAdminContext` | `/admin/overview`, `/admin/users`, `/admin/sellers`, `/admin/stores`, `/admin/categories`, `/admin/products`, `/admin/orders`, `/admin/auctions`, `/admin/refunds`, `/admin/finance`, `/admin/reports`, `/admin/studio`, `/admin/settings` |

Route subtrees are wrapped in `RouteErrorBoundary` to catch unexpected render crashes and offer a clean reload fallback.

## 2. State Management & Contexts

- **`AuthContext` (`src/contexts/AuthContext.tsx`)**:
  - Manages `token`, `user`, `storedUser`, `isAuthenticated`, `isLoading`, role flags (`isAdmin`, `isStaff`, `isSeller`), and `activeMode` (`'SELLER' | 'BUYER'`).
  - Deduplicates concurrent `/users/me` calls via `inFlightPromiseRef` and syncs sessions across browser tabs via `nexus:auth-change` and `storage` events.
  - On `login()`: triggers `mergeGuestCartAfterLogin()` for Buyer/Seller accounts, while **skipping** cart merge for `ADMIN` and `SUPPORT_STAFF`.
  - When `isShopSuspended = true`, forces `activeMode` to `'BUYER'`.
- **`ToastProvider` (`src/components/ToastNotification/ToastProvider.tsx`)**:
  - Renders via `createPortal(..., document.body)`, caps visible toasts at 3 (`slice(-3)`), and supports `duration`, `actionLabel`, `onClick`, and `targetUrl`.
- **`useAdminContext` (`src/components/adminDashboard/shared/useAdminContext.ts`)**:
  - Reads `useOutletContext<AdminTabProps>()` from `AdminLayout` so sidebar counts and search state stay synchronized across all Admin tabs.
- **TanStack Query & Zustand**: Server-state caching and lightweight client UI state.

## 3. API & Socket.IO Layer (`src/services/`)

- **Axios Client (`services/api.ts`)**:
  - Default `20000ms` timeout, automatically injects `Authorization: Bearer <token>` and `Accept-Language: vi | en`.
  - Response interceptor handles HTTP `401` using `isRefreshing` and `failedQueue` so concurrent expired calls trigger only one `/auth/refresh` request before replaying.
- **Error Normalization (`lib/apiErrors.ts`)**: `getApiErrorMessage()` maps backend `errorCode` values (e.g., `CANNOT_PURCHASE_OWN_PRODUCT`) to localized messages.
- **Socket.IO Clients**: `auctionSocket`, `chatSocket.ts`, and `notificationSocket.ts` connect to the 3 backend namespaces.
