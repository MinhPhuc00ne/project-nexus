---
title: Kiến trúc Frontend
---

# Kiến trúc Frontend (`frontend/src`)

Ứng dụng client xây dựng trên **React 19 + Vite 8 + Tailwind CSS v4**, phân tách 5 cổng bằng `ProtectedRoute` và Layout riêng:

- **Guest**: `GuestLayout` — Trang chủ, tìm kiếm, danh mục, chi tiết sản phẩm/shop, đấu giá, giỏ hàng.
- **Buyer**: `BuyerLayout` — Dashboard, đơn hàng, ví NEXUS Pay, lịch sử đấu giá, khiếu nại, địa chỉ, uy tín, thông báo.
- **Seller**: `SellerLayout` + `SellerSession` — Tổng quan, sản phẩm/tồn kho, đơn hàng & GHN, ký gửi đấu giá, tài chính, đánh giá.
- **Support Staff**: `StaffLayout` — Hộp thư hỗ trợ (ticket queue), duyệt seller, tranh chấp, hỗ trợ đấu giá, banner, FAQ, hiệu suất.
- **Admin**: `AdminLayout` — Bảng điều khiển toàn hệ thống (Overview, Users, Sellers, Stores, Categories, Products, Orders, Auctions, Banners, Refunds, Finance, Reports, Chat, Studio, System, Settings).
