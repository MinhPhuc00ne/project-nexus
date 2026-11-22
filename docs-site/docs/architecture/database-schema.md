---
title: Cơ sở dữ liệu & Prisma Schema
---

# Cơ sở dữ liệu (PostgreSQL 17 + Prisma 7)

Sơ đồ dữ liệu thực tế trong `backend/prisma/schema.prisma` bao gồm các nhóm thực thể chính sau:

```mermaid
erDiagram
    User ||--o| Wallet : owns
    User ||--o{ UserAddress : has
    User ||--o{ Product : sells
    User ||--o{ Order : buys_or_sells
    User ||--o{ ReputationLog : logs
    Category ||--o{ Category : hierarchy_3_levels
    Category ||--o{ Product : categorizes
    Product ||--o{ Inventory : stocks
    Order ||--o{ OrderItem : contains
    Order ||--o| EscrowRecord : holds
    Order ||--o| Shipment : fulfills
    Order ||--o| AfterSalesRequest : after_sales
    Order ||--o| Dispute : disputes
    Auction ||--o{ AuctionItem : lots
    AuctionItem ||--o{ Bid : receives
    AuctionItem ||--o{ AuctionAward : awards
```

## Các nhóm bảng quan trọng (đối chiếu từ `schema.prisma`)

1. **Định danh & Uy tín**: `User`, `UserAddress`, `RefreshToken`, `ReputationLog`, `SellerUpgradeRequest`, `StaffInvitation`.
2. **Ví & Tài chính**: `Wallet`, `WalletTransaction`, `WithdrawalRequest`, `EscrowRecord`, `OrderRefund`.
3. **Catalog & Tồn kho**: `Category` (tối đa 3 cấp), `Product`, `ProductImage`, `ProductOption`, `Warehouse`, `Inventory`, `InventoryReservation`, `InventoryLedger`, `EventBanner`, `BannerDisableHistory`.
4. **Thương mại & Hậu mãi**: `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `AfterSalesRequest`, `Dispute`, `Review`, `ProductReview`, `CustomerReview`.
5. **Đấu giá**: `Auction` (phiên), `AuctionItem` (lô đấu giá kèm chứng thư giám định), `Bid`, `AuctionAward` (`PRIMARY_WINNER` / `SECOND_CHANCE`), `AuctionComplaint`.
6. **Vận chuyển & Chat**: `SellerGhnAccount`, `Shipment`, `ChatConversation`, `ChatMessage`, `ChatAutoReply`, `Notification`, `NotificationPreference`, `ShopActionLog`, `ShopViolation`.
