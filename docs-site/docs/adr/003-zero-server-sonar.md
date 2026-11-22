---
title: 'ADR-003: Zero-Server 3-Tier Sonar Quality'
---

# ADR-003: Kiểm soát Chất lượng 3 Tầng không cần Server

- **Trạng thái**: Đã chấp nhận (Accepted)
- **Bối cảnh**: Repo hiện lưu trên Git host tự host (không có project runner riêng để chạy SonarQube Server/Cloud).
- **Quyết định**: Triển khai Tầng 1 (VS Code SonarLint), Tầng 2 (`eslint-plugin-sonarjs` + `lcov` coverage từ `node:test` và Vitest), và chuẩn bị sẵn đầu nối Tầng 3 (`sonar-project.properties` + `infra/templates/sonarcloud.yml.example`).
- **Hệ quả**: Đạt phần lớn lợi ích bắt bug/code smell của Sonar ngay trên máy dev và CI với chi phí hạ tầng bằng 0, sẵn sàng nâng cấp lên SonarQube Cloud khi cần.
