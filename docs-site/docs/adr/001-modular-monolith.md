---
title: 'ADR-001: Modular Monolith Level 1.5'
---

# ADR-001: Kiến trúc Modular Monolith Level 1.5

- **Trạng thái**: Đã chấp nhận (Accepted)
- **Bối cảnh**: Project Nexus tích hợp nhiều miền nghiệp vụ liên kết chặt (Auth, Users/Wallet, Catalog/Inventory, Commerce/Escrow, Auction, Fulfillment, Chat) nhưng đội ngũ phát triển cần tốc độ triển khai nhanh và ACID transaction xuyên bảng.
- **Quyết định**: Áp dụng NestJS Modular Monolith với 10 module cô lập, giao tiếp đồng bộ qua Service public và bất đồng bộ qua `EventEmitter2`, dùng chung PostgreSQL 17 (`prisma.$transaction`) và Redis 7.
- **Hệ quả**: Tránh được độ trễ mạng và bài toán distributed transaction phức tạp của Microservices, đồng thời vẫn giữ ranh giới module sạch để có thể tách service khi cần mở rộng.
