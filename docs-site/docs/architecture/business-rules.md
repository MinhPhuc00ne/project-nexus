---
title: Quy tắc Nghiệp vụ (Đã đối chiếu Code)
---

# Quy tắc Nghiệp vụ Cốt lõi

Toàn bộ các hằng số và quy tắc dưới đây đã được đối chiếu trực tiếp với mã nguồn thực tế (`reputation-policy.ts`, `schema.prisma`, `cart.service.ts`, `order-escrow.service.ts`, `auction.service.ts`):

## 1. Uy tín người dùng (`reputation-policy.ts`)

- **Điểm khởi tạo tài khoản mới**: `INITIAL_REPUTATION_SCORE = 50` (trạng thái `PROBATION`), phù hợp với `@default(50)` và `@default(PROBATION)` trong `schema.prisma`.
- **Phân hạng Trust Level (`trustLevelFor`)**:
  - `EXCELLENT`: $\ge 120$ điểm
  - `GOOD`: $100 - 119$ điểm
  - `STANDARD`: $80 - 99$ điểm
  - `PROBATION`: $40 - 79$ điểm
  - `SUSPENDED`: $< 40$ điểm

## 2. Thương mại, Giỏ hàng & Chống tự mua

- **Chống tự mua hàng**: `CartService.purchasable()` chặn tuyệt đối việc người bán tự thêm hoặc mua sản phẩm của chính mình (`product.sellerId === userId` → HTTP 400).
- **Kiểm soát tồn kho & giá khuyến mãi**: `effectivePrice()` chỉ áp dụng `salePrice` khi `salePrice >= 1000`, `salePrice < basePrice` và đang nằm trong khung giờ `[saleStartsAt, saleEndsAt)`.
- **Escrow & Phí sàn**: Khi đơn hàng thanh toán thành công, tiền được giữ ở `EscrowRecord` (`HELD`). Phí sàn mặc định `7%` tính trên `subtotal` (không tính trên `shippingFee`).

## 3. Đấu giá nhiều Lô (Session → Lots) & Trao giải

- Một phiên `Auction` chứa nhiều `AuctionItem` (lots) có thể đính kèm chứng thư giám định và được duyệt qua quy trình `PENDING_REVIEW` → `APPROVED` / `REJECTED`.
- Khi kết thúc lô, hệ thống tạo `AuctionAward` cho `PRIMARY_WINNER`; nếu quá hạn hoặc từ chối/rút lui, hệ thống có thể chuyển sang `SECOND_CHANCE` hoặc xử lý tịch thu/bồi thường cọc (`AUCTION_DEPOSIT_FORFEIT` / `AUCTION_DEPOSIT_COMPENSATION`).
- **Chống bắn tỉa (Anti-sniping)**: Đặt giá hợp lệ trong 2 phút cuối tự động gia hạn thêm 2 phút.
