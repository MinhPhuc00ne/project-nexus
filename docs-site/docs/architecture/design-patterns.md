---
title: Design Patterns
---

# Design Patterns (Backend & Frontend)

## 1. Backend Patterns (NestJS 12)

1. **Inversion of Control & Dependency Injection**: Toàn bộ service/repository nhận dependency qua constructor, dễ dàng mock khi viết unit test với `node:test`.
2. **Unit of Work (`prisma.$transaction`)**: Mọi nghiệp vụ ghi đa bảng (đặt hàng, giữ escrow, hủy/hoàn tiền, đặt giá đấu giá) thực thi trong transaction nguyên tử.
3. **Strategy Pattern cho Thanh toán & Vận chuyển**: Tách biệt nhà cung cấp qua interface chung (`PayosService`, `Wallet`, `COD`, `GhnLogisticsService`).
4. **In-Process Domain Events (`@nestjs/event-emitter`)**: Các module giao tiếp bất đồng bộ qua `EventEmitter2` và `@OnEvent()` để tránh phụ thuộc vòng.
5. **Distributed & Pessimistic Row Locking**: Dùng `SELECT ... FOR UPDATE` trong PostgreSQL kết hợp Redis lock để chống race condition khi đặt giá hoặc trừ tồn kho.

## 2. Frontend Patterns (React 19)

1. **Shared Contracts (`@nexus/types`)**: Import trực tiếp Enum, DTO và WebSocket event names từ một nguồn duy nhất.
2. **In-Flight Request Deduplication & Cross-Tab Sync**: `AuthContext` giữ promise đang chạy để tránh gọi `/users/me` trùng lặp và lắng nghe `storage` event để đồng bộ đăng nhập/đăng xuất giữa các tab.
3. **Data-Driven Navigation**: Menu điều hướng các cổng (Buyer, Seller, Staff, Admin) được tách thành mảng cấu hình kèm key `i18n`.
4. **WebGL Scene Lifecycle**: Quản lý khởi tạo và giải phóng tài nguyên (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) khi unmount, tự động fallback về bệ trưng bày 3D dán ảnh 2D nếu thiếu file `.glb`.
