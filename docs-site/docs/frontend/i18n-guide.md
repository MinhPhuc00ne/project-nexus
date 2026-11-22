---
title: Hướng dẫn Đa ngôn ngữ (i18n)
---

# Hệ thống Đa ngôn ngữ (`i18next` + `react-i18next`)

Frontend sử dụng kiến trúc i18n theo **namespace domain** (`frontend/src/i18n/`), giữ nguyên URL hiện tại (mặc định `vi`), đồng bộ `<html lang>` và tự động gửi header `Accept-Language` trong mọi request Axios.

## 10 Namespaces

`common`, `errors`, `auth`, `guest`, `auction`, `commerce`, `buyer`, `seller`, `staff`, `admin`.

## Cách thêm một ngôn ngữ mới (VD: Tiếng Nhật `ja`)

1. Sao chép thư mục `frontend/src/i18n/locales/vi/` thành `frontend/src/i18n/locales/ja/` và dịch 10 file JSON.
2. Đăng ký `{ code: 'ja', label: '日本語', shortLabel: 'JA', intlLocale: 'ja-JP' }` trong `frontend/src/i18n/config.ts`.
3. Import bộ JSON của `ja` vào `resources` trong `frontend/src/i18n/index.ts`.
4. Chạy `npm run i18n:check` để xác nhận 100% đối xứng key & biến `{{...}}`.
