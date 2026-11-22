---
title: Sự kiện Realtime (WebSocket)
---

# WebSocket Gateways

Backend cung cấp 3 Socket.IO Gateways tách biệt theo namespace:

| Namespace           | Gateway                | Chức năng chính                                                                                 |
| :------------------ | :--------------------- | :---------------------------------------------------------------------------------------------- |
| `/ws/auctions`      | `AuctionGateway`       | Tham gia phòng đấu giá, đặt giá realtime, đồng bộ đếm ngược & anti-sniping, đồng bộ góc nhìn 3D |
| `/ws/chat`          | `ChatGateway`          | Chat Buyer–Seller, hàng đợi hỗ trợ Staff, trạng thái online/typing                              |
| `/ws/notifications` | `NotificationsGateway` | Đẩy thông báo in-app realtime và cập nhật số lượng chưa đọc (`unreadCount`)                     |
