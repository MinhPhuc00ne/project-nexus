---
title: 'ADR-002: Frontend i18n (Namespace-based)'
---

# ADR-002: Kiến trúc Đa ngôn ngữ Frontend (`vi` / `en`)

- **Trạng thái**: Đã chấp nhận (Accepted)

## Bối cảnh (Context)

Project Nexus phục vụ người dùng Việt Nam và quốc tế trên 5 cổng giao diện khác nhau (`Guest`, `Buyer`, `Seller`, `Staff`, `Admin`). Việc nhúng text tiếng Việt cứng trong component khiến hệ thống không thể đa ngôn ngữ và dễ gây lỗi thiếu key dịch khi phát triển song song.

## Quyết định (Decision)

- Sử dụng `i18next` + `react-i18next` + `i18next-browser-languagedetector`, giữ nguyên URL hiện tại (mặc định `vi`), đồng bộ `<html lang>` và tự động đính kèm header `Accept-Language` trong Axios interceptor (`services/api.ts`).
- Tách từ điển thành **10 namespaces theo domain**: `common`, `errors`, `auth`, `guest`, `auction`, `commerce`, `buyer`, `seller`, `staff`, `admin`.
- Kiểm soát chất lượng tự động bằng script `npm run i18n:check` (`frontend/scripts/check-i18n-parity.mjs`) và bộ unit test Vitest (`i18n.test.ts`).

## Hệ quả (Consequences)

- **Tích cực**: Dễ bảo trì từng domain, không làm phình kích thước file JSON đơn lẻ, đảm bảo 100% đối xứng key và placeholder `{{...}}` giữa `vi` và `en`.
- **Lưu ý**: Mọi text hiển thị mới hoặc mã lỗi `errorCode` từ Backend đều phải bổ sung đồng thời ở cả `vi` và `en` trước khi merge.
