---
title: 'ADR-003: Zero-Server Sonar Quality Gate'
---

# ADR-003: Kiểm soát Chất lượng 3 Tầng Zero-Server Sonar

- **Trạng thái**: Đã chấp nhận (Accepted)

## Bối cảnh (Context)

Đội ngũ cần kiểm soát code smells, độ phức tạp nhận thức (cognitive complexity), lỗi bảo mật và coverage theo chuẩn SonarQube nhưng chưa triển khai máy chủ SonarQube Server tập trung trong giai đoạn phát triển local.

## Quyết định (Decision)

Triển khai kiến trúc **Zero-Server Sonar Quality Gate** gồm 3 tầng:

1. **Tầng 1 (IDE Realtime)**: Khuyến nghị `SonarSource.sonarlint-vscode` trong `.vscode/extensions.json` & `.vscode/settings.json`.
2. **Tầng 2 (Local & CI Lint Gate)**: Tích hợp `eslint-plugin-sonarjs` trực tiếp vào `eslint.config.mjs`, kết hợp Prettier, Husky (`pre-commit` + `commit-msg` commitlint) và script `npm run test:coverage` xuất `lcov.info`.
3. **Tầng 3 (Online Dashboard Ready)**: Chuẩn bị sẵn `sonar-project.properties` và `infra/templates/sonarcloud.yml.example` để bật SonarQube Cloud/Server chỉ bằng việc nạp `SONAR_TOKEN`.

## Hệ quả (Consequences)

- **Tích cực**: Chặn code smell và lỗi ngay tại IDE và commit hook với chi phí hạ tầng bằng 0; không phụ thuộc server ngoài khi dev offline.
- **Lưu ý**: Cần duy trì chạy `npm run lint` và `npm run test:coverage` trước mọi Merge Request.
