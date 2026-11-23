---
title: 'ADR-004: Docusaurus v3 & Scalar OpenAPI'
---

# ADR-004: Cổng Tài liệu Docusaurus v3 & Scalar OpenAPI

- **Trạng thái**: Đã chấp nhận (Accepted)

## Bối cảnh (Context)

Tài liệu Markdown rời rạc trong repo nhanh chóng lỗi thời so với mã nguồn NestJS/Prisma, thiếu công cụ tìm kiếm, thiếu sơ đồ kiến trúc và không thể thử nghiệm trực tiếp REST API khi Backend không chạy.

## Quyết định (Decision)

- Xây dựng workspace `docs-site/` bằng **Docusaurus v3** hỗ trợ song ngữ `vi` (mặc định) và `en`, bật `@docusaurus/theme-mermaid` và `@easyops-cn/docusaurus-search-local`.
- Nhúng **Scalar OpenAPI Reference** (`docs-site/src/pages/api-reference.tsx`) đọc trực tiếp từ `docs-site/static/openapi/nexus-openapi.json` (được sinh tự động từ NestJS Swagger qua `npm run docs:openapi`).
- Tự động hóa kiểm tra đối xứng song ngữ + hợp lệ OpenAPI qua `npm run docs:check` (`check-docs-parity.mjs`) và đồng bộ lên GitLab Wiki qua `npm run docs:sync-gitlab-wiki`.

## Hệ quả (Consequences)

- **Tích cực**: Tài liệu kiến trúc, ERD, state machines và 229+ API paths luôn đồng bộ trong cùng một cổng tìm kiếm được offline.
- **Lưu ý**: Khi thêm hoặc đổi tên file trong `docs-site/docs/`, phải cập nhật bản dịch tương ứng trong `docs-site/i18n/en/...` để `docs:check` đạt.
