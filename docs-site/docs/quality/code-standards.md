---
title: Chuẩn Code & Sonar Quality Gate
---

# Tiêu chuẩn Code & Sonar Quality Gate

Dự án áp dụng mô hình kiểm soát chất lượng **3 tầng**:

1. **Tầng 1 (IDE Realtime)**: VS Code gợi ý cài `SonarSource.sonarlint-vscode` qua `.vscode/extensions.json` và `.vscode/settings.json`.
2. **Tầng 2 (Lint & Pre-commit Gate)**: `eslint.config.mjs` tích hợp `eslint-plugin-sonarjs` kết hợp Prettier, Husky và `commitlint`.
3. **Tầng 3 (Đầu nối sẵn cho Dashboard online)**: File `sonar-project.properties` và template `infra/templates/sonarcloud.yml.example` sẵn sàng kích hoạt khi dự án kết nối SonarQube Server hoặc SonarQube Cloud.
