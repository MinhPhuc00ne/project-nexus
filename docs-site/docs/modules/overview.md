---
title: Chi tiết 10 Backend Modules & AI Chatbot
---

# Backend Modules (`backend/src/modules`)

`AppModule` (`backend/src/app.module.ts`) kết hợp Core Layer (`PrismaModule`, `RedisModule`, `MailModule`, `StorageModule`) với **10 Domain Modules** cô lập. Tài liệu này liệt kê đầy đủ Controller, Service và trách nhiệm thực tế của từng module.

## 1. `auth` — Xác thực, OTP & Cấp phát Staff

- **Controllers**: `AuthController`, `StaffController`
- **Services**: `AuthService`, `AuthProfileService`, `StaffProvisioningService`, `JwtStrategy`, `GoogleStrategy`
- **Chức năng cốt lõi**:
  - Đăng ký tài khoản kèm xác thực OTP 6 số qua email (`MailService`).
  - Đăng nhập Bcrypt, phát hành Access Token (7d) & Refresh Token (30d) có rotation và thu hồi trong bảng `RefreshToken`.
  - Đăng nhập Google OAuth 2.0 (`GoogleStrategy`).
  - Đổi mật khẩu xác nhận OTP (`confirm-change-password-otp`), quên/đặt lại mật khẩu.
  - Cấp phát & kích hoạt tài khoản `SUPPORT_STAFF` (`@staff.com`) qua `StaffInvitation` token + OTP gửi về `personalEmail`.

## 2. `users` — Hồ sơ, Ví `NEXUS Pay`, Địa chỉ & Uy tín

- **Controllers**: `UsersController`, `BuyerController`, `SellerController`
- **Services**: `UsersService`, `AddressService`, `ReputationService` (`ReputationModule`), `ShopShippingProfileService` (`ShopShippingProfileModule`)
- **Chức năng cốt lõi**:
  - Quản lý hồ sơ cá nhân, sổ địa chỉ `UserAddress` (gắn mã Tỉnh/Quận/Phường GHN) và hồ sơ giao hàng Shop.
  - Nâng cấp Seller (`SellerUpgradeRequest` kèm minh chứng) và chuyển đổi chế độ Buyer/Seller không cần đăng xuất (`/api/v1/users/toggle-seller`).
  - Tính toán & ghi nhận điểm uy tín (`INITIAL_REPUTATION_SCORE = 50`, `ReputationLog`, `ReputationTrustLevel`).

## 3. `catalog` — Danh mục 3 Cấp, Sản phẩm, Tồn kho & Banner

- **Controllers**: `CategoryController`, `ProductController`, `RecommendationsController`, `ShopController`, `BannerController`
- **Services**: `CategoryService`, `ProductService`, `ProductSearchService`, `ProductSaleService`, `InventoryService`, `AuctionStockService`, `RecommendationsService`, `ShopService`, `BannerService`, `BannerHistoryService`
- **Chức năng cốt lõi**:
  - Cây danh mục tối đa 3 cấp (`Category`), chống vòng lặp khi di chuyển node.
  - Quản lý sản phẩm, biến thể (`ProductOption`), giá khuyến mãi theo khung giờ (`salePrice`, `saleStartsAt`, `saleEndsAt`).
  - Tồn kho đa kho (`Warehouse`, `Inventory`), giữ chỗ (`InventoryReservation`) và sổ cái kho (`InventoryLedger`).
  - Gợi ý sản phẩm cá nhân hóa, trang cửa hàng công khai và `EventBanner` (kèm `BannerDisableHistory`).

## 4. `commerce` — Giỏ hàng, Đơn hàng, Escrow, Thanh toán & Hậu mãi

- **Controllers**: `CartController`, `OrderController`, `OrderLifecycleController`, `AuctionCheckoutController`, `PayosWebhookController`, `AfterSalesController`, `SellerOrdersController`, `SellerFinanceController`, `SellerEngagementController`, `FeedbackController`, `ReportModerationController`
- **Services**: `CartService`, `OrderService`, `OrderEscrowService`, `OrderCancellationService`, `OrderReturnService`, `RefundService`, `PayosService`, `AuctionCheckoutService`, `SellerOrdersService`, `SellerFinanceService`, `SellerEngagementService`, `ReviewsService`, `ReportsService`, `ReportModerationService`, `CommerceChatQueryService`
- **Chức năng cốt lõi**:
  - Giỏ hàng TTL 7 ngày, merge giỏ Guest khi đăng nhập, chặn tự mua sản phẩm của chính mình (`CANNOT_PURCHASE_OWN_PRODUCT`).
  - Checkout đa shop với `Idempotency-Key`, hỗ trợ `PAYOS` (VietQR + xác thực chữ ký HMAC webhook), `WALLET` và `COD`.
  - Ký quỹ `EscrowRecord` (phí sàn `7%` trên `subtotal`), giải ngân tự động hoặc đóng băng khi tranh chấp.
  - Hủy đơn trước lấy hàng, trả hàng trong 3 ngày sau giao (`AfterSalesRequest`, `OrderRefund`), đánh giá sản phẩm/khách hàng và kiểm duyệt báo cáo vi phạm.
  - Rút tiền `WithdrawalRequest` (tối đa 3 yêu cầu pending, khóa tiền vào `lockedBalance`).

## 5. `auction` — Đấu giá 3D nhiều Lô & Khiếu nại

- **Controllers**: `AuctionController`, `AuctionImageController`
- **Gateway**: `AuctionGateway` (`/ws/auctions`)
- **Services**: `AuctionService`, `AuctionLifecycleService`, `AuctionComplaintService`, `AuctionImageService`
- **Chức năng cốt lõi**:
  - Quản lý phiên `Auction` và các lô `AuctionItem` (kèm model `.glb` và chứng thư giám định), quy trình duyệt ký gửi.
  - Đặt giá realtime với Redis + PostgreSQL row lock, chống bắn tỉa (+2 phút cuối), chặn Seller đang bật `isSellerActive` đặt giá.
  - Tự động đóng phiên, tạo `AuctionAward` (`PRIMARY_WINNER` / `SECOND_CHANCE`), xử lý cọc và khiếu nại `AuctionComplaint`.

## 6. `fulfillment` — Vận chuyển GHN Express

- **Controllers**: `FulfillmentController`, `SellerPickupController`, `GhnWebhookController`
- **Services**: `FulfillmentService`, `GhnLogisticsService`, `GhnShippingService`, `GhnOrderApiService`, `GhnOrderActionService`, `GhnShopApiService`, `GhnDispatchService`, `RouteDistanceService`, `SellerPickupService`, `ShipmentTrackingService`
- **Chức năng cốt lõi**:
  - Đăng ký shop GHN cho Seller (`SellerGhnAccount`), tính khoảng cách tuyến đường & báo giá phí ship (`RouteDistanceService`).
  - Tạo vận đơn chiều đi, lịch lấy hàng (`SellerPickup`), hủy đơn trên GHN (`/v2/switch-status/cancel`), tạo vận đơn chiều về `NX-RETURN-<orderUUID>` và nhận webhook cập nhật `ShipmentStatus`.

## 7. `chat` — Chat Realtime, Support Queue & AI Chatbot

- **Controllers**: `ChatController`, `AdminChatController`, `SellerAutoReplyController`, `ChatbotController`
- **Gateway**: `ChatGateway` (`/ws/chat`)
- **Services**: `ChatService`, `StaffQueueService`, `ChatAutoReplyService`, `ChatbotService`, `ChatbotAiService`, `ChatbotCommerceService`, `ChatbotRateLimitService`
- **Chức năng cốt lõi**:
  - Hội thoại Buyer–Seller realtime, hàng đợi hỗ trợ `SUPPORT_STAFF`, tin nhắn tự động của Shop và kiểm toán hội thoại cho Admin.
  - **AI Chatbot (Gemini)**: Tìm kiếm catalog, gợi ý điều hướng route, kiểm tra điều kiện tham gia đấu giá và ngân sách giỏ hàng, kèm rate limiting.

## 8. `notifications` — Thông báo Đa kênh

- **Controller**: `NotificationsController` | **Gateway**: `NotificationsGateway` (`/ws/notifications`)
- **Service**: `NotificationsService`
- **Chức năng cốt lõi**: Lưu `Notification`, quản lý tùy chọn nhận (`NotificationPreference`), đẩy realtime tự động qua `PrismaService` delegate wrapper & `NotificationRealtimeBus`.

## 9. `admin` — Quản trị & Giám sát Toàn sàn

- **Controllers**: `AdminController`, `AdminOrdersController`, `AdminReputationController`, `BackofficeDisputesController`
- **Services**: `AdminService`, `AdminUsersService`, `AdminSellersService` / `AdminShopsService`, `AdminProductsService`, `AdminOrdersService`, `AdminDisputesService`, `AdminFinanceService`, `AdminSettingsService`
- **Chức năng cốt lõi**: Quản trị người dùng/khóa tài khoản, duyệt Seller, cảnh cáo/đình chỉ/khôi phục Shop (`ShopActionLog`, `ShopViolation`), duyệt rút tiền, xử lý tranh chấp/hoàn tiền và cấu hình hệ thống.

## 10. `media` — Lưu trữ Media & Tài liệu

- **Controller**: `MediaController` | **Service**: `MediaService`
- **Chức năng cốt lõi**: Upload ảnh sản phẩm, avatar, chứng thư đấu giá và model 3D qua Cloudinary hoặc local static (`/uploads`).
