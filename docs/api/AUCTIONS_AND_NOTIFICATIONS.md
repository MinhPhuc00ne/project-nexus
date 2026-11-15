# Tài liệu API Đấu giá (Auctions, Auction Checkout) & Thông báo (Notifications)

Tài liệu tổng hợp toàn bộ REST API và WebSocket API cho phân hệ **Đấu giá đa lô (Multi-lot Auction)**, **Thanh toán sau thắng đấu giá (Auction Checkout / Second-Chance)** và **Thông báo (Notifications)** theo đúng code Backend hiện tại trên nhánh `dev`.

- **Base URL HTTP:** `http://localhost:3000/api/v1` (biến môi trường cổng `PORT_BACKEND`, mặc định `3000`)
- **Swagger UI:** `http://localhost:3000/api/docs`
- **WebSocket Base URL:** `http://localhost:3000` với 2 namespace:
  - `/ws/auctions` (Phòng đấu giá real-time)
  - `/ws/notifications` (Thông báo real-time theo tài khoản)

---

## 1. Quy ước chung khi FE gọi API

### 1.1. Xác thực & Phân quyền (Authentication & Roles)

- Truyền JWT Access Token qua HTTP Header:
  ```http
  Authorization: Bearer <accessToken>
  ```
- Các endpoint đánh dấu **Public** (`@Public()`) không bắt buộc token, nhưng nếu gửi kèm token ở `GET /auctions/:id`, Backend sẽ nhận diện được user đang xem để trả thêm ngữ cảnh `viewerMode` (xem được `reservePrice` nếu là `ADMIN`, `SUPPORT_STAFF`, hoặc `SELLER` chủ sở hữu lô hàng).
- Danh sách role trong hệ thống (`Role`): `ADMIN`, `SUPPORT_STAFF`, `SELLER`, `BUYER`, `GUEST`.

> [!IMPORTANT]
> **Quy tắc chế độ Người bán vs Người mua (`isSellerActive`):**
> Tài khoản `SELLER` khi đang bật chế độ Người bán (`isSellerActive = true`) chỉ có quyền **xem** phòng đấu giá và ký gửi vật phẩm. Nếu gọi API đặt giá (`POST /auctions/:id/bids`, `POST /auctions/:id/items/:itemId/bids` hoặc `auction:bid:place` qua WebSocket) khi `isSellerActive = true`, Backend sẽ trả lỗi `403 Forbidden` yêu cầu chuyển về chế độ Người mua.

### 1.2. Cấu trúc Response thành công (HTTP)

Toàn bộ HTTP API thành công đi qua `TransformResponseInterceptor` và trả về cùng một vỏ bọc JSON:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-11-15T14:30:00.000Z",
  "traceId": "req-abc123"
}
```

### 1.3. Cấu trúc Response lỗi (HTTP)

Toàn bộ HTTP lỗi đi qua `GlobalHttpExceptionFilter`:

```json
{
  "statusCode": 400,
  "errorCode": "Bad Request",
  "message": "Thông báo lỗi (string hoặc string[] khi lỗi DTO validation)",
  "timestamp": "2026-11-15T14:30:00.000Z",
  "path": "/api/v1/auctions/...",
  "traceId": "req-abc123",
  "errors": null
}
```

### 1.4. Quy tắc Validation nghiêm ngặt (`ValidationPipe`)

Backend bật `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`:

- **Không gửi thừa field** ngoài DTO. Nếu FE gửi thêm bất kỳ property nào không khai báo trong DTO, Backend trả ngay `400 Bad Request` (`property <name> should not exist`).
- Toàn bộ tham số `:id`, `:itemId`, `:auctionId`, `:awardId`, `:complaintId` ở phân hệ đấu giá đều dùng `ParseUUIDPipe` — truyền sai định dạng UUID sẽ bị `400 Bad Request`.

### 1.5. Lưu ý môi trường Local / Docker khi chạy Đấu giá

- Backend cần Postgres (`5432`) và Redis (`6379`) đang chạy.
- Nếu DB báo lỗi thiếu cột kiểu `The column auction_items.lot_status does not exist`, chạy migration Prisma ở root hoặc backend:
  ```bash
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npx prisma generate --schema=backend/prisma/schema.prisma
  ```

---

## 2. Bảng tổng hợp phân quyền theo Role

| Nhóm API               | Endpoint                                               | Public / Guest |     BUYER     |    SELLER     | SUPPORT_STAFF |   ADMIN    |
| ---------------------- | ------------------------------------------------------ | :------------: | :-----------: | :-----------: | :-----------: | :--------: |
| **Xem công khai**      | `GET /auctions`                                        |       x        |       x       |       x       |       x       |     x      |
|                        | `GET /auctions/:id`                                    |       x        |       x       |       x       |       x       |     x      |
|                        | `GET /auctions/:id/intro-showcase`                     |       x        |       x       |       x       |       x       |     x      |
| **Buyer & Đấu giá**    | `GET /auctions/my-bids`                                |       -        |       x       |       x       |       x       |     x      |
|                        | `GET /auctions/:id/eligibility`                        |       -        |       x       |       x       |       x       |     x      |
|                        | `POST /auctions/:id/bids`                              |       -        |       x       |    x (\*)     |       -       |     -      |
|                        | `POST /auctions/:id/items/:itemId/bids`                |       -        |       x       |    x (\*)     |       -       |     -      |
| **Checkout sau thắng** | `GET /commerce/auction-awards`                         |       -        |       x       |       x       |       x       |     x      |
|                        | `POST /commerce/auction-awards/:id/quote`              |       -        | x (chủ award) | x (chủ award) |       -       |     -      |
|                        | `POST /commerce/auction-awards/:id/checkout`           |       -        | x (chủ award) | x (chủ award) |       -       |     -      |
|                        | `POST /commerce/auction-awards/:id/respond`            |       -        | x (chủ award) | x (chủ award) |       -       |     -      |
|                        | `POST /commerce/auction-awards/:id/decline`            |       -        | x (chủ award) | x (chủ award) |       -       |     -      |
| **Seller ký gửi**      | `GET /auctions/seller/my-items`                        |       -        |       -       |       x       |       -       |     x      |
|                        | `POST /auctions/:id/register-item`                     |       -        |       -       |       x       |       -       |     x      |
| **Support Staff**      | `GET /auctions/staff/overview`                         |       -        |       -       |       -       |       x       |     x      |
|                        | `PATCH /auctions/staff/items/:itemId/note`             |       -        |       -       |       -       |       x       |     x      |
|                        | `PATCH /auctions/:id/image`                            |       -        |       -       |       -       |       x       |     x      |
|                        | `GET /auctions/admin/:id/items`                        |       -        |       -       |       -       |       x       |     x      |
|                        | `GET /auctions/admin/awards`                           |       -        |       -       |       -       |       x       |     x      |
| **Admin quản trị**     | `POST /auctions/admin`                                 |       -        |       -       |       -       |       -       |     x      |
|                        | `PATCH /auctions/admin/:id`                            |       -        |       -       |       -       |       -       |     x      |
|                        | `DELETE /auctions/admin/:id`                           |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/admin/:id/lock-consignment`            |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/admin/:id/start`                       |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/admin/items/:itemId/review`            |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/admin/:id/items/:itemId/end`           |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/admin/awards/:awardId/payment-default` |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/admin/awards/:awardId/not-buying`      |       -        |       -       |       -       |       -       |     x      |
| **Khiếu nại & Chat**   | `GET /auctions/complaints`                             |       -        | x (của mình)  | x (của mình)  |  x (tất cả)   | x (tất cả) |
|                        | `POST /auctions/:id/complaints`                        |       -        |       x       |       x       |       -       |     -      |
|                        | `PATCH /auctions/complaints/:complaintId/resolve`      |       -        |       -       |       -       |       -       |     x      |
|                        | `POST /auctions/:id/support-chat`                      |       -        |       x       |       x       |       -       |     -      |
| **Thông báo**          | `GET /notifications`                                   |       -        |       x       |       x       |       x       |     x      |
|                        | `GET /notifications/unread-count`                      |       -        |       x       |       x       |       x       |     x      |
|                        | `PATCH /notifications/:id/read`                        |       -        |       x       |       x       |       x       |     x      |
|                        | `PATCH /notifications/read-all`                        |       -        |       x       |       x       |       x       |     x      |
|                        | `GET /notifications/preferences`                       |       -        |       x       |       x       |       x       |     x      |
|                        | `PUT /notifications/preferences`                       |       -        |       x       |       x       |       x       |     x      |
|                        | `GET /notifications/admin/summary`                     |       -        |       -       |       -       |       -       |     x      |

> (\*) Tài khoản `SELLER` chỉ đặt giá được khi đã tắt chế độ Người bán (`isSellerActive = false`) và không phải chủ vật phẩm của lô đó.

---

## 3. Luồng nghiệp vụ Đấu giá & Tài chính cốt lõi

FE cần nắm các mốc nghiệp vụ sau để render UI/state cho khớp với Backend:

1. **Tạo phiên & Ký gửi đa lô (Multi-lot):**
   - Admin tạo phiên đấu giá (`POST /auctions/admin`), gửi thông báo đến các Seller.
   - Seller ký gửi từng vật phẩm (kèm ảnh, chứng thư kiểm định, thông số đóng gói GHN) vào phiên (`POST /auctions/:id/register-item`).
   - Admin duyệt hoặc từ chối từng vật phẩm (`POST /auctions/admin/items/:itemId/review`) và gán số thứ tự lô (`lotNumber`), giá khởi điểm/giá sàn/bước giá chính thức.
   - Phiên bắt đầu (`POST /auctions/admin/:id/start`) chuyển các lô `APPROVED` sang `ACTIVE`, thời lượng phiên tối thiểu 30 phút (`MIN_AUCTION_DURATION_MS = 30 * 60 * 1000`).
2. **Màn giới thiệu 3D khi vào phòng (`intro-showcase`):**
   - Thời lượng intro tính theo số lô đã duyệt:
     `3800ms + max(1, lotCount) * 4800ms + 3500ms`.
   - Trong lúc `isIntroActive === true`, mọi request đặt giá đều bị từ chối (`400 Bad Request`). FE nên gọi `GET /auctions/:id/intro-showcase` hoặc lắng nghe `auction:started` để đồng bộ đếm ngược mở nút đặt giá.
3. **Đặt giá & Giữ chỗ 100% số dư ví + Chống bắn tỉa (Anti-sniping):**
   - Lượt đặt giá đầu tiên phải `>= max(startingPrice, reservePrice ?? 0)`. Các lượt sau phải `>= currentHighestBid + bidIncrement`.
   - Người đang giữ giá cao nhất hiện tại không thể tự đặt đè lên chính mình; Seller không thể đặt giá vật phẩm của mình.
   - Khi đặt giá hợp lệ, Backend **khóa 100% `bidAmount`** trong ví (`balance -> lockedBalance`, giao dịch `AUCTION_BID_LOCK`), đồng thời **hoàn 100%** tiền giữ chỗ cho người trả giá cao trước đó.
   - Nếu đặt giá trong **120 giây cuối** của lô (`ANTI_SNIPING_WINDOW_MS = 120_000`), lô được tự động gia hạn thêm **+120 giây** và phát sự kiện `auction:time_extended`.
4. **Kết thúc lô -> 30% Tiền cọc & 70% Thanh toán trong 24 giờ:**
   - Khi lô kết thúc và có người thắng hợp lệ:
     - Backend tạo `AuctionAward` cho `PRIMARY_WINNER` ở trạng thái `AWAITING_CHECKOUT` với hạn thanh toán **24 giờ**.
     - Tự động **hoàn 70%** tiền giữ chỗ về số dư khả dụng của ví người thắng (`balance`), **giữ lại đúng 30%** (`DEPOSIT_RATIO = 0.3`) làm tiền cọc trong `lockedBalance`.
   - Người thắng gọi `POST /commerce/auction-awards/:id/quote` để xem phí ship GHN + 70% còn lại, rồi gọi `POST /commerce/auction-awards/:id/checkout` để thanh toán hoàn tất bằng Ví NEXUS Pay và tạo đơn hàng (`isAuction = true`, `status = PAID`). _(Lưu ý: không thanh toán đơn đấu giá qua `/commerce/orders/:id/pay`.)_
   - Sau khi đơn chuyển `PAID`, toàn bộ quy trình **chuẩn bị hàng / tạo vận đơn GHN / theo dõi / xác nhận nhận hàng / giải ngân Escrow / hủy-trả hàng** dùng **chung 100%** với API đơn hàng thông thường (`/seller/orders/*`, `/commerce/orders/:id/tracking*`, `/commerce/orders/:id/confirm-delivery`, `/commerce/orders/:id/cancel`, `/commerce/orders/:id/returns`).
   - Nếu quá hạn 24h không thanh toán: Admin xác nhận quá hạn (`POST /auctions/admin/awards/:awardId/payment-default`) -> người thắng bị tịch thu 30% cọc, trừ 10 điểm uy tín, và hệ thống mời người trả giá cao thứ hai (`SECOND_CHANCE` ở trạng thái `AWAITING_ACCEPTANCE` hoặc `AWAITING_DEPOSIT` nếu ví chưa đủ 30% cọc).

---

## 4. Chi tiết API Đấu giá — Public & Mọi tài khoản

### 4.1. `GET /api/v1/auctions` — Danh sách phiên đấu giá công khai

- **Quyền:** Public (`@Public()`)
- **Query Params (`AuctionQueryDto`):**
  - `status` _(optional, enum `AuctionStatus`)_: `DRAFT | SCHEDULED | ACTIVE | EXTENDED | ENDED | SETTLED | CANCELLED | FAILED`
  - `sellerId` _(optional, string)_: Lọc theo ID người bán có vật phẩm trong phiên
  - `search` _(optional, string)_: Tìm kiếm theo tên phiên hoặc tên sản phẩm
  - `page` _(optional, number, min: 1, default: 1)_
  - `limit` _(optional, number, min: 1, default: 20)_ — Service giới hạn tối đa 50 item/trang
- **Response `data`:** Trả về cả object `pagination` lẫn các trường phẳng ở root để tương thích nhiều màn FE:
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "title": "Phiên đồng hồ Thụy Sĩ",
        "status": "ACTIVE",
        "targetUrl": "/auction/<id>",
        "startTime": "2026-11-15T13:00:00.000Z",
        "endTime": "2026-11-15T15:00:00.000Z",
        "createdByAdmin": { "id": "uuid", "fullName": "..." },
        "seller": { "id": "uuid", "fullName": "..." },
        "product": { "id": "uuid", "name": "..." }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    },
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 4.2. `GET /api/v1/auctions/:id` — Chi tiết phòng đấu giá đa lô

- **Quyền:** Public (`@Public()`, gửi Bearer token nếu đã đăng nhập để lấy `viewerMode` và dữ liệu theo role)
- **Path Param:** `id` (UUID)
- **Lưu ý bảo mật dữ liệu:**
  - `reservePrice` / `proposedReservePrice` chỉ hiển thị cho `ADMIN`, `SUPPORT_STAFF`, hoặc `SELLER` là chủ sở hữu của đúng lô hàng đó; Buyer và Guest sẽ nhận `null`.
  - Trả về đầy đủ `targetUrl` (`/auction/:id`), trạng thái `introState`, danh sách lô `items` / `lots`, và lịch sử trả giá `bids`.

### 4.3. `GET /api/v1/auctions/:id/intro-showcase` — Đồng bộ intro 3D vào phòng

- **Quyền:** Public (`@Public()`)
- **Path Param:** `id` (UUID)
- **Mục đích:** FE gọi ngay khi mở phòng đấu giá để biết intro 3D còn chạy không (`isIntroActive`), đã trôi qua bao nhiêu ms (`elapsedMs`), tổng thời gian intro (`introDurationMs`), và danh sách vật phẩm cần trình chiếu 3D.

---

## 5. Chi tiết API Đấu giá & Thanh toán — BUYER (Người mua)

### 5.1. `GET /api/v1/auctions/my-bids` — Lịch sử đặt giá & quyền mua của tôi

- **Quyền:** Mọi tài khoản đã đăng nhập (`JwtAuthGuard`)
- **Mục đích:** Lấy danh sách các lượt đặt giá của user hiện tại kèm trạng thái lô và quyền mua (`AuctionAward`).

### 5.2. `GET /api/v1/auctions/:id/eligibility` — Kiểm tra điều kiện trước khi đặt giá

- **Quyền:** Mọi tài khoản đã đăng nhập (`JwtAuthGuard`)
- **Path Param:** `id` (UUID)
- **Response `data` mẫu:**
  ```json
  {
    "eligible": true,
    "reasons": [],
    "reputationScore": 100,
    "minBuyerReputation": 40,
    "availableBalance": 500000000,
    "lockedBalance": 0,
    "isSellerActive": false,
    "introActive": false,
    "approvedLotsCount": 3
  }
  ```
- **Lưu ý:** Nên gọi API này trước khi mở modal nhập giá để hiển thị cảnh báo ví chưa đủ hoặc đang bật chế độ Người bán (`isSellerActive: true`).

### 5.3. `POST /api/v1/auctions/:id/bids` — Đặt giá trong phòng đấu giá

- **Quyền:** `BUYER`, `SELLER` _(chỉ khi `isSellerActive = false`)_
- **HTTP Status thành công:** `200 OK`
- **Path Param:** `id` (UUID của phiên đấu giá)
- **Request Body (`PlaceBidDto`):**
  - `auctionItemId` _(optional, UUID)_: Bắt buộc phải truyền nếu phiên có **từ 2 lô trở lên**. Nếu phiên chỉ có 1 lô `APPROVED`, có thể bỏ trống để hệ thống tự chọn.
  - `bidAmount` _(required, number, min: 1000)_: Số tiền đặt giá (VND).
  ```json
  {
    "auctionItemId": "2f5a1e9c-0000-4000-8000-000000000001",
    "bidAmount": 125000000
  }
  ```

### 5.4. `POST /api/v1/auctions/:id/items/:itemId/bids` — Đặt giá trực tiếp theo ID lô

- **Quyền:** `BUYER`, `SELLER` _(chỉ khi `isSellerActive = false`)_
- **HTTP Status thành công:** `200 OK`
- **Path Params:** `id` (UUID phiên), `itemId` (UUID lô hàng)
- **Request Body (`PlaceBidDto`):** Chỉ cần gửi `{ "bidAmount": 125000000 }` (Controller tự gán `auctionItemId = itemId`).

### 5.5. `GET /api/v1/commerce/auction-awards` — Danh sách quyền mua & đơn thắng của tôi

- **Quyền:** Đã đăng nhập (`JwtAuthGuard`), trả về các `AuctionAward` thuộc về user hiện tại (`PRIMARY_WINNER` hoặc `SECOND_CHANCE`).

### 5.6. `POST /api/v1/commerce/auction-awards/:id/quote` — Báo giá ship GHN & 70% còn lại

- **Quyền:** Đã đăng nhập (`JwtAuthGuard`), chỉ chủ sở hữu award
- **HTTP Status thành công:** `200 OK`
- **Path Param:** `id` (UUID của `AuctionAward`)
- **Request Body (`CheckoutAuctionAwardDto`):** Chọn **1 trong 3 cách** truyền địa chỉ:
  1. Dùng địa chỉ đã lưu:
     ```json
     { "addressId": "uuid-dia-chi-da-luu" }
     ```
  2. Dùng object lồng `shippingAddress` (`ShippingAddressDto`):
     ```json
     {
       "shippingAddress": {
         "country": "VN",
         "recipientName": "Nguyễn Văn A",
         "phone": "0987654321",
         "city": "TP. Hồ Chí Minh",
         "district": "Quận 1",
         "ward": "Phường Bến Nghé",
         "street": "123 Lê Lợi"
       }
     }
     ```
  3. Dùng các field phẳng (bắt buộc `recipientName`, `phone`, `city`, `street`; optional `district`, `ward`, `country: "VN"`):
     ```json
     {
       "recipientName": "Nguyễn Văn A",
       "phone": "0987654321",
       "city": "TP. Hồ Chí Minh",
       "district": "Quận 1",
       "ward": "Phường Bến Nghé",
       "street": "123 Lê Lợi",
       "country": "VN"
     }
     ```
  - _(Lưu ý: `shippingFee` là field deprecated để tương thích ngược, Backend bỏ qua giá trị FE gửi lên và tự tính từ GHN.)_

### 5.7. `POST /api/v1/commerce/auction-awards/:id/checkout` — Thanh toán 70% còn lại + phí ship

- **Quyền:** Đã đăng nhập (`JwtAuthGuard`), chỉ chủ sở hữu award đang ở trạng thái `AWAITING_CHECKOUT`
- **HTTP Status thành công:** `200 OK`
- **Path Param:** `id` (UUID của `AuctionAward`)
- **Request Body (`CheckoutAuctionAwardDto`):** Giống hệt mục `5.6`.

### 5.8. `POST /api/v1/commerce/auction-awards/:id/respond` — Người mua thứ hai xác nhận / từ chối

- **Quyền:** Đã đăng nhập (`JwtAuthGuard`), chỉ chủ sở hữu award `SECOND_CHANCE`
- **HTTP Status thành công:** `200 OK`
- **Path Param:** `id` (UUID của `AuctionAward`)
- **Request Body (`RespondSecondChanceDto`):**
  ```json
  { "accept": true }
  ```
- **Lưu ý:** Nếu `accept: true`:
  - Nếu ví đủ 30% cọc: khóa ngay 30% tiền cọc và chuyển award sang `AWAITING_CHECKOUT` (mở hạn 24h thanh toán).
  - Nếu ví chưa đủ 30% cọc: award chuyển sang `AWAITING_DEPOSIT` và trả hướng dẫn số tiền cần nạp thêm. Khi nạp ví đủ, hệ thống tự chốt cọc 30%.

### 5.9. `POST /api/v1/commerce/auction-awards/:id/decline` — Người mua thứ hai từ chối lời mời

- **Quyền:** Đã đăng nhập (`JwtAuthGuard`)
- **HTTP Status thành công:** `200 OK`
- **Request Body:** Không cần body. Từ chối không bị trừ điểm uy tín.

---

## 6. Chi tiết API Ký gửi Đấu giá — SELLER (Người bán)

### 6.1. `GET /api/v1/auctions/seller/my-items` — Danh sách vật phẩm ký gửi của tôi

- **Quyền:** `SELLER`, `ADMIN`
- **Mục đích:** Seller theo dõi toàn bộ vật phẩm đã ký gửi qua các phiên, trạng thái duyệt (`PENDING_REVIEW`, `APPROVED`, `REJECTED`), lý do từ chối nếu có, `lotNumber`, và kết quả đấu giá.

### 6.2. `POST /api/v1/auctions/:id/register-item` — Ký gửi vật phẩm vào phiên

- **Quyền:** `SELLER`, `ADMIN`
- **Path Param:** `id` (UUID phiên đấu giá đang mở nhận ký gửi)
- **Request Body (`RegisterAuctionItemDto`):**
  - `title` _(required, string)_: Tên vật phẩm
  - `description` _(required, string)_: Mô tả chi tiết, tình trạng, xuất xứ
  - `images` _(required, string[], not empty)_: Danh sách URL ảnh sản phẩm
  - `threeModelKey` _(optional, string)_: Key mô hình 3D (ví dụ `models/patek-5711.glb`)
  - `proposedStartingPrice` _(required, number, min: 10000)_: Giá khởi điểm đề xuất (VND)
  - `proposedReservePrice` _(optional, number)_: Giá sàn kỳ vọng tối thiểu (VND)
  - `proposedBidIncrement` _(optional, number, min: 1000, default: 100000)_: Bước giá đề xuất
  - `appraisalCertificateNumber` _(optional, string)_: Mã số chứng thư kiểm định
  - `appraisalAgency` _(optional, string)_: Tên tổ chức/đơn vị kiểm định
  - `certificateImages` _(required, string[], not empty)_: Danh sách URL ảnh chứng thư, hóa đơn, thẻ bảo hành
  - `certificateIssueDate` _(optional, ISO 8601 date string)_: Ngày cấp chứng thư
  - `weightGrams` _(optional, int, 1..50000, default: 500)_: Cân nặng kiện hàng (gram) để tính phí GHN
  - `lengthCm` _(optional, int, 1..200, default: 20)_: Chiều dài (cm)
  - `widthCm` _(optional, int, 1..200, default: 15)_: Chiều rộng (cm)
  - `heightCm` _(optional, int, 1..200, default: 10)_: Chiều cao (cm)

---

## 7. Chi tiết API Hỗ trợ Đấu giá — SUPPORT_STAFF (Nhân viên hỗ trợ)

> Admin cũng có toàn quyền gọi các endpoint dưới đây.

### 7.1. `GET /api/v1/auctions/staff/overview` — Bảng điều phối hỗ trợ đấu giá 3D

- **Quyền:** `SUPPORT_STAFF`, `ADMIN`
- **Mục đích:** Lấy tổng quan các phiên/lô đang cần theo dõi hoặc hỗ trợ trực tuyến.

### 7.2. `PATCH /api/v1/auctions/staff/items/:itemId/note` — Ghi chú kiểm tra / hỗ trợ trên lô hàng

- **Quyền:** `SUPPORT_STAFF`, `ADMIN`
- **Path Param:** `itemId` (UUID của `AuctionItem`)
- **Request Body (`StaffAuctionNoteDto`):**
  ```json
  {
    "staffNote": "Đã kiểm tra sơ bộ giấy kiểm định GIA và đối chiếu ảnh thực tế."
  }
  ```
  - `staffNote` _(optional, string, maxLength: 2000)_

### 7.3. `PATCH /api/v1/auctions/:id/image` — Cập nhật ảnh đại diện phiên chưa bắt đầu

- **Quyền:** `ADMIN`, `SUPPORT_STAFF` _(lưu ý trên Swagger API này nằm ở tag `11. AUCTIONS`)_
- **Path Param:** `id` (UUID phiên đấu giá)
- **Request Body (`UpdateAuctionImageDto`):**
  ```json
  {
    "imageUrl": "https://cdn.example.com/uploads/auction-cover.jpg"
  }
  ```
  - `imageUrl` _(required, HTTP/HTTPS URL)_: Upload ảnh qua `POST /api/v1/media/upload` trước, rồi truyền URL nhận được vào đây.

### 7.4. API xem chung với Admin

- `GET /api/v1/auctions/admin/:id/items`: Xem toàn bộ vật phẩm ký gửi trong phiên (cả `PENDING_REVIEW`, `APPROVED`, `REJECTED`).
- `GET /api/v1/auctions/admin/awards?auctionId=...`: Theo dõi danh sách quyền mua sau đấu giá (`AuctionAward`).

---

## 8. Chi tiết API Quản trị Đấu giá — ADMIN

### 8.1. `POST /api/v1/auctions/admin` — Tạo phòng đấu giá mới

- **Quyền:** `ADMIN`
- **Request Body (`AdminCreateAuctionDto`):**
  - `title` _(required, string)_
  - `description` _(optional, string)_
  - `imageUrl` _(optional, string)_
  - `startTime` _(required, ISO 8601 date string)_: Thời điểm mở phiên
  - `consignmentDeadline` _(optional, ISO 8601 date string)_: Hạn đóng nhận ký gửi (phải sau `startTime` và trước `endTime`)
  - `endTime` _(required, ISO 8601 date string)_: Thời điểm dự kiến kết thúc
  - `minBuyerReputation` _(optional, int >= 0, default: 40)_
  - `minSellerReputation` _(optional, int >= 0, default: 50)_

### 8.2. `PATCH /api/v1/auctions/admin/:id` — Cập nhật phiên đấu giá trước khi bắt đầu

- **Quyền:** `ADMIN`
- **Path Param:** `id` (UUID)
- **Request Body (`AdminUpdateAuctionDto`):** Tất cả field đều optional: `title`, `description`, `imageUrl`, `startTime`, `consignmentDeadline`, `endTime`, `minBuyerReputation`, `minSellerReputation`.

### 8.3. `DELETE /api/v1/auctions/admin/:id` — Xóa phòng đấu giá

- **Quyền:** `ADMIN`
- **Path Param:** `id` (UUID)
- **Điều kiện:** Chỉ xóa được phiên chưa diễn ra và chưa có lượt đặt giá.

### 8.4. `POST /api/v1/auctions/admin/:id/lock-consignment` — Khóa nhận ký gửi sớm

- **Quyền:** `ADMIN` | **HTTP Status:** `200 OK`
- **Path Param:** `id` (UUID) | **Body:** Không cần body.

### 8.5. `POST /api/v1/auctions/admin/:id/start` — Bắt đầu phiên đấu giá thủ công

- **Quyền:** `ADMIN` | **HTTP Status:** `200 OK`
- **Path Param:** `id` (UUID) | **Body:** Không cần body.
- **Tác dụng:**
  - Phiên phải đang ở `SCHEDULED` và có ít nhất 1 vật phẩm `APPROVED`.
  - Chuyển phiên và các lô `APPROVED` sang `ACTIVE`, khóa ký gửi, gửi thông báo tới Buyer và broadcast sự kiện WebSocket `auction:started` để đồng bộ intro 3D.

### 8.6. `GET /api/v1/auctions/admin/:id/items` — Danh sách vật phẩm ký gửi trong phiên

- **Quyền:** `ADMIN`, `SUPPORT_STAFF`
- **Path Param:** `id` (UUID)
- **Response `data` mẫu:**
  ```json
  {
    "auctionId": "uuid",
    "auctionTitle": "Phiên đồng hồ Thụy Sĩ",
    "auctionStatus": "SCHEDULED",
    "totalCount": 1,
    "items": [
      {
        "id": "uuid",
        "title": "Patek Philippe 5711",
        "status": "PENDING_REVIEW",
        "seller": {
          "id": "uuid",
          "fullName": "...",
          "email": "...",
          "platformEmail": "...",
          "avatarUrl": null,
          "shopAvatarUrl": null,
          "reputationScore": 100,
          "trustLevel": "STANDARD",
          "isShopSuspended": false
        }
      }
    ]
  }
  ```

### 8.7. `POST /api/v1/auctions/admin/items/:itemId/review` — Duyệt hoặc từ chối vật phẩm ký gửi

- **Quyền:** `ADMIN` | **HTTP Status:** `200 OK`
- **Path Param:** `itemId` (UUID của `AuctionItem`)
- **Request Body (`ReviewAuctionItemDto`):**
  - `action` _(required)_: `'APPROVE' | 'REJECT'`
  - `rejectionReason` _(required khi `action = 'REJECT'`, string)_
  - `lotNumber` _(optional, int >= 1)_: Số thứ tự lô khi duyệt
  - `startingPrice` _(optional, number >= 1000)_: Giá khởi điểm chính thức (nếu bỏ trống sẽ dùng `proposedStartingPrice`)
  - `reservePrice` _(optional, number >= 1000)_: Giá sàn chính thức
  - `bidIncrement` _(optional, number >= 1000)_: Bước giá chính thức

### 8.8. `POST /api/v1/auctions/admin/:id/items/:itemId/end` — Kết thúc riêng một lô hàng

- **Quyền:** `ADMIN` _(Support Staff không có quyền)_ | **HTTP Status:** `200 OK`
- **Path Params:** `id` (UUID phiên), `itemId` (UUID lô hàng)
- **Body:** Không cần body. Chốt kết quả lô, xử lý hoàn 70% / giữ 30% cọc cho người thắng (nếu có) và broadcast `auction:lot:ended` (hoặc `auction:ended` nếu là lô cuối cùng).

### 8.9. `GET /api/v1/auctions/admin/awards` — Quản lý danh sách quyền mua sau đấu giá

- **Quyền:** `ADMIN`, `SUPPORT_STAFF`
- **Query Param:** `auctionId` _(optional, string)_

### 8.10. `POST /api/v1/auctions/admin/awards/:awardId/payment-default` — Chốt quá hạn thanh toán 24h

- **Quyền:** `ADMIN` | **HTTP Status:** `200 OK`
- **Path Param:** `awardId` (UUID)
- **Request Body (`AdminAwardActionDto`):**
  ```json
  {
    "confirmed": true,
    "note": "Người mua không hoàn tất thanh toán phần còn lại trong thời hạn 24 giờ."
  }
  ```
  - `confirmed` _(required, boolean)_: Bắt buộc phải là `true`, nếu `false` Backend trả `400 Bad Request`.
  - `note` _(optional, string, maxLength: 1000)_

### 8.11. `POST /api/v1/auctions/admin/awards/:awardId/not-buying` — Chốt người mua thứ hai không mua nữa

- **Quyền:** `ADMIN` | **HTTP Status:** `200 OK`
- **Path Param:** `awardId` (UUID)
- **Request Body (`AdminAwardActionDto`):** `{ "confirmed": true, "note": "..." }` _(bắt buộc `confirmed: true`)_. Hoàn cọc 30% (nếu đã đóng) và đóng lô hàng.

---

## 9. Chi tiết API Khiếu nại & Chat hỗ trợ đấu giá

### 9.1. `GET /api/v1/auctions/complaints` — Danh sách khiếu nại đấu giá

- **Quyền:** `BUYER`, `SELLER` _(chỉ xem đơn của chính mình)_ | `SUPPORT_STAFF`, `ADMIN` _(xem tất cả)_
- **Query Params:**
  - `auctionId` _(optional, string)_
  - `status` _(optional, enum Prisma `AuctionComplaintStatus`)_: `OPEN | ACCEPTED | REJECTED`

> [!WARNING]
> **Sai khác enum giữa Backend và `@nexus/types`:**
> Controller và Prisma dùng `AuctionComplaintStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED'`, trong khi `packages/types/src/enums/index.ts` đang ghi `PENDING`. Khi FE gọi `GET /auctions/complaints?status=...`, bắt buộc truyền `'OPEN'` chứ không truyền `'PENDING'`.

### 9.2. `POST /api/v1/auctions/:id/complaints` — Gửi khiếu nại liên quan đến phiên đấu giá

- **Quyền:** `BUYER`, `SELLER`
- **Path Param:** `id` (UUID phiên đấu giá)
- **Request Body (`CreateAuctionComplaintDto`):**
  ```json
  {
    "auctionItemId": "uuid-lo-hang-optional",
    "reason": "Người mua thắng đấu giá nhưng chưa hoàn tất thanh toán sau thời hạn quy định.",
    "evidenceUrls": ["https://cdn.example.com/evidence-1.jpg"]
  }
  ```
  - `auctionItemId` _(optional, UUID)_
  - `reason` _(required, string, maxLength: 2000)_
  - `evidenceUrls` _(optional, string[])_

### 9.3. `PATCH /api/v1/auctions/complaints/:complaintId/resolve` — Admin xử lý khiếu nại

- **Quyền:** `ADMIN`
- **Path Param:** `complaintId` (UUID)
- **Request Body (`ResolveAuctionComplaintDto`):**
  ```json
  {
    "status": "ACCEPTED",
    "adminNote": "Đã tiếp nhận khiếu nại và chuyển sang bước xử lý quá hạn thanh toán."
  }
  ```
  - `status` _(required)_: `'ACCEPTED' | 'REJECTED'`
  - `adminNote` _(optional, string, maxLength: 1000)_

### 9.4. `POST /api/v1/auctions/:id/support-chat` — Mở hội thoại hỗ trợ trực tiếp trong phòng

- **Quyền:** `BUYER`, `SELLER`
- **Path Param:** `id` (UUID phiên đấu giá)
- **Request Body (`AuctionSupportChatDto`):**
  ```json
  {
    "message": "Xin hỗ trợ kiểm tra điều kiện tham gia và quy trình đặt cọc 30% của lô #1."
  }
  ```
  - `message` _(required, string, maxLength: 1500)_

---

## 10. Chi tiết API Thông báo (Notifications REST API)

Tất cả endpoint dưới `/api/v1/notifications` đều yêu cầu đăng nhập (`JwtAuthGuard`). Swagger Tag: `9. NOTIFICATIONS`.

### 10.1. `GET /api/v1/notifications` — Lấy danh sách thông báo của tài khoản

- **Quyền:** Tất cả user đã đăng nhập (`ADMIN`, `SUPPORT_STAFF`, `SELLER`, `BUYER`)
- **Query Params (`QueryNotificationDto`):**
  - `page` _(optional, int >= 1, default: 1)_
  - `limit` _(optional, int >= 1, default: 10, max: 50)_
  - `isRead` _(optional, boolean)_: `'true'` hoặc `'false'`
  - `type` _(optional, enum `NotificationType`)_: `ORDER | AUCTION | SYSTEM | PAYMENT | DISPUTE`
- **Response `data` (`NotificationPageDto`):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "title": "Phiên đấu giá đã bắt đầu",
        "content": "...",
        "type": "AUCTION",
        "channel": "IN_APP",
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-11-15T14:00:00.000Z",
        "auctionId": "uuid-hoac-null",
        "targetUrl": "/auction/uuid",
        "metadata": {}
      }
    ],
    "total": 25,
    "unreadCount": 4,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
  ```
- **Lưu ý điều hướng FE:** Nếu thông báo có `targetUrl` (ví dụ `/auction/<id>` hoặc `/admin/auctions`, `/admin/reports`, ...), FE điều hướng thẳng tới route đó khi user click vào item thông báo.

### 10.2. `GET /api/v1/notifications/unread-count` — Lấy số lượng thông báo chưa đọc

- **Quyền:** Mọi user đã đăng nhập
- **Response `data`:** `{ "unreadCount": 4 }` (dùng cho icon chuông header nếu chưa nhận event WebSocket).

### 10.3. `PATCH /api/v1/notifications/:id/read` — Đánh dấu 1 thông báo đã đọc

- **Quyền:** Mọi user đã đăng nhập (chỉ áp dụng cho thông báo thuộc user đó; không tìm thấy trả `404`).

### 10.4. `PATCH /api/v1/notifications/read-all` — Đánh dấu tất cả thông báo là đã đọc

- **Quyền:** Mọi user đã đăng nhập.

### 10.5. `GET /api/v1/notifications/preferences` — Xem cấu hình kênh nhận thông báo

- **Quyền:** Mọi user đã đăng nhập. Trả về trạng thái bật/tắt theo từng kênh `IN_APP`, `EMAIL`, `PUSH`.

### 10.6. `PUT /api/v1/notifications/preferences` — Cập nhật kênh nhận thông báo

- **Quyền:** Mọi user đã đăng nhập
- **Request Body (`UpdateNotificationPreferencesDto`):**
  ```json
  {
    "preferences": [
      { "channel": "IN_APP", "isEnabled": true },
      { "channel": "EMAIL", "isEnabled": true },
      { "channel": "PUSH", "isEnabled": false }
    ]
  }
  ```
  - `channel`: `EMAIL | PUSH | IN_APP`
  - `isEnabled`: `boolean`

### 10.7. `GET /api/v1/notifications/admin/summary` — Tổng hợp chuông & hàng chờ duyệt của Admin

- **Quyền:** Chỉ `ADMIN` (`403 Forbidden` cho các role khác)
- **Response `data` (`AdminNotificationSummaryDto`):**
  ```json
  {
    "unreadCount": 5,
    "totalPendingActions": 10,
    "pendingQueues": {
      "sellerUpgradeRequests": 2,
      "auctionConsignments": 3,
      "withdrawalRequests": 1,
      "openDisputes": 1,
      "violationReports": 2,
      "pendingRefunds": 1,
      "pendingPickupPoints": 0
    },
    "recentNotifications": []
  }
  ```
- **Gợi ý map menu Admin sidebar:**
  - `sellerUpgradeRequests` -> `/admin/sellers`
  - `auctionConsignments` -> `/admin/auctions`
  - `withdrawalRequests` -> `/admin/finance`
  - `openDisputes`, `violationReports` -> `/admin/reports`
  - `pendingRefunds` -> `/admin/refunds`
  - `pendingPickupPoints` -> `/admin/stores`

---

## 11. WebSocket Real-time API (Socket.IO)

> [!NOTE]
> Payloads phát qua Socket.IO là object JSON **trực tiếp**, **không** bọc trong `{ statusCode, message, data, ... }` như HTTP REST.

### 11.1. Namespace `/ws/auctions` — Phòng đấu giá trực tiếp

- **URL kết nối:** `http://localhost:3000/ws/auctions`
- **Auth Handshake:** Tùy chọn (nếu chỉ xem công khai không cần token; nhưng để **đặt giá** hoặc **đồng bộ 3D**, bắt buộc truyền JWT):
  ```ts
  import { io } from 'socket.io-client';

  const auctionSocket = io('http://localhost:3000/ws/auctions', {
    auth: { token: accessToken }, // hoặc header Authorization: Bearer <token>
    transports: ['websocket', 'polling'],
  });
  ```

#### Sự kiện Client gửi lên Server (`CLIENT -> SERVER`)

| Tên event           | Payload                                                                              | Ai được gửi                        | Mô tả                                                      |
| ------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------- |
| `auction:join`      | `{ auctionId: string }`                                                              | Mọi client                         | Tham gia room `auction:<auctionId>` để nhận real-time      |
| `auction:leave`     | `{ auctionId: string }`                                                              | Mọi client                         | Rời room `auction:<auctionId>`                             |
| `auction:bid:place` | `{ auctionId: string, auctionItemId?: string, bidAmount: number }`                   | Buyer / Seller (`!isSellerActive`) | Đặt giá qua WS (có ack callback `{ ok, data?, error? }`)   |
| `auction:3d:sync`   | `{ auctionId: string, rotation: { x: number, y: number, z: number }, zoom: number }` | Chỉ `ADMIN`                        | Đồng bộ góc xoay/zoom mô hình 3D tới người xem trong phòng |

#### Sự kiện Server đẩy xuống Client (`SERVER -> CLIENT`)

| Tên event               | Phạm vi nhận                        | Payload chính                                                                                                              |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `auction:room_joined`   | Client vừa join                     | `{ auctionId, socketId, timestamp }`                                                                                       |
| `auction:started`       | Toàn bộ kết nối                     | `{ auctionId, title, description, startedAt, endTime, serverTime, introDurationMs, items }`                                |
| `auction:bid:placed`    | Room `auction:<id>`                 | `{ auctionId, auctionItemId, lotNumber, bidId, bidderId, bidderName, bidAmount, placedAt, newMinimumBid, totalBidsCount }` |
| `auction:bid:rejected`  | Người đặt lỗi                       | `{ auctionId, auctionItemId?, message, code? }`                                                                            |
| `auction:timer:sync`    | Room `auction:<id>`                 | `{ auctionId, auctionItemId?, remainingSeconds, endTime, status, isExtended, lotTimers? }`                                 |
| `auction:time_extended` | Room `auction:<id>`                 | `{ auctionId, auctionItemId, extendedBySeconds: 120, newEndTime, reason: 'ANTI_SNIPING' }`                                 |
| `auction:lot:ended`     | Room `auction:<id>`                 | `{ auctionId, auctionItemId, lotNumber?, status, winningBidderId?, winningPrice? }`                                        |
| `auction:ended`         | Room `auction:<id>`                 | `{ auctionId, winningBidderId?, winningPrice? }`                                                                           |
| `auction:3d:updated`    | Room `auction:<id>` (trừ người gửi) | `{ auctionId, rotation: { x, y, z }, zoom }`                                                                               |
| `auction:error`         | Client lỗi                          | `{ message }`                                                                                                              |

### 11.2. Namespace `/ws/notifications` — Thông báo Real-time 0 giây

- **URL kết nối:** `http://localhost:3000/ws/notifications`
- **Auth Handshake (BẮT BUỘC):** Phải truyền JWT qua `auth: { token }` hoặc header `Authorization: Bearer <token>`. Nếu thiếu hoặc token hết hạn, server gửi `notification:error` rồi tự `disconnect(true)`.
- Khi kết nối thành công, server tự join socket vào room `user:<userId>` và `role:<role>`, đồng thời bắn ngay `notification:connected`.

#### Sự kiện Client <-> Server

- **Client gửi (`CLIENT -> SERVER`):**
  - `notification:ping` _(không cần payload)_ -> Server trả về `notification:unread_count` `{ userId, unreadCount }`.
- **Server gửi (`SERVER -> CLIENT`):**
  - `notification:connected`: `{ userId, role, unreadCount, timestamp }`
  - `notification:new`: `{ id, userId, title, content, type, channel, isRead, readAt, createdAt, auctionId, targetUrl, metadata, unreadCount }`
  - `notification:unread_count`: `{ userId, unreadCount }`
  - `notification:error`: `{ message }`

### 11.3. Lưu ý tích hợp Socket.IO trên React FE

- Chỉ khởi tạo **1 singleton socket** hoặc dùng `useEffect` cleanup cẩn thận (`socket.disconnect()` khi unmount).
- Khi mới mở app hoặc trong chế độ React `StrictMode` (mount -> unmount -> mount lại), terminal BE có thể hiện log mức `DEBUG` như `Socket client disconnected` — đó chỉ là log đóng/mở lại kết nối từ phía trình duyệt, **không phải lỗi Backend** nếu user vẫn đang nhận event bình thường.
- Chỉ kết nối `/ws/notifications` khi user **đã có JWT token hợp lệ**; tránh connect khi chưa đăng nhập để không bị server ngắt kết nối liên tục.

---

## 12. Bảng tra cứu Enum & Lưu ý cho FE

### 12.1. Enum Đấu giá (`backend/prisma/schema.prisma`)

- **`AuctionStatus`:** `DRAFT`, `SCHEDULED`, `ACTIVE`, `EXTENDED`, `ENDED`, `SETTLED`, `CANCELLED`, `FAILED`
- **`AuctionItemStatus` (trạng thái duyệt ký gửi):** `PENDING_REVIEW`, `APPROVED`, `REJECTED`
- **`BidStatus`:** `ACCEPTED`, `SUPERSEDED`, `WINNING`, `REJECTED`
- **`AuctionAwardTier`:** `PRIMARY_WINNER`, `SECOND_CHANCE`
- **`AuctionAwardStatus`:**
  - `AWAITING_ACCEPTANCE`: Chờ người mua thứ hai xác nhận đồng ý mua
  - `AWAITING_DEPOSIT`: Người mua thứ hai đã đồng ý nhưng ví chưa đủ 30% cọc -> cần nạp ví
  - `AWAITING_CHECKOUT`: Đã giữ 30% cọc, đang mở cửa sổ 24h thanh toán 70% + phí GHN
  - `PAID`: Đã thanh toán thành công, đã tạo đơn hàng
  - `PAYMENT_DEFAULT`: Quá hạn thanh toán 24h -> mất 30% cọc, trừ 10 điểm uy tín
  - `DECLINED`: Người mua thứ hai chủ động từ chối
  - `BUYER_WITHDRAWN`: Admin xác nhận khách không mua nữa (hoàn cọc nếu đã đóng)
  - `EXPIRED`: Hết hạn lời mời / thanh toán
- **`AuctionComplaintStatus` (dùng khi gọi BE):** `OPEN`, `ACCEPTED`, `REJECTED` _(nhắc lại: không dùng `PENDING` trong query string)_

### 12.2. Enum Thông báo (`backend/prisma/schema.prisma`)

- **`NotificationType`:** `ORDER`, `AUCTION`, `SYSTEM`, `PAYMENT`, `DISPUTE`
- **`NotificationChannel`:** `EMAIL`, `PUSH`, `IN_APP`

### 12.3. Hai điểm lưu ý nhỏ trên Swagger UI (`/api/docs`)

1. Các API Đấu giá được gom ở 3 tag trên Swagger UI do khai báo từng controller:
   - `Auctions` (`AuctionController`: 26 API)
   - `11. AUCTIONS` (`AuctionImageController`: `PATCH /auctions/:id/image`)
   - `Auction checkout` (`AuctionCheckoutController`: 5 API)
2. Hai route lọc không dùng DTO class (`GET /auctions/complaints` và `GET /auctions/admin/awards`) hiện truyền `@Query(...)` trực tiếp nên Swagger UI có thể đánh dấu nhầm là required trên giao diện Try-it-out; thực tế ở Backend cả `auctionId` và `status` đều là **optional**.
