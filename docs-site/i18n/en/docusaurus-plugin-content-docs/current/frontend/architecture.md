---
title: Frontend Architecture
---

# Frontend Architecture (`frontend/src`)

Built with **React 19 + Vite 8 + Tailwind CSS v4**, partitioned into 5 role-based portals via `ProtectedRoute` and dedicated layouts:

- **Guest**: `GuestLayout` — Home, search, categories, product/shop details, live auctions, cart.
- **Buyer**: `BuyerLayout` — Dashboard, orders, NEXUS Pay wallet, bids, disputes, addresses, reputation, notifications.
- **Seller**: `SellerLayout` + `SellerSession` — Overview, products/inventory, orders & GHN, auction consignments, finance, reviews.
- **Support Staff**: `StaffLayout` — Ticket inbox, seller approvals, disputes, auction support, banners, FAQ, performance.
- **Admin**: `AdminLayout` — Full platform control center.
