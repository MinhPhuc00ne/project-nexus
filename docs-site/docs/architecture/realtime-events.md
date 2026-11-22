---
title: Sự kiện Realtime (WebSocket)
---

# WebSocket Contracts

Backend cung cấp 3 Socket.IO Gateways (xác thực JWT qua handshake auth/header):

## 1. `/ws/auctions` (`AuctionGateway`)

- **Client → Server**: `auction:join`, `auction:leave`, `auction:bid:place`, `auction:3d:sync`
- **Server → Client**: `auction:bid:placed`, `auction:bid:rejected`, `auction:time_extended` (anti-sniping +2 phút), `auction:ended`, `auction:3d:synced`
- **Lưu ý phân quyền**: Tài khoản `SELLER` đang bật chế độ Người bán (`isSellerActive = true`) chỉ được xem, không được đặt giá (Backend trả lỗi `403`).

## 2. `/ws/chat` (`ChatGateway`)

- Hỗ trợ hội thoại Buyer–Seller (`BUYER_SELLER`), hàng đợi hỗ trợ Staff (`StaffQueueService`), trạng thái online/typing và tin nhắn tự động của Shop (`ChatAutoReply`).

## 3. `/ws/notifications` (`NotificationsGateway`)

- **Events**: `notification:connected`, `notification:new`, `notification:unread_count`
- Tự động đẩy thông báo in-app và đồng bộ badge chưa đọc khi `PrismaService` ghi `Notification` mới.
