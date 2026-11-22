---
title: Realtime Events (WebSocket)
---

# WebSocket Gateways

The backend exposes 3 Socket.IO gateways across dedicated namespaces:

| Namespace           | Gateway                | Responsibilities                                                                    |
| :------------------ | :--------------------- | :---------------------------------------------------------------------------------- |
| `/ws/auctions`      | `AuctionGateway`       | Room membership, real-time bidding, countdown & anti-sniping sync, 3D viewport sync |
| `/ws/chat`          | `ChatGateway`          | Buyer–Seller chat, Staff support queue, presence and typing indicators              |
| `/ws/notifications` | `NotificationsGateway` | Real-time in-app notifications and unread badge sync (`unreadCount`)                |
