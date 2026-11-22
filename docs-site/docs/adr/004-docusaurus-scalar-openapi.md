---
title: 'ADR-004: Docusaurus v3 & Scalar OpenAPI'
---

# ADR-004: Cổng Tài liệu Docusaurus v3 + Scalar OpenAPI

- **Trạng thái**: Đã chấp nhận (Accepted)
- **Bối cảnh**: Thư mục `docs/` Markdown thuần cũ bị phân mảnh và lệch so với mã nguồn (`reputationScore`, các model đấu giá & hậu mãi mới).
- **Quyết định**: Dùng Docusaurus v3 (song ngữ `vi`/`en`, Mermaid, Local Search) làm Single Source of Truth, tự động xuất `nexus-openapi.json` từ NestJS Swagger và hiển thị qua `@scalar/api-reference-react`, kèm `docs:check` chống lệch trong CI.
- **Hệ quả**: Tài liệu API luôn khớp 100% với controller/DTO, giảm thiểu tình trạng tài liệu chết.
