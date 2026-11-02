# Project Nexus - API Specifications

This directory contains specifications and endpoint definitions for the entire Nexus platform, covering both HTTP REST APIs and real-time WebSocket contracts.

---

## 1. API Design Standards

### 1.1 RESTful Conventions

- All RESTful endpoints are versioned with the `/api/v1` prefix.
- Plural nouns for resource identification (e.g., `/api/v1/auctions`, `/api/v1/products`).
- HTTP Methods:
  - `GET`: Read resource representations.
  - `POST`: Create new resources or execute non-idempotent operations.
  - `PUT`: Full replacement of resource state.
  - `PATCH`: Partial attribute updates (e.g., toggling seller mode).
  - `DELETE`: Soft or hard removal of resources.
- Unified Response Schema:

  ```json
  {
    "statusCode": 200,
    "message": "Operation successful",
    "data": { ... },
    "timestamp": "2026-10-03T12:00:00.000Z",
    "traceId": "req-9a8b-7c6d"
  }
  ```

### 1.2 OpenAPI / Swagger Documentation

- The monolithic NestJS backend generates live interactive Swagger UI documentation at:
  - Local: `http://localhost:3000/api/docs`

---

## 2. Core REST Endpoint Matrix by Domain

### 2.1 Auth & Users (`/api/v1/auth`, `/api/v1/users`)

| Method  | Path                           | Description                                       | Access        |
| :------ | :----------------------------- | :------------------------------------------------ | :------------ |
| `POST`  | `/api/v1/auth/register`        | Register new Buyer account                        | Public        |
| `POST`  | `/api/v1/auth/login`           | Authenticate credentials and issue JWT tokens     | Public        |
| `POST`  | `/api/v1/auth/refresh`         | Rotate expired access token using refresh token   | Public        |
| `GET`   | `/api/v1/users/me`             | Fetch authenticated user profile & wallet balance | Authenticated |
| `PATCH` | `/api/v1/users/toggle-seller`  | Seamlessly switch between Buyer and Seller modes  | Authenticated |
| `POST`  | `/api/v1/users/wallet/deposit` | Initiate wallet balance deposit                   | Authenticated |
| `GET`   | `/api/v1/users/:id/reputation` | Inspect user reputation score and trust level     | Public        |

### 2.2 Catalog (`/api/v1/catalog`)

| Method | Path                           | Description                                | Access |
| :----- | :----------------------------- | :----------------------------------------- | :----- |
| `GET`  | `/api/v1/catalog/products`     | Search and filter products with pagination | Public |
| `GET`  | `/api/v1/catalog/products/:id` | Fetch product details & 3D asset metadata  | Public |
| `POST` | `/api/v1/catalog/products`     | Create product listing (Seller only)       | Seller |
| `GET`  | `/api/v1/catalog/categories`   | Fetch 3-level category hierarchy           | Public |

### 2.3 Commerce & Orders (`/api/v1/commerce`)

| Method   | Path                              | Description                                          | Access   |
| :------- | :-------------------------------- | :--------------------------------------------------- | :------- |
| `GET`    | `/api/v1/commerce/cart`           | Get active user cart with revalidated pricing        | Buyer    |
| `POST`   | `/api/v1/commerce/cart/items`     | Add or update cart item                              | Buyer    |
| `DELETE` | `/api/v1/commerce/cart/items/:id` | Remove item from cart                                | Buyer    |
| `POST`   | `/api/v1/commerce/checkout`       | Create order from cart with idempotency key          | Buyer    |
| `POST`   | `/api/v1/commerce/orders/:id/pay` | Initialize PayOS / Wallet / COD payment registration | Buyer    |
| `POST`   | `/api/v1/commerce/webhooks/payos` | PayOS VietQR payment confirmation webhook            | External |

### 2.4 Fulfillment & Logistics (`/api/v1/fulfillment`)

| Method | Path                                     | Description                                  | Access        |
| :----- | :--------------------------------------- | :------------------------------------------- | :------------ |
| `POST` | `/api/v1/fulfillment/shipping/quote`     | Calculate dynamic GHN shipping fee           | Authenticated |
| `GET`  | `/api/v1/fulfillment/orders/:id/track`   | Track shipment progress with carrier updates | Authenticated |
| `POST` | `/api/v1/fulfillment/orders/:id/confirm` | Buyer confirms receipt without dispute       | Buyer         |

### 2.5 Live Auctions (`/api/v1/auctions`)

| Method | Path                        | Description                                           | Access         |
| :----- | :-------------------------- | :---------------------------------------------------- | :------------- |
| `GET`  | `/api/v1/auctions`          | List scheduled and live auctions with pagination      | Public         |
| `GET`  | `/api/v1/auctions/my`       | List auctions created by the authenticated seller     | Seller         |
| `GET`  | `/api/v1/auctions/my-bids`  | List bids submitted by the authenticated buyer        | Buyer          |
| `GET`  | `/api/v1/auctions/:id`      | Get auction room state and masked bid history         | Public         |
| `POST` | `/api/v1/auctions`          | Create and schedule auction for an owned product      | Seller         |
| `POST` | `/api/v1/auctions/:id/bids` | Place competitive bid with wallet balance reservation | Buyer          |
| `POST` | `/api/v1/auctions/:id/end`  | Finalize auction duration and settle winning bid      | Seller / Admin |

### 2.6 Backoffice & Disputes (`/api/v1/backoffice`)

| Method | Path                                      | Description                             | Access      |
| :----- | :---------------------------------------- | :-------------------------------------- | :---------- |
| `POST` | `/api/v1/backoffice/disputes`             | Open dispute against an escrow release  | Buyer       |
| `GET`  | `/api/v1/backoffice/disputes`             | List active dispute cases               | Staff/Admin |
| `POST` | `/api/v1/backoffice/disputes/:id/resolve` | Adjudicate dispute (refund or disburse) | Staff/Admin |

### 2.7 Notifications (`/api/v1/notifications`)

| Method  | Path                                | Description                               | Access        |
| :------ | :---------------------------------- | :---------------------------------------- | :------------ |
| `GET`   | `/api/v1/notifications`             | Fetch user notification history           | Authenticated |
| `PATCH` | `/api/v1/notifications/:id/read`    | Mark notification as read                 | Authenticated |
| `GET`   | `/api/v1/notifications/preferences` | Inspect user channel delivery preferences | Authenticated |

### 2.8 Staff Management & Onboarding (`/api/v1/admin/staff`, `/api/v1/staff`)

| Method | Path                            | Description                                                                                              | Access |
| :----- | :------------------------------ | :------------------------------------------------------------------------------------------------------- | :----- |
| `POST` | `/api/v1/admin/staff/invite`    | Admin nhập thông tin Staff (Họ tên, mail cá nhân, SĐT) -> Hệ thống cấp `@staff.com`, gửi email xác thực  | Admin  |
| `GET`  | `/api/v1/staff/invitation-info` | Staff kiểm tra token từ email mời -> Xem thông tin Họ tên, SĐT, tài khoản `@staff.com` được cấp          | Public |
| `POST` | `/api/v1/staff/activate`        | Staff xác nhận lại Họ tên, SĐT, tạo & xác nhận mật khẩu mới -> Kích hoạt tài khoản công tác `@staff.com` | Public |
| `POST` | `/api/v1/auth/login`            | Staff đăng nhập bằng tài khoản `@staff.com` và mật khẩu mới tạo với vai trò `SUPPORT_STAFF`              | Public |

### 2.9 Wallet & Withdrawal Management (`/api/v1/seller/finance`, `/api/v1/admin/withdrawals`)

| Method  | Path                                   | Description                                                                                       | Access        |
| :------ | :------------------------------------- | :------------------------------------------------------------------------------------------------ | :------------ |
| `GET`   | `/api/v1/seller/finance/revenue`       | Lấy tổng quan doanh thu, số dư ví khả dụng, tiền tạm khóa                                         | Seller, Admin |
| `POST`  | `/api/v1/seller/finance/withdraw`      | Gửi yêu cầu rút tiền (khóa số dư khả dụng, gửi thông báo giải ngân 3-7 ngày làm việc)             | Seller, Admin |
| `GET`   | `/api/v1/seller/finance/withdrawals`   | Xem lịch sử các yêu cầu rút tiền đã gửi và trạng thái xử lý                                       | Seller, Admin |
| `GET`   | `/api/v1/seller/finance/transactions`  | Xem lịch sử biến động số dư ví (DEPOSIT, WITHDRAW, ESCROW...)                                     | Seller, Admin |
| `GET`   | `/api/v1/admin/withdrawals`            | Admin xem danh sách các yêu cầu rút tiền (lọc theo status PENDING, APPROVED, REJECTED, COMPLETED) | Admin         |
| `PATCH` | `/api/v1/admin/withdrawals/:id/review` | Admin phê duyệt (khấu trừ tiền khóa) hoặc từ chối (hoàn trả 100% về ví khả dụng kèm lý do)        | Admin         |

---

## 3. Real-Time WebSocket Specifications (`/ws/auctions`)

Low-latency bi-directional communication operates via Socket.IO at `/ws/auctions`.

### 3.1 Client-Emitted Events

| Event Name          | Payload Format                                                              | Description                        |
| :------------------ | :-------------------------------------------------------------------------- | :--------------------------------- |
| `auction:join`      | `{ "auctionId": "auc-123" }`                                                | Join room and subscribe to updates |
| `auction:leave`     | `{ "auctionId": "auc-123" }`                                                | Leave auction room                 |
| `auction:bid:place` | `{ "auctionId": "auc-123", "bidAmount": 150.00 }`                           | Submit atomic bid                  |
| `auction:3d:sync`   | `{ "auctionId": "auc-123", "rotation": { "x": 0, "y": 1.2 }, "zoom": 1.0 }` | Broadcast 3D viewport              |

### 3.2 Server-Broadcasted Events

| Event Name              | Broadcast Scope   | Payload Description                                                  |
| :---------------------- | :---------------- | :------------------------------------------------------------------- |
| `auction:bid:placed`    | Entire Room       | Informs room of accepted highest bid and new minimum increment       |
| `auction:bid:rejected`  | Requesting Socket | Informs bidder of failure (outbid, insufficient funds, lock timeout) |
| `auction:timer:sync`    | Entire Room       | Synchronizes server clock and remaining auction duration             |
| `auction:time_extended` | Entire Room       | Notifies clients of anti-sniping duration extension (+5 minutes)     |
| `auction:ended`         | Entire Room       | Notifies room that bidding has concluded and announces winner        |
| `auction:3d:updated`    | Entire Room       | Synchronizes WebGL camera and rotation coordinates                   |
