---
title: Chi tiết 10 Backend Modules & AI Chatbot
---

# Backend Modules (`backend/src/modules`)

NestJS `AppModule` kết hợp Core Layer (`prisma`, `redis`, `mail`, `storage`, `security`, `moderation`, `exceptions/filters/interceptors`) với **10 Domain Modules**:

## 1. `auth` — Xác thực & Cấp phát Staff

- Đăng ký, đăng nhập (Bcrypt), xác thực OTP 6 số, làm mới JWT (`RefreshToken` rotation), Google OAuth 2.0.
- Cấp phát & kích hoạt tài khoản `SUPPORT_STAFF` (`@staff.com`) qua token + OTP gửi tới `personalEmail`.

## 2. `users` — Hồ sơ, Ví & Uy tín

- Hồ sơ người dùng, sổ địa chỉ (`UserAddress`), hồ sơ giao hàng Shop (`ShopShippingProfileModule`).
- Ví `NEXUS Pay` (`Wallet`, `WalletTransaction`) và yêu cầu rút tiền (`WithdrawalRequest`, tối đa 3 yêu cầu pending, khóa tiền vào `lockedBalance`).
- Nâng cấp Seller (`SellerUpgradeRequest`) và chuyển đổi chế độ Buyer/Seller không cần đăng xuất (`/api/v1/users/toggle-seller`).
- Hệ thống điểm uy tín (`ReputationModule`, khởi tạo `50 / PROBATION`).

## 3. `catalog` — Danh mục, Sản phẩm & Tồn kho

- Cây danh mục tối đa 3 cấp (`Category`), sản phẩm & biến thể (`ProductOption`), giá khuyến mãi (`salePrice` có khung giờ).
- Tồn kho đa kho (`Warehouse`, `Inventory`, `InventoryReservation`, `InventoryLedger`).
- Gợi ý sản phẩm cá nhân hóa (`RecommendationsService`), trang Shop và `EventBanner` (kèm lịch sử tắt banner `BannerDisableHistory`).

## 4. `commerce` — Giỏ hàng, Đơn hàng, Escrow & Hậu mãi

- Giỏ hàng TTL 7 ngày (`CartService`), kiểm tra tồn kho và chặn tự mua hàng (`CANNOT_PURCHASE_OWN_PRODUCT`).
- Thanh toán (`PAYOS`, `WALLET`, `COD`) có `Idempotency-Key`, xác thực chữ ký PayOS Webhook (`PayosService`).
- Ký quỹ `EscrowRecord` (phí sàn `7%`), giải ngân tự động hoặc đóng băng khi tranh chấp.
- Hủy/trả hàng & hoàn tiền (`AfterSalesRequest`, `OrderRefund`), đánh giá (`Review`, `ProductReview`, `CustomerReview`), kiểm duyệt báo cáo vi phạm (`ReportModerationService`).

## 5. `auction` — Đấu giá 3D nhiều Lô

- Phiên đấu giá (`Auction`) và các lô (`AuctionItem` kèm chứng thư giám định), kiểm duyệt ký gửi.
- Phòng đấu giá realtime (`AuctionGateway`), cơ chế chống bắn tỉa (+2 phút cuối), vòng đời tự động (`AuctionLifecycleService`).
- Trao giải (`AuctionAward`: `PRIMARY_WINNER` & `SECOND_CHANCE`, xử lý cọc/tịch thu cọc) và khiếu nại (`AuctionComplaint`).

## 6. `fulfillment` — Vận chuyển GHN Express

- Đăng ký shop GHN theo môi trường (`SellerGhnAccount`), tính phí & khoảng cách tuyến đường, tạo vận đơn, pickup, webhook cập nhật tracking (`ghn-webhook.controller.ts`).

## 7. `chat` — Chat Realtime & AI Chatbot

- Hội thoại Buyer–Seller (`ChatGateway`), hàng đợi hỗ trợ Staff (`StaffQueueService`), tin nhắn tự động của Shop (`ChatAutoReply`).
- **AI Chatbot** (`ChatbotService`, `ChatbotAiService`, `ChatbotCommerceService`): Hỗ trợ tìm kiếm catalog, điều hướng route, kiểm tra điều kiện đấu giá và ngân sách giỏ hàng, kèm rate limiting.

## 8. `notifications` — Thông báo Đa kênh

- Lưu trữ `Notification`, cấu hình nhận (`NotificationPreference`), đẩy realtime qua `NotificationsGateway` (`/ws/notifications`) và `PrismaService` delegate wrapper.

## 9. `admin` — Quản trị Hệ thống

- Quản trị users, duyệt Seller, quản lý Shop (`ShopActionLog`: cảnh cáo/đình chỉ/khôi phục, `ShopViolation`), sản phẩm, đơn hàng, tài chính/rút tiền, tranh chấp và cấu hình sàn.

## 10. `media` — Lưu trữ Media

- Upload ảnh/tài liệu qua local static (`/uploads`) hoặc Cloudinary (`CloudinaryService`).
