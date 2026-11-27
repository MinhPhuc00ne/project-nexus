---
title: Frontend Architecture
---

# Frontend Architecture (`frontend/src`)

The client application uses React 19.3, TypeScript 5.9, Vite 8.3, and Tailwind CSS v4. It imports `@nexus/contracts` directly for shared enums, Zod schemas, `AppErrorCode`, and WebSocket event names.

## 1. Five Portals and Routing (`src/routes/paths.ts`, `AppRouter.tsx`)

| Portal        | Layout and Guard                                                     | Key Routes                                                                                                                                                                                                                                 |
| :------------ | :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest         | `GuestLayout` (redirects `SUPPORT_STAFF` to `/staff/inbox`)          | `/`, `/search`, `/categories`, `/product/:id`, `/shop/:id`, `/auction`, `/auction/:id`                                                                                                                                                     |
| Auth          | Public authentication pages                                          | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp`                                                                                                                                                                |
| Buyer         | `ProtectedRoute([Role.BUYER, Role.SELLER])` and `BuyerLayout`        | `/cart`, `/checkout`, `/payment/success`, `/buyer/orders`, `/buyer/wallet`, `/buyer/bids`, `/buyer/disputes`, `/buyer/addresses`, `/buyer/reputation`, `/buyer/notifications`                                                              |
| Seller        | `ProtectedRoute([Role.SELLER])` and `SellerLayout`                   | `/seller`, `/seller/products`, `/seller/orders`, `/seller/shipping`, `/seller/auctions`, `/seller/finance`, `/seller/disputes`, `/seller/settings`                                                                                         |
| Support Staff | `ProtectedRoute([Role.SUPPORT_STAFF, Role.ADMIN])` and `StaffLayout` | `/staff/inbox`, `/staff/seller-approvals`, `/staff/disputes`, `/staff/auction-support`, `/staff/banners`, `/staff/faq`, `/staff/performance`                                                                                               |
| Admin         | `ProtectedRoute([Role.ADMIN])`, `AdminLayout`, and `useAdminContext` | `/admin/overview`, `/admin/users`, `/admin/sellers`, `/admin/stores`, `/admin/categories`, `/admin/products`, `/admin/orders`, `/admin/auctions`, `/admin/refunds`, `/admin/finance`, `/admin/reports`, `/admin/studio`, `/admin/settings` |

Route subtrees are wrapped in `RouteErrorBoundary` to catch unexpected render failures and provide a reload fallback.

## 2. State Management and Contexts

Frontend state relies on React Context providers, local component hooks, and Axios service modules rather than external client state stores.

- `AuthContext` (`src/contexts/AuthContext.tsx`) manages `token`, `user`, `storedUser`, `isAuthenticated`, `isLoading`, role flags (`isAdmin`, `isStaff`, `isSeller`), and `activeMode` (`'SELLER' | 'BUYER'`). It deduplicates concurrent `/users/me` calls via `inFlightPromiseRef`, synchronizes sessions across browser tabs via `nexus:auth-change` and `storage` events, triggers `mergeGuestCartAfterLogin()` for buyer and seller accounts while skipping cart merge for `ADMIN` and `SUPPORT_STAFF`, and forces `activeMode` to `'BUYER'` whenever `isShopSuspended` is true.
- `ToastProvider` (`src/components/ToastNotification/ToastProvider.tsx`) renders through `createPortal(..., document.body)`, caps visible toasts at three (`slice(-3)`), and supports `duration`, `actionLabel`, `onClick`, and `targetUrl`.
- `useAdminContext` (`src/components/adminDashboard/shared/useAdminContext.ts`) reads `useOutletContext<AdminTabProps>()` from `AdminLayout` so sidebar counts and search state stay synchronized across admin tabs.

## 3. API and Socket.IO Layer (`src/services/`)

- `services/api.ts` configures the shared Axios client with a `20000ms` timeout, injects `Authorization: Bearer <token>` and `Accept-Language: vi | en`, and coordinates HTTP `401` refreshes through `isRefreshing` and `failedQueue` so concurrent expired requests trigger a single `/auth/refresh` call before replaying.
- `lib/apiErrors.ts` exports `getApiErrorMessage()` to map backend `errorCode` values such as `CANNOT_PURCHASE_OWN_PRODUCT` to localized UI messages.
- `auctionSocket`, `chatSocket.ts`, and `notificationSocket.ts` connect to the three Socket.IO backend namespaces.
