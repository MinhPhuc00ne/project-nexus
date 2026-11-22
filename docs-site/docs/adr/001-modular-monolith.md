---
title: 'ADR-001: Modular Monolith Level 1.5'
---

# ADR-001: Kiến trúc Modular Monolith Level 1.5

- **Trạng thái**: Đã chấp nhận (Accepted)
- **Ngày quyết định**: Giai đoạn Refactor Kiến trúc Phase 2

## Bối cảnh (Context)

Project Nexus tích hợp nhiều miền nghiệp vụ liên kết chặt chẽ về dữ liệu và tính nhất quán giao dịch (Auth, Users/Wallet, Catalog/Inventory, Commerce/Escrow, Auction, Fulfillment, Chat). Các luồng như Checkout hay Đặt giá đấu giá đòi hỏi cập nhật nguyên tử qua nhiều bảng dữ liệu (ví dụ: khóa tồn kho + tạo đơn + giữ tiền Escrow + ghi sổ cái ví).

## Các phương án đã cân nhắc

1. **Microservices thuần túy**: Mỗi domain chạy một service & DB riêng; cần Saga/Outbox phân tán để đảm bảo nhất quán, tăng độ phức tạp hạ tầng và độ trễ mạng.
2. **Monolith truyền thống không ranh giới**: Code trộn lẫn giữa các module, dễ phát sinh phụ thuộc vòng và khó bảo trì khi team mở rộng.
3. **Modular Monolith Level 1.5 (Đã chọn)**: Một tiến trình NestJS và một PostgreSQL database, nhưng chia thành 10 module cô lập với ranh giới import rõ ràng và Event Bus nội bộ (`EventEmitter2`).

## Quyết định (Decision)

Áp dụng **NestJS Modular Monolith Level 1.5**:

- 10 domain modules (`auth`, `users`, `catalog`, `commerce`, `auction`, `fulfillment`, `chat`, `notifications`, `admin`, `media`) chỉ giao tiếp qua Public exported Services hoặc `EventEmitter2`.
- Toàn bộ thao tác đa bảng nhạy cảm tài chính/tồn kho dùng chung `prisma.$transaction()`.

## Hệ quả (Consequences)

- **Tích cực**: Đảm bảo ACID tuyệt đối không cần Saga phân tán; debug/deploy đơn giản trên Docker Compose; build & test nhanh với Turborepo.
- **Lưu ý**: Cần tuân thủ kỷ luật không import chéo internal service hoặc truy cập bảng của module khác tùy tiện để giữ khả năng tách service trong tương lai.
