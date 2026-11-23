---
title: Design Patterns
---

# Design Patterns (Backend & Frontend)

Tổng hợp các mẫu thiết kế (Design Patterns) đang được áp dụng nhất quán trong mã nguồn Backend và Frontend của Project Nexus.

## 1. Backend Patterns (`backend/src`)

| Pattern                                  | Áp dụng thực tế                                                                                           | Lợi ích kỹ thuật                                                                                       |
| :--------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Inversion of Control & DI**            | Toàn bộ Service/Controller/Gateway nhận dependency qua constructor NestJS                                 | Dễ dàng mock Prisma/Redis/Mail khi viết unit test với `node:test`                                      |
| **Unit of Work (`prisma.$transaction`)** | `OrderService`, `OrderEscrowService`, `RefundService`, `AuctionService`, `SellerFinanceService`           | Đảm bảo tính nguyên tử (ACID) khi cập nhật đồng thời ví, escrow, tồn kho và đơn hàng                   |
| **Strategy Pattern**                     | Thanh toán (`PayosService`, `WALLET`, `COD`) & Vận chuyển (`GhnLogisticsService`, `RouteDistanceService`) | Dễ mở rộng nhà cung cấp mới mà không sửa luồng checkout cốt lõi                                        |
| **In-Process Domain Events**             | `EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' })`                                          | Tách rời nghiệp vụ chính (đặt hàng, đấu giá) khỏi tác vụ phụ (uy tín, thông báo)                       |
| **Pessimistic + Distributed Lock**       | `SELECT ... FOR UPDATE` trong Postgres kết hợp Redis lock (`AuctionService`)                              | Chống race condition và double-spend khi đặt giá hoặc trừ tồn kho đồng thời                            |
| **Delegate Wrapper**                     | `PrismaService` bọc model `Notification` để phát `NotificationRealtimeBus`                                | Mọi nơi tạo `Notification` qua Prisma tự động đẩy Socket.IO realtime mà không cần gọi gateway thủ công |

## 2. Frontend Patterns (`frontend/src`)

### Shared Contracts (`@nexus/types`)

Frontend và Backend cùng import Enum (`Role`, `OrderStatus`, `AuctionStatus`), DTO và hằng số WebSocket từ `@nexus/types`, loại bỏ hoàn toàn lỗi lệch chuỗi trạng thái giữa FE và BE.

### In-Flight Request Deduplication & Cross-Tab Sync (`AuthContext.tsx`)

- `inFlightPromiseRef` giữ promise `/users/me` đang chạy theo `token` để tránh gọi API trùng lặp khi nhiều component mount đồng thời.
- Lắng nghe `nexus:auth-change` và `storage` event (`nexus:auth-*`) để tự động đồng bộ đăng nhập, đăng xuất và merge giỏ hàng giữa các tab trình duyệt.
- `applyModeOverride()` tự động đối chiếu URL (`/seller/*` ép mode `SELLER`, `/buyer/*` giữ `BUYER`, `isShopSuspended` ép về `BUYER`).

### Token Refresh Queue (`services/api.ts`)

Axios response interceptor bắt lỗi `401`, sử dụng cờ `isRefreshing` và hàng đợi `failedQueue` để chỉ gọi `/auth/refresh` **một lần duy nhất** khi nhiều API request cùng hết hạn token, sau đó replay toàn bộ request đang chờ với token mới.

### Data-Driven Navigation & Security Hardening

- Menu điều hướng các cổng (Buyer, Seller, Staff, Admin) khai báo dạng cấu hình kèm i18n key.
- `resolveNotificationTargetUrl()` (`utils/notificationNavigation.ts`) chuẩn hóa điều hướng thông báo và chặn open-redirect protocol-relative (`//evil.example`).

### WebGL 3D Scene Lifecycle

Component đấu giá 3D quản lý vòng đời Three.js chặt chẽ: giải phóng `geometry.dispose()`, `material.dispose()`, `renderer.dispose()` khi unmount để chống rò rỉ bộ nhớ GPU, đồng thời tự động fallback sang bệ trưng bày 3D dán ảnh 2D khi lô đấu giá chưa có file `.glb`.
