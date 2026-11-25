---
title: UI Specification
---

# UI Specification

This document defines the Design Tokens, layout hierarchy, route guards, and accessibility standards enforced across the Frontend.

## 1. Color System and Design Tokens

| Token Group      | Hex / Tailwind Value                         | Usage                                                                    |
| :--------------- | :------------------------------------------- | :----------------------------------------------------------------------- |
| Primary Brand    | `#1f5fe3` (Royal Blue)                       | Primary CTAs, active navigation indicators, focus rings, prominent links |
| Accent Highlight | `#f24e1e` / `#ff5722` (Orange Red)           | Live auction CTAs, cart badge counters, high-priority badges             |
| Page Canvas      | `#f8f7fc`                                    | Global application background                                            |
| Card / Surface   | `#ffffff` + `border-slate-200`               | Product cards, dashboard panels, modal containers                        |
| Subtle Surface   | `#f1f5f9` (`bg-slate-100`)                   | Secondary panels, table headers, skeleton placeholders                   |
| Text Primary     | `#0f172a` (`text-slate-900`)                 | Headings, prices, key metrics                                            |
| Text Body        | `#334155` (`text-slate-700`)                 | Primary body copy                                                        |
| Text Muted       | `#64748b` (`text-slate-500`)                 | Secondary labels, metadata, timestamps                                   |
| Semantic Success | `emerald-50` / `emerald-500` / `emerald-900` | Success toasts (`role="status"`), paid/completed badges                  |
| Semantic Error   | `red-50` / `red-500` / `red-900`             | Error toasts (`role="alert"`), form validation, dispute/cancel states    |

## 2. Layout Hierarchy and Route Protection

- `NonAdminLayout`: Redirects authenticated `ADMIN` users directly to `/admin`.
- `GuestLayout`: Renders `Header` + `<Outlet />` + `Footer`; automatically redirects `SUPPORT_STAFF` to `/staff/inbox`.
- `ProtectedRoute` (`src/routes/ProtectedRoute.tsx`):
  - Missing `token` → redirects to `/login` preserving `state: { from: location.pathname }`.
  - Profile loading (`isLoading === true`) → renders `role="status"` loading indicator (`states.checkingAccess`).
  - Role mismatch against `allowedRoles` → redirects to `/`.
- `RouteErrorBoundary`: Catches unexpected render errors and renders a `role="alert"` recovery screen with a reload action.

## 3. User Feedback and Accessibility Standards

- Toast Notifications (`ToastProvider` + `ToastFrame`):
  - Rendered via React Portal at top-right (`fixed top-4 right-4 z-[1100]`), capped at 3 concurrent toasts (`slice(-3)`).
  - Auto-dismisses after `4000ms` by default (falls back to `4000ms` on non-positive/invalid durations), with accessible `aria-label` dismiss buttons and optional actions (`actionLabel`, `onClick`, `targetUrl`).
- Modal Dialogs: Dismissible via `Escape` or backdrop click, locking background scroll while open.
- Loading States: Skeletons and spinners expose `role="status"` to prevent layout shift (CLS).
