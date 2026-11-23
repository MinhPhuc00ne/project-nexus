---
title: Sự kiện Realtime (WebSocket)
---

# WebSocket Contracts (Socket.IO 4)

Backend cung cấp **3 Socket.IO Gateways** độc lập, xác thực JWT qua handshake (`auth.token` hoặc `Authorization: Bearer <token>`), với tên sự kiện được định nghĩa dùng chung trong `@nexus/types`.

## 1. `/ws/auctions` (`AuctionGateway`)

Phục vụ phòng đấu giá 3D realtime, cập nhật giá tức thì, chống bắn tỉa và đồng bộ góc nhìn 3D.

| Hướng truyền        | Tên sự kiện             | Payload / Mô tả                                                                                     |
| :------------------ | :---------------------- | :-------------------------------------------------------------------------------------------------- |
| **Client → Server** | `auction:join`          | `{ auctionId }` — Tham gia room phiên đấu giá                                                       |
| **Client → Server** | `auction:leave`         | `{ auctionId }` — Rời room phiên đấu giá                                                            |
| **Client → Server** | `auction:bid:place`     | `{ auctionId, itemId, amount }` — Đặt giá mới (yêu cầu đã xác thực & không ở Seller mode)           |
| **Client → Server** | `auction:3d:sync`       | `{ auctionId, itemId, rotation, camera }` — Đồng bộ góc xoay/camera mô hình 3D                      |
| **Server → Client** | `auction:bid:placed`    | Phát tới toàn room khi giá mới hợp lệ được ghi nhận vào DB                                          |
| **Server → Client** | `auction:bid:rejected`  | Trả về riêng cho client đặt giá lỗi (thiếu cọc, bước giá thấp, hoặc `403` do `isSellerActive=true`) |
| **Server → Client** | `auction:time_extended` | Phát khi kích hoạt anti-sniping (+2 phút cuối tự động gia hạn)                                      |
| **Server → Client** | `auction:ended`         | Phát khi lô hoặc phiên đấu giá kết thúc                                                             |
| **Server → Client** | `auction:3d:synced`     | Phát trạng thái góc nhìn 3D tới người xem trong phòng                                               |

> **Lưu ý phân quyền**: Tài khoản `SELLER` đang bật chế độ Người bán (`isSellerActive = true`) chỉ được xem phòng đấu giá; mọi yêu cầu `auction:bid:place` đều bị từ chối với lỗi `403`.

## 2. `/ws/chat` (`ChatGateway`)

Phục vụ hội thoại trực tiếp Buyer–Seller, hàng đợi hỗ trợ Staff và tin nhắn tự động của Shop.

- **Hội thoại Buyer–Seller (`BUYER_SELLER`)**: Tham gia room hội thoại, gửi/nhận tin nhắn text/ảnh, đánh dấu đã đọc (`markAsRead`) và trạng thái đang gõ (`typing`).
- **Hàng đợi hỗ trợ Staff (`StaffQueueService`)**: Đẩy ticket hỗ trợ mới vào hàng đợi cho `SUPPORT_STAFF`, nhận ticket (`claim`) và chuyển giao/đóng hội thoại.
- **Tin nhắn tự động (`ChatAutoReply`)**: Tự động phản hồi khi Shop bật cấu hình auto-reply hoặc hệ thống gửi thông báo chính sách; Admin có thể audit hội thoại (`admin-chat.controller.ts`).

## 3. `/ws/notifications` (`NotificationsGateway`)

Đẩy thông báo đa kênh in-app theo thời gian thực tới từng User room (`user:<userId>`).

| Sự kiện                     | Mô tả                                                                                                              |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `notification:connected`    | Xác nhận kết nối thành công kèm thông tin user                                                                     |
| `notification:new`          | Đẩy bản ghi `Notification` mới ngay khi `PrismaService` ghi xuống PostgreSQL (thông qua `NotificationRealtimeBus`) |
| `notification:unread_count` | Đồng bộ số lượng thông báo chưa đọc hiển thị trên chuông thông báo Header                                          |
