---
title: UI Specification
---

# UI Architecture Specification

## 1. Design Tokens & Color Palette

- **Primary Brand**: `#1f5fe3` (Royal Blue) — primary CTAs, active navigation states, key links.
- **Accent Highlight**: `#f24e1e` / `#ff5722` (Orange Red) — live auction CTAs, cart counters, critical badges.
- **Surfaces**: `#f8f7fc` (page canvas), `#ffffff` (content cards with `border-slate-200`), `#f1f5f9` (secondary surface).
- **Typography**: `#0f172a` (headings), `#334155` (body), `#64748b` (muted labels), `#e2e8f0` (dividers).

## 2. Layout & Route Protection Hierarchy

- `NonAdminLayout`: Verifies session and redirects `ADMIN` accounts to `/admin`.
- `GuestLayout`: Global header + `<Outlet />` + footer; redirects `SUPPORT_STAFF` to `/staff/inbox`.
- `ProtectedRoute`: Enforces authentication (`/login`) and role-based `allowedRoles` for Buyer, Seller, Staff, and Admin portals.

## 3. Feedback & Accessibility Patterns

- **Toasts**: Fixed corner notifications auto-dismissing after 3.0–4.5s.
- **Modals**: Support `Escape` key and backdrop click dismissal while locking background scroll.
- **Loading States**: Use skeleton placeholders or `role="status"` indicators to prevent Cumulative Layout Shift (CLS).
