---
title: Realtime Events (WebSocket)
---

# WebSocket Contracts (Socket.IO 4)

The Backend exposes 3 isolated Socket.IO Gateways, all authenticating JWT tokens via the WebSocket handshake (`auth.token` or `Authorization: Bearer <token>`), with event constants shared through `@nexus/types`.

## 1. `/ws/auctions` (`AuctionGateway`)

Powers real-time 3D auction rooms, instant bid broadcasts, anti-sniping extensions, and 3D viewport synchronization.

| Direction       | Event Name              | Payload / Description                                                                          |
| :-------------- | :---------------------- | :--------------------------------------------------------------------------------------------- |
| Client → Server | `auction:join`          | `{ auctionId }` — Join an auction session room                                                 |
| Client → Server | `auction:leave`         | `{ auctionId }` — Leave an auction session room                                                |
| Client → Server | `auction:bid:place`     | `{ auctionId, itemId, amount }` — Submit a bid (requires authenticated Buyer mode)             |
| Client → Server | `auction:3d:sync`       | `{ auctionId, itemId, rotation, camera }` — Broadcast 3D model camera and rotation state       |
| Server → Client | `auction:bid:placed`    | Broadcast to room when a valid bid is persisted                                                |
| Server → Client | `auction:bid:rejected`  | Sent to bidder on validation or authorization failure (e.g., `403` when `isSellerActive=true`) |
| Server → Client | `auction:time_extended` | Broadcast when anti-sniping triggers in the final 2 minutes                                    |
| Server → Client | `auction:ended`         | Broadcast when a lot or auction session closes                                                 |
| Server → Client | `auction:3d:synced`     | Relays synchronized 3D viewport state to room participants                                     |

> RBAC Rule: A `SELLER` account with `isSellerActive = true` is restricted to read-only observation in auction rooms; `auction:bid:place` requests are rejected with `403`.

## 2. `/ws/chat` (`ChatGateway`)

Powers Buyer–Seller messaging, the Staff support queue, and Shop auto-replies.

- Buyer–Seller Conversations (`BUYER_SELLER`): Room join, text and image message delivery, read receipts (`markAsRead`), and typing indicators.
- Staff Support Queue (`StaffQueueService`): Routes support tickets into the `SUPPORT_STAFF` queue with claim, transfer, and resolution states.
- Shop Auto-Replies (`ChatAutoReply`): Dispatches automated shop and system responses; Admin can audit conversations via `admin-chat.controller.ts`.

## 3. `/ws/notifications` (`NotificationsGateway`)

Delivers real-time in-app notifications to per-user rooms (`user:<userId>`).

| Event Name                  | Description                                                                                                  |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `notification:connected`    | Confirms authenticated socket handshake                                                                      |
| `notification:new`          | Emitted automatically whenever `PrismaService` persists a new `Notification` (via `NotificationRealtimeBus`) |
| `notification:unread_count` | Synchronizes the unread badge count in the Frontend Header                                                   |
