---
title: Đặc tả Giao diện (UI Specification)
---

# Đặc tả Giao diện (UI Specification)

Tài liệu quy chuẩn hệ thống thiết kế (Design Tokens), phân tầng Layout, bảo vệ route và tiêu chuẩn Accessibility (a11y) trên Frontend.

## 1. Hệ thống Màu sắc & Design Tokens

| Nhóm Token           | Giá trị Hex / Tailwind                       | Vai trò sử dụng                                                                    |
| :------------------- | :------------------------------------------- | :--------------------------------------------------------------------------------- |
| **Primary Brand**    | `#1f5fe3` (Royal Blue)                       | Nút hành động chính (CTA), chỉ báo điều hướng active, focus ring, liên kết nổi bật |
| **Accent Highlight** | `#f24e1e` / `#ff5722` (Orange Red)           | CTA đấu giá trực tiếp, badge số lượng giỏ hàng, cảnh báo ưu tiên cao               |
| **Page Canvas**      | `#f8f7fc`                                    | Nền trang tổng thể                                                                 |
| **Card / Surface**   | `#ffffff` + `border-slate-200`               | Thẻ sản phẩm, panel bảng điều khiển, modal                                         |
| **Subtle Surface**   | `#f1f5f9` (`bg-slate-100`)                   | Nền phụ, bảng dữ liệu, skeleton placeholder                                        |
| **Text Primary**     | `#0f172a` (`text-slate-900`)                 | Tiêu đề, giá tiền, số liệu quan trọng                                              |
| **Text Body**        | `#334155` (`text-slate-700`)                 | Nội dung văn bản chính                                                             |
| **Text Muted**       | `#64748b` (`text-slate-500`)                 | Nhãn phụ, metadata, timestamp                                                      |
| **Semantic Success** | `emerald-50` / `emerald-500` / `emerald-900` | Toast thành công (`role="status"`), trạng thái đã thanh toán/hoàn tất              |
| **Semantic Error**   | `red-50` / `red-500` / `red-900`             | Toast lỗi (`role="alert"`), validation error, cảnh báo hủy/tranh chấp              |

## 2. Phân tầng Layout & Bảo vệ Route

- **`NonAdminLayout`**: Kiểm tra session hiện tại; nếu `role === ADMIN`, tự động chuyển hướng sang `/admin`.
- **`GuestLayout`**: Gồm `Header` + `<Outlet />` + `Footer`; tự động điều hướng `SUPPORT_STAFF` sang `/staff/inbox`.
- **`ProtectedRoute` (`src/routes/ProtectedRoute.tsx`)**:
  - Chưa có `token` → chuyển hướng `/login` kèm `state: { from: location.pathname }` để quay lại sau khi đăng nhập.
  - Đang tải profile (`isLoading === true`) → hiển thị trạng thái chờ `role="status"` (`states.checkingAccess`).
  - Có `allowedRoles` nhưng role hiện tại không hợp lệ → chuyển hướng về `/`.
- **`RouteErrorBoundary`**: Bắt lỗi runtime trong cây component con và hiển thị màn hình `role="alert"` kèm nút tải lại trang.

## 3. Quy chuẩn Phản hồi Người dùng & Accessibility

- **Toast Notifications (`ToastProvider` + `ToastFrame`)**:
  - Render qua React Portal tại góc trên bên phải (`fixed top-4 right-4 z-[1100]`), hiển thị tối đa **3 toast** cùng lúc (`slice(-3)`).
  - Thời gian tự đóng mặc định `4000ms` (fallback về `4000ms` nếu truyền giá trị không hợp lệ/âm), hỗ trợ nút đóng `aria-label` và action click (`actionLabel`, `onClick`, `targetUrl`).
- **Modal Dialogs**: Hỗ trợ đóng bằng phím `Escape` hoặc click backdrop, khóa cuộn trang nền khi mở.
- **Loading States**: Dùng skeleton hoặc spinner có `role="status"` để tránh nhảy bố cục (Cumulative Layout Shift).
