---
title: 'ADR-002: Kiến trúc Đa ngôn ngữ Frontend'
---

# ADR-002: Đa ngôn ngữ Frontend không đổi URL (`i18next`)

- **Trạng thái**: Đã chấp nhận (Accepted)
- **Bối cảnh**: Hệ thống có 5 cổng phân quyền, Google OAuth callback, notification `targetUrl`, và chatbot navigation gắn trực tiếp với đường dẫn URL hiện tại.
- **Quyết định**: Dùng `i18next` + `react-i18next` với 10 domain namespaces (`vi`/`en`), lưu ngôn ngữ vào `localStorage`, giữ nguyên URL, đồng bộ `<html lang>`, gửi `Accept-Language` qua Axios, map `errorCode` từ Backend, và kiểm tra đối xứng bằng `npm run i18n:check`.
- **Hệ quả**: Không làm gãy OAuth/deep-link, dễ dàng mở rộng thêm ngôn ngữ thứ 3, 4 chỉ bằng cách thêm thư mục `locales/{lang}/`.
