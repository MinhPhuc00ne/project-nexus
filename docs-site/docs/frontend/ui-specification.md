---
title: Đặc tả Giao diện (UI Specification)
---

# Đặc tả Giao diện (UI Specification)

## 1. Hệ thống Màu sắc & Design Tokens

- **Primary Brand**: `#1f5fe3` (Royal Blue) — nút hành động chính, chỉ báo điều hướng active, liên kết nổi bật.
- **Accent Highlight**: `#f24e1e` / `#ff5722` (Orange Red) — CTA đấu giá trực tiếp, badge giỏ hàng, cảnh báo quan trọng.
- **Bề mặt & Nền**: `#f8f7fc` (nền trang), `#ffffff` (container kèm `border-slate-200`), `#f1f5f9` (nền phụ).
- **Typography**: `#0f172a` (tiêu đề), `#334155` (nội dung), `#64748b` (nhãn phụ), `#e2e8f0` (viền phân cách).

## 2. Phân tầng Layout & Bảo vệ Route

- `NonAdminLayout`: Kiểm tra session, tự động chuyển hướng `ADMIN` sang `/admin`.
- `GuestLayout`: Header + `<Outlet />` + Footer; tự động điều hướng `SUPPORT_STAFF` sang `/staff/inbox`.
- `ProtectedRoute`: Chặn truy cập chưa đăng nhập (`/login`) và kiểm tra `allowedRoles` cho Buyer, Seller, Staff, Admin.

## 3. Quy chuẩn Phản hồi Người dùng

- **Toast Notifications**: Hiển thị ở góc cố định, tự đóng sau 3.0–4.5 giây.
- **Modal Dialogs**: Hỗ trợ đóng bằng phím `Escape` hoặc click nền ngoài, khóa cuộn trang nền khi mở.
- **Loading States**: Dùng skeleton hoặc spinner có `role="status"` để tránh nhảy bố cục (CLS).
