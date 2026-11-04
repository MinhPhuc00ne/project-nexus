# User Interface Architecture Specification

This document specifies the presentation tier architecture, design token system, layered routing layouts, and component decomposition across the `frontend/` application.

## 1. Design Token System and Color Palette

The client application utilizes React 19, Tailwind CSS v4, Lucide Icons, and Ant Design Icons:

### Brand and Interface Color Tokens

- Primary Brand: `#1f5fe3` (Royal Blue) designated for primary call-to-action buttons, active navigation indicators, and prominent hyperlinks.
- Accent Highlight: `#f24e1e` / `#ff5722` (Orange Red) designated for live auction call-to-action triggers, status badges, shopping cart counters, and critical alerts.
- Surface and Canvas:
  - Base page canvas: `#f8f7fc` (Soft Slate)
  - Content containers: `#ffffff` (Pure White) with `border border-slate-200`
  - Secondary surface fills: `#f1f5f9` (Slate 100)
- Typography and Contrast:
  - Headings and primary text: `#0f172a` (Slate 900)
  - Body text: `#334155` (Slate 700)
  - Muted labels and secondary annotations: `#64748b` (Slate 500)
  - Structural divider lines: `#e2e8f0` (Slate 200)

## 2. Layered Layout Architecture and Routing Hierarchy

The user interface coordinates access control and visual structure through nested layout tiers:

```mermaid
flowchart TD
    App["App.tsx (<AuthProvider>)"] --> AppRouter["AppRouter.tsx (<BrowserRouter>)"]

    AppRouter --> NonAdminLayout["NonAdminLayout.tsx (Auth and Role Guard)"]
    AppRouter --> AdminLayout["AdminLayout.tsx (/admin/*)"]

    NonAdminLayout --> GuestLayout["GuestLayout.tsx (Header + Outlet + Footer)"]
    NonAdminLayout --> AuthLayout["AuthLayout.tsx (/login, /register, etc.)"]
    NonAdminLayout --> SellerSession["SellerLayout (/seller/*)"]
    NonAdminLayout --> StaffSession["StaffLayout (/staff/*)"]

    GuestLayout --> HomePage["HomePage.tsx (/)"]
    GuestLayout --> ProductDetailPage["ProductDetailPage.tsx (/product/:id)"]
    GuestLayout --> CartPage["CartPage.tsx (/cart)"]
    GuestLayout --> AuctionPage["AuctionPage.tsx (/auction, /auction/:id)"]
```

### Layout Tier Responsibilities

1. `NonAdminLayout.tsx`: The primary perimeter guard. It verifies active session data from `AuthContext` and immediately redirects authenticated administrators to `/admin`.
2. `GuestLayout.tsx`: Standard retail shopping layout composed of the global header, content `<Outlet />`, and global footer. When support staff members access the home view, the router redirects them to `/staff/inbox`.
3. `StaffLayout.tsx`: Dedicated security layout protecting all `/staff/*` routes, verifying `SUPPORT_STAFF` or `ADMIN` roles before mounting the staff operational dashboard.
4. `AdminLayout.tsx`: Specialized administrative layout featuring fixed sidebar navigation and system management panels.

## 3. Component Decomposition Architecture

Adhering to clean code standards and separation of concerns, complex views are structured into modular subcomponents:

### Authentication Suite (`frontend/src/pages/auth/`)

- `Login.tsx`: Primary authentication form handling credential submission and role-based redirect resolution.
- `AuthHeroSection.tsx`: Showcase banner presenting brand visuals on wide desktop viewports.
- `ForgotPasswordModal.tsx`: Self-contained dialog handling OTP verification and password reset workflows.

### Commerce and Checkout Suite (`frontend/src/pages/buyer/`)

- `CartPage.tsx`: Interactive cart collection managing item lines, quantity updates, and item removal.
- `CartOrderSummary.tsx`: Financial summary card calculating item subtotals, shipping estimates, and applied promotions.
- `CheckoutPage.tsx`: Comprehensive checkout flow incorporating GHN shipping address selection and payment provider integration (PayOS, NEXUS Pay Wallet, or COD).

### Catalog and Product Details (`frontend/src/pages/guest/`)

- `ProductDetailPage.tsx`: Orchestrator view coordinating product data retrieval, seller identity, and review feeds.
- `ProductImageGallery.tsx`: Thumbnail carousel, zoom view, and 3D preview entry point.
- `ProductInfoTabs.tsx`: Tabular specifications, merchant shop profile, and verified customer reviews.

### Live Auction Room Suite (`frontend/src/pages/guest/`, `frontend/src/components/auction/`)

- `AuctionPage.tsx`: Real-time live auction room orchestrator supporting both `/auction` and `/auction/:id` routes.
- `AuctionBidTerminal.tsx`: Interactive bidding terminal displaying dynamic countdown clocks, minimum bid thresholds, and leading bidder status.
- `AuctionGallery.tsx`: Visual gallery showcasing high-resolution item imagery.
- `AuctionDetailTabs.tsx`: Item provenance, certificate documentation, and public bid history transcript.

## 4. User Feedback and Visual State Transitions

- Toast notifications: Render in fixed screen corners and automatically dismiss after 3.0 to 4.5 seconds.
- Modal dialogs: Support Escape key dismissal or backdrop clicks, automatically locking background canvas scrolling while open.
- Loading states: Use skeleton placeholders during asynchronous network fetches to eliminate Cumulative Layout Shift (CLS).
