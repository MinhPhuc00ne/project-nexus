---
title: State Machines & Vòng đời Giao dịch
---

# State Machines (Đơn hàng, Escrow, Hậu mãi & Đấu giá)

Tài liệu này mô tả chi tiết các máy trạng thái (State Machines) đang điều khiển vòng đời giao dịch trong Project Nexus.

## 1. Vòng đời Ký quỹ (`EscrowStatus`)

```mermaid
stateDiagram-v2
    [*] --> HELD : Thanh toán thành công (PAYOS / WALLET)
    HELD --> DISBURSED : Buyer xác nhận nhận hàng / Hết hạn kiểm tra 3 ngày
    HELD --> DISPUTED : Buyer mở tranh chấp hoặc yêu cầu trả hàng
    DISPUTED --> DISBURSED : Staff/Admin xử lý phần thắng cho Seller
    DISPUTED --> REFUNDED : Staff/Admin duyệt hoàn tiền cho Buyer
    DISBURSED --> [*]
    REFUNDED --> [*]
```

- Khi ở `DISBURSED`: Ví Seller nhận `subtotal - platformFee (7%) + shippingFee` (tùy cấu hình trả cước), ví Admin ghi nhận phí sàn.
- Khi ở `REFUNDED`: Toàn bộ số tiền hoàn được điều phối qua `RefundService` và `OrderRefund`.

## 2. Hủy đơn & Trả hàng / Hoàn tiền (`AfterSalesRequest` & `OrderRefund`)

```mermaid
flowchart LR
    REQ["AfterSalesRequest"] --> TYPE{"Loại yêu cầu"}
    TYPE -->|Hủy trước lấy hàng| CANCEL["Gọi GHN /v2/switch-status/cancel"]
    CANCEL -->|GHN OK| REFUND["Tạo OrderRefund (100% tổng thanh toán)"]
    CANCEL -->|GHN Timeout| PENDING["Giữ trạng thái pending để đối soát lại<br/>KHÔNG nhả tiền/kho vội"]
    TYPE -->|Trả hàng trong 3 ngày sau giao| RETURN["Tạo vận đơn chiều về NX-RETURN-orderUUID"]
    RETURN --> INSPECT{"Kiểm tra hàng hoàn"}
    INSPECT -->|Hàng nguyên vẹn| RESTOCK["restock: true -> cộng lại availableQty"]
    INSPECT -->|Hàng hư hỏng| NORESTOCK["restock: false -> KHÔNG cộng lại availableQty"]
    RESTOCK --> REFUND
    NORESTOCK --> REFUND
```

### Quy tắc Hạch toán Hoàn tiền (`OrderRefund`)

- **Phạm vi**: Hỗ trợ hủy toàn bộ đơn trước khi GHN lấy hàng và trả toàn bộ đơn trong **cửa sổ kiểm tra 3 ngày** sau khi giao.
- **Mức hoàn**: Hoàn **100% tổng thanh toán đã xác nhận** (bao gồm cả phí vận chuyển chiều đi), không khấu trừ tùy tiện.
- **Kênh hoàn tiền**:
  - Đơn thanh toán bằng **`WALLET`**: Hoàn tự động tức thì vào `Wallet.balance` của Buyer (`OrderRefund.status = SUCCESS`).
  - Đơn thanh toán bằng **`PAYOS`**: Tạo `OrderRefund` trạng thái `PENDING` (chuyển tiền từ `balance` sang `lockedBalance` của ví sàn), chỉ chuyển `SUCCESS` khi Admin xác nhận mã giao dịch chuyển khoản `externalReference` thực tế (trừ trường hợp Buyer chọn hoàn về ví nội bộ).

## 3. Vòng đời Đấu giá nhiều Lô (`Auction` → `AuctionItem` → `AuctionAward`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Admin tạo phiên
    DRAFT --> SCHEDULED : Lên lịch & duyệt các AuctionItem
    SCHEDULED --> ACTIVE : Đến giờ mở phiên (AuctionLifecycleService)
    ACTIVE --> EXTENDED : Anti-sniping (+2 phút cuối có bid hợp lệ)
    EXTENDED --> ACTIVE : Tiếp tục nhận bid
    ACTIVE --> ENDED : Hết giờ toàn bộ lô
    EXTENDED --> ENDED : Hết giờ gia hạn
    ENDED --> SETTLED : Hoàn tất trao giải / xử lý cọc
    DRAFT --> CANCELLED : Hủy phiên
    SCHEDULED --> CANCELLED : Hủy trước khi mở
```

### Quy trình Lô & Trao giải (`AuctionItem` & `AuctionAward`)

1. **Kiểm duyệt Ký gửi (`AuctionItemStatus`)**: Seller đăng ký vật phẩm + chứng thư giám định → `PENDING_REVIEW` → Staff/Admin duyệt `APPROVED` (gắn vào phiên) hoặc `REJECTED`.
2. **Trao giải chính (`PRIMARY_WINNER`)**: Lô kết thúc với giá cao nhất hợp lệ → tạo `AuctionAward` (`AWAITING_CHECKOUT` / `AWAITING_DEPOSIT` → `PAID`).
3. **Cơ hội thứ hai (`SECOND_CHANCE`) & Tịch thu cọc**: Nếu người thắng chính từ chối (`DECLINED`), rút lui (`BUYER_WITHDRAWN`) hoặc quá hạn thanh toán (`PAYMENT_DEFAULT`), hệ thống ghi nhận `AUCTION_DEPOSIT_FORFEIT` / `AUCTION_DEPOSIT_COMPENSATION` và có thể phát lời mời `SECOND_CHANCE` cho người trả giá cao tiếp theo.
