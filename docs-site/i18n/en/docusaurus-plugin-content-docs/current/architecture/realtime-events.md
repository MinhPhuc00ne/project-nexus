---
title: Realtime Events (WebSocket)
---

# WebSocket Contracts

The backend exposes 3 JWT-authenticated Socket.IO gateways:

## 1. `/ws/auctions` (`AuctionGateway`)

- **Client → Server**: `auction:join`, `auction:leave`, `auction:bid:place`, `auction:3d:sync`
- **Server → Client**: `auction:bid:placed`, `auction:bid:rejected`, `auction:time_extended` (+2m anti-sniping), `auction:ended`, `auction:3d:synced`
- **Role Guard**: `SELLER` accounts with `isSellerActive = true` are view-only and receive `403` if attempting to bid.

## 2. `/ws/chat` (`ChatGateway`)

- Powers Buyer–Seller chat (`BUYER_SELLER`), Staff support queue (`StaffQueueService`), presence/typing indicators, and shop auto-replies (`ChatAutoReply`).

## 3. `/ws/notifications` (`NotificationsGateway`)

- **Events**: `notification:connected`, `notification:new`, `notification:unread_count`
- Pushes real-time in-app notifications and unread badge updates whenever `PrismaService` creates a new `Notification`.
