---
title: Quy tắc Nghiệp vụ (Đã đối chiếu Code)
---

# Quy tắc Nghiệp vụ Cốt lõi

Toàn bộ các hằng số, ngưỡng kiểm tra và quy tắc dưới đây được đối chiếu trực tiếp từ mã nguồn thực tế trong `backend/src/modules/*` và `backend/prisma/schema.prisma`.

## 1. Hệ thống Uy tín Người dùng (`reputation-policy.ts`)

- **Điểm khởi tạo tài khoản mới**: `INITIAL_REPUTATION_SCORE = 50` với trạng thái mặc định `ReputationTrustLevel.PROBATION`, khớp hoàn toàn với `@default(50)` và `@default(PROBATION)` trong `schema.prisma`.
- **Bảng phân hạng Trust Level (`trustLevelFor`)**:

| Hạng uy tín (`ReputationTrustLevel`) | Khoảng điểm | Ý nghĩa vận hành                                              |
| :----------------------------------- | :---------- | :------------------------------------------------------------ |
| `EXCELLENT`                          | ≥ 120       | Uy tín xuất sắc                                               |
| `GOOD`                               | 100 – 119   | Uy tín tốt                                                    |
| `STANDARD`                           | 80 – 99     | Mức chuẩn giao dịch bình thường                               |
| `PROBATION`                          | 40 – 79     | Đang theo dõi / tài khoản mới (`50`)                          |
| `SUSPENDED`                          | < 40        | Bị hạn chế quyền giao dịch/đặt giá do vi phạm (`PenaltyType`) |

## 2. Thương mại, Giỏ hàng & Định giá (`cart.service.ts`, `product-price.ts`)

- **Chặn tự mua hàng (Anti-self-purchase)**: `CartService.purchasable()` kiểm tra `product.sellerId === userId` và từ chối ngay với mã lỗi `CANNOT_PURCHASE_OWN_PRODUCT` (HTTP `400`).
- **Tính giá khuyến mãi (`effectivePrice`)**: Giá `salePrice` chỉ có hiệu lực khi thỏa mãn **cả 3 điều kiện**:
  1. `salePrice >= 1000` (VND)
  2. `salePrice < basePrice`
  3. Thời điểm hiện tại nằm trong khung `[saleStartsAt, saleEndsAt)`
- **Giữ chỗ & Tồn kho**: Khi tạo đơn hàng, hệ thống tạo `InventoryReservation` từ `availableQty` sang `reservedQty` và ghi `InventoryLedger`. Nếu hết hạn thanh toán, reservation tự động nhả lại kho.

## 3. Ký quỹ (Escrow), Phí sàn & Ví `NEXUS Pay` (`order-escrow.service.ts`, `seller-finance.service.ts`)

- **Phí sàn mặc định**: `PLATFORM_FEE_PERCENTAGE = 7.0%`, chỉ tính trên **`subtotal`** (giá trị hàng hóa), **không** tính trên `shippingFee`.
- **Giải ngân Escrow**: Tiền được giữ ở `EscrowRecord` trạng thái `HELD` ngay khi thanh toán thành công (`PAYOS` hoặc `WALLET`). Chỉ giải ngân (`DISBURSED`) vào ví Seller khi Buyer xác nhận đã nhận hàng hoặc hết cửa sổ kiểm tra 3 ngày mà không có tranh chấp.
- **Rút tiền (`WithdrawalRequest`)**:
  - Mỗi tài khoản chỉ được có **tối đa 3 yêu cầu `PENDING`** cùng lúc.
  - Số tiền rút bị chuyển ngay từ `Wallet.balance` sang `Wallet.lockedBalance` để chống rút trùng; chỉ giải phóng khi Admin duyệt chi hoặc từ chối hoàn lại `balance`.

## 4. Đấu giá 3D nhiều Lô & Chống bắn tỉa (`auction.service.ts`, `auction.gateway.ts`)

- **Cấu trúc Phiên → Lô**: Một `Auction` chứa nhiều `AuctionItem` (lots). Mỗi lô có thể gắn model `.glb` và chứng thư giám định, đi qua quy trình kiểm duyệt ký gửi (`PENDING_REVIEW` → `APPROVED` / `REJECTED`).
- **Quyền đặt giá (Bidding RBAC)**:
  - Tài khoản `SELLER` đang bật chế độ Người bán (`isSellerActive = true`) **chỉ được xem**, không được đặt giá (Server trả lỗi `403 Forbidden`). Phải tắt chế độ Seller về Buyer mới được tham gia trả giá.
  - Chủ sở hữu lô đấu giá không được tự đặt giá lên vật phẩm của mình.
- **Chống bắn tỉa (Anti-sniping)**: Khi có lượt đặt giá hợp lệ trong `2 phút cuối` trước giờ kết thúc (`AUCTION_ANTI_SNIPING_TRIGGER_MINUTES = 2`), thời gian kết thúc tự động gia hạn và phát sự kiện `auction:time_extended` tới toàn phòng.
- **Trao giải & Cơ hội thứ hai (`AuctionAward`)**:
  - Người thắng chính (`PRIMARY_WINNER`) nhận quyền checkout trong thời hạn quy định.
  - Nếu người thắng từ chối (`DECLINED`), rút lui (`BUYER_WITHDRAWN`) hoặc quá hạn (`PAYMENT_DEFAULT`), hệ thống xử lý tịch thu/bồi thường cọc (`AUCTION_DEPOSIT_FORFEIT` / `AUCTION_DEPOSIT_COMPENSATION`) và có thể kích hoạt `SECOND_CHANCE` cho người trả giá cao kế tiếp.

## 5. Danh mục 3 Cấp & Chuyển đổi Chế độ Seller

- **Danh mục (`Category`)**: Giới hạn tối đa **3 cấp** (`level` 1 → 2 → 3). Khi di chuyển node danh mục, cả Backend (`CategoryService`) và Frontend (`categoryMoveError`) đều chặn tự tham chiếu vào con cháu và chặn vượt quá độ sâu 3.
- **Chuyển đổi Buyer/Seller**: Endpoint `/api/v1/users/toggle-seller` cho phép Seller chuyển đổi chế độ hoạt động không cần đăng xuất; tuy nhiên nếu `isShopSuspended = true`, `AuthContext` luôn ép về chế độ `BUYER`.
