---
title: Tổng quan 10 Domain Modules
---

# Backend Modules (`backend/src/modules`)

NestJS `AppModule` kết hợp Core Layer với **10 Domain Modules**:

1. **`auth`**: Đăng ký, đăng nhập, OTP email, Google OAuth 2.0, JWT + Refresh Token, cấp phát & kích hoạt `SUPPORT_STAFF`.
2. **`users`**: Hồ sơ cá nhân, sổ địa chỉ, ví NEXUS Pay & rút tiền, nâng cấp Seller, toggle chế độ Buyer/Seller, điểm uy tín.
3. **`catalog`**: Danh mục tối đa 3 cấp, sản phẩm & biến thể (`ProductOption`), giá khuyến mãi, tồn kho đa kho (`Inventory`, `InventoryReservation`, `InventoryLedger`), gợi ý sản phẩm, shop và `EventBanner`.
4. **`commerce`**: Giỏ hàng, đặt hàng & thanh toán (`PAYOS`, `WALLET`, `COD`), checkout đấu giá, Escrow, hủy/trả hàng & hoàn tiền (`AfterSalesRequest`, `OrderRefund`), đánh giá & kiểm duyệt báo cáo.
5. **`auction`**: Quản lý phiên & lô đấu giá (`Auction`, `AuctionItem`), đặt giá realtime (`AuctionGateway`), vòng đời & trao giải (`AuctionAward`), khiếu nại đấu giá (`AuctionComplaint`).
6. **`fulfillment`**: Tích hợp GHN Express (tính phí, đăng ký shop GHN `SellerGhnAccount`, tạo đơn, pickup, webhook tracking).
7. **`chat`**: Chat realtime Buyer–Seller, hàng đợi Staff (`StaffQueueService`), auto-reply của Shop, và AI Chatbot hỗ trợ tìm kiếm/điều hướng/kiểm tra giỏ hàng.
8. **`notifications`**: Lưu trữ, phân trang, tùy chọn kênh nhận thông báo và đẩy realtime qua `/ws/notifications`.
9. **`admin`**: Quản trị users, shops (cảnh cáo/đình chỉ/khôi phục), sản phẩm, đơn hàng, tài chính/rút tiền, tranh chấp và cấu hình sàn.
10. **`media`**: Upload & xử lý tệp media (local static & Cloudinary).
