# Project Nexus - API Specifications

This directory contains specifications and endpoint definitions for the entire Nexus platform, covering both HTTP REST APIs and real-time WebSocket contracts.

---

## 1. API Design Standards

### 1.1 RESTful Conventions

- All RESTful endpoints are versioned with the `/api/v1` prefix.
- Plural nouns for resource identification (for example, `/api/v1/auctions`, `/api/v1/products`).
- HTTP Methods:
  - `GET`: Read resource representations.
  - `POST`: Create new resources or execute non-idempotent operations.
  - `PUT`: Full replacement of resource state.
  - `PATCH`: Partial attribute updates (such as toggling seller mode).
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

### 1.2 OpenAPI and Swagger Documentation

The modular NestJS backend generates live interactive Swagger UI documentation at:

- Local workstation: `http://localhost:3000/api/docs`

---

## 2. Core REST Endpoint Matrix by Domain

### 2.1 Auth and Users (`/api/v1/auth`, `/api/v1/users`)

| Method  | Path                           | Description                                         | Access        |
| :------ | :----------------------------- | :-------------------------------------------------- | :------------ |
| `POST`  | `/api/v1/auth/register`        | Register new Buyer account                          | Public        |
| `POST`  | `/api/v1/auth/login`           | Authenticate credentials and issue JWT tokens       | Public        |
| `POST`  | `/api/v1/auth/refresh`         | Rotate expired access token using refresh token     | Public        |
| `GET`   | `/api/v1/users/me`             | Fetch authenticated user profile and wallet balance | Authenticated |
| `PATCH` | `/api/v1/users/toggle-seller`  | Switch between Buyer and Seller modes               | Authenticated |
| `POST`  | `/api/v1/users/wallet/deposit` | Initiate wallet balance deposit                     | Authenticated |
| `GET`   | `/api/v1/users/:id/reputation` | Inspect user reputation score and trust level       | Public        |

### 2.2 Catalog (`/api/v1/catalog`)

| Method | Path                           | Description                                 | Access |
| :----- | :----------------------------- | :------------------------------------------ | :----- |
| `GET`  | `/api/v1/catalog/products`     | Search and filter products with pagination  | Public |
| `GET`  | `/api/v1/catalog/products/:id` | Fetch product details and 3D asset metadata | Public |
| `POST` | `/api/v1/catalog/products`     | Create product listing (Seller only)        | Seller |
| `GET`  | `/api/v1/catalog/categories`   | Fetch 3-level category hierarchy            | Public |

### 2.3 Commerce and Orders (`/api/v1/commerce`)

| Method   | Path                              | Description                                           | Access   |
| :------- | :-------------------------------- | :---------------------------------------------------- | :------- |
| `GET`    | `/api/v1/commerce/cart`           | Get active user cart with revalidated pricing         | Buyer    |
| `POST`   | `/api/v1/commerce/cart/items`     | Add or update cart item                               | Buyer    |
| `DELETE` | `/api/v1/commerce/cart/items/:id` | Remove item from cart                                 | Buyer    |
| `POST`   | `/api/v1/commerce/checkout`       | Create order from cart with idempotency key           | Buyer    |
| `POST`   | `/api/v1/commerce/orders/:id/pay` | Initialize PayOS, Wallet, or COD payment registration | Buyer    |
| `POST`   | `/api/v1/commerce/webhooks/payos` | PayOS VietQR payment confirmation webhook             | External |

### 2.4 Fulfillment and Logistics (`/api/v1/fulfillment`)

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

### 2.6 Backoffice and Disputes (`/api/v1/backoffice`)

| Method | Path                                      | Description                             | Access        |
| :----- | :---------------------------------------- | :-------------------------------------- | :------------ |
| `POST` | `/api/v1/backoffice/disputes`             | Open dispute against an escrow release  | Buyer         |
| `GET`  | `/api/v1/backoffice/disputes`             | List active dispute cases               | Staff / Admin |
| `POST` | `/api/v1/backoffice/disputes/:id/resolve` | Adjudicate dispute (refund or disburse) | Staff / Admin |

### 2.7 Notifications (`/api/v1/notifications`)

| Method  | Path                                | Description                               | Access        |
| :------ | :---------------------------------- | :---------------------------------------- | :------------ |
| `GET`   | `/api/v1/notifications`             | Fetch user notification history           | Authenticated |
| `PATCH` | `/api/v1/notifications/:id/read`    | Mark notification as read                 | Authenticated |
| `GET`   | `/api/v1/notifications/preferences` | Inspect user channel delivery preferences | Authenticated |

### 2.8 Staff Management and Onboarding (`/api/v1/admin/staff`, `/api/v1/staff`)

| Method | Path                            | Description                                                                                           | Access |
| :----- | :------------------------------ | :---------------------------------------------------------------------------------------------------- | :----- |
| `POST` | `/api/v1/admin/staff/invite`    | Admin submits staff candidate details; system provisions `@staff.com` and dispatches invitation email | Admin  |
| `GET`  | `/api/v1/staff/invitation-info` | Staff verifies invitation token; views candidate name, phone, and assigned corporate email            | Public |
| `POST` | `/api/v1/staff/activate`        | Staff confirms personal information and sets account password to complete onboarding                  | Public |
| `POST` | `/api/v1/auth/login`            | Staff logs in with `@staff.com` credentials under the `SUPPORT_STAFF` role                            | Public |

### 2.9 Wallet and Withdrawal Management (`/api/v1/seller/finance`, `/api/v1/admin/withdrawals`)

| Method  | Path                                   | Description                                                                    | Access        |
| :------ | :------------------------------------- | :----------------------------------------------------------------------------- | :------------ |
| `GET`   | `/api/v1/seller/finance/revenue`       | Retrieve revenue overview, liquid wallet balance, and locked escrow funds      | Seller, Admin |
| `POST`  | `/api/v1/seller/finance/withdraw`      | Submit withdrawal request; locks funds and schedules 3-to-7-day disbursement   | Seller, Admin |
| `GET`   | `/api/v1/seller/finance/withdrawals`   | Inspect submitted withdrawal request history and status                        | Seller, Admin |
| `GET`   | `/api/v1/seller/finance/transactions`  | View wallet balance transaction history (Deposit, Withdrawal, Escrow)          | Seller, Admin |
| `GET`   | `/api/v1/admin/withdrawals`            | Admin lists withdrawal requests filtered by status                             | Admin         |
| `PATCH` | `/api/v1/admin/withdrawals/:id/review` | Admin approves payout or rejects with a reason, refunding 100% of locked funds | Admin         |

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
| `auction:time_extended` | Entire Room       | Notifies clients of anti-sniping duration extension (+2 minutes)     |
| `auction:ended`         | Entire Room       | Notifies room that bidding has concluded and announces winner        |
| `auction:3d:updated`    | Entire Room       | Synchronizes WebGL camera and rotation coordinates                   |
