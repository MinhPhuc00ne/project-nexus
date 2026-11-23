---
title: Kiến trúc Frontend
---

# Kiến trúc Frontend (`frontend/src`)

Ứng dụng client xây dựng trên **React 19.3 + TypeScript 5.9 + Vite 8.3 + Tailwind CSS v4**, kết nối trực tiếp với `@nexus/types` để đồng bộ kiểu dữ liệu và tên sự kiện WebSocket.

## 1. Phân tách 5 Cổng & Routing (`src/routes/paths.ts`, `AppRouter.tsx`)

| Cổng              | Layout & Guard                                                     | Các route tiêu biểu                                                                                                                                                                                                                        |
| :---------------- | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guest**         | `GuestLayout` (chuyển `SUPPORT_STAFF` sang `/staff/inbox`)         | `/`, `/search`, `/categories`, `/product/:id`, `/shop/:id`, `/auction`, `/auction/:id`                                                                                                                                                     |
| **Auth**          | Public auth pages                                                  | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp`                                                                                                                                                                |
| **Buyer**         | `ProtectedRoute([Role.BUYER, Role.SELLER])` + `BuyerLayout`        | `/cart`, `/checkout`, `/payment/success`, `/buyer/orders`, `/buyer/wallet`, `/buyer/bids`, `/buyer/disputes`, `/buyer/addresses`, `/buyer/reputation`, `/buyer/notifications`                                                              |
| **Seller**        | `ProtectedRoute([Role.SELLER])` + `SellerLayout`                   | `/seller`, `/seller/products`, `/seller/orders`, `/seller/shipping`, `/seller/auctions`, `/seller/finance`, `/seller/disputes`, `/seller/settings`                                                                                         |
| **Support Staff** | `ProtectedRoute([Role.SUPPORT_STAFF, Role.ADMIN])` + `StaffLayout` | `/staff/inbox`, `/staff/seller-approvals`, `/staff/disputes`, `/staff/auction-support`, `/staff/banners`, `/staff/faq`, `/staff/performance`                                                                                               |
| **Admin**         | `ProtectedRoute([Role.ADMIN])` + `AdminLayout` + `useAdminContext` | `/admin/overview`, `/admin/users`, `/admin/sellers`, `/admin/stores`, `/admin/categories`, `/admin/products`, `/admin/orders`, `/admin/auctions`, `/admin/refunds`, `/admin/finance`, `/admin/reports`, `/admin/studio`, `/admin/settings` |

Mọi nhánh route được bọc bởi `RouteErrorBoundary` để bắt lỗi render bất ngờ và hiển thị giao diện khôi phục an toàn.

## 2. Quản lý Trạng thái & Contexts

- **`AuthContext` (`src/contexts/AuthContext.tsx`)**:
  - Quản lý `token`, `user`, `storedUser`, `isAuthenticated`, `isLoading`, cờ phân quyền (`isAdmin`, `isStaff`, `isSeller`), và `activeMode` (`'SELLER' | 'BUYER'`).
  - Khử trùng lặp request `/users/me` đang chạy (`inFlightPromiseRef`), đồng bộ cross-tab qua `nexus:auth-change` & `storage` event.
  - Khi `login()` thành công: tự động gọi `mergeGuestCartAfterLogin()` cho Buyer/Seller, nhưng **bỏ qua** với `ADMIN` và `SUPPORT_STAFF`.
  - Khi `isShopSuspended = true`: ép `activeMode` về `'BUYER'`.
- **`ToastProvider` (`src/components/ToastNotification/ToastProvider.tsx`)**:
  - Render qua `createPortal(..., document.body)`, giới hạn tối đa 3 toast hiển thị đồng thời (`slice(-3)`), hỗ trợ `duration`, `actionLabel`, `onClick`, `targetUrl`.
- **`useAdminContext` (`src/components/adminDashboard/shared/useAdminContext.ts`)**:
  - Đọc `useOutletContext<AdminTabProps>()` từ `AdminLayout` để đồng bộ số đếm sidebar và search query giữa các tab Admin.
- **TanStack Query & Zustand**: Quản lý server state caching và client UI state.

## 3. Tầng Giao tiếp API & Socket.IO (`src/services/`)

- **Axios Client (`services/api.ts`)**:
  - Timeout mặc định `20000ms`, tự động gắn `Authorization: Bearer <token>` và `Accept-Language: vi | en`.
  - Response interceptor xử lý HTTP `401` bằng hàng đợi `failedQueue` + cờ `isRefreshing` để refresh token một lần duy nhất và replay các request đang chờ.
- **Chuẩn hóa Lỗi (`lib/apiErrors.ts`)**: `getApiErrorMessage()` dịch tự động `errorCode` từ Backend (ví dụ `CANNOT_PURCHASE_OWN_PRODUCT`) theo ngôn ngữ đang chọn.
- **Socket.IO Clients**: `auctionSocket`, `chatSocket.ts`, `notificationSocket.ts` kết nối tới 3 gateways tương ứng của Backend.
