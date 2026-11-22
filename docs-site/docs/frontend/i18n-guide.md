---
title: Hướng dẫn Đa ngôn ngữ (i18n)
---

# Hệ thống Đa ngôn ngữ (`i18next` + `react-i18next`)

Frontend áp dụng kiến trúc i18n theo **namespace domain** (`frontend/src/i18n/`), giữ nguyên URL hiện tại (mặc định `vi`), đồng bộ thuộc tính `<html lang>` và tự động gửi header `Accept-Language` trong mọi request Axios.

## 1. Cấu trúc Thư mục & 10 Namespaces

```text
frontend/src/i18n/
├── config.ts                 # SUPPORTED_LANGUAGES, normalizeLanguage() ('en-US' -> 'en', fallback 'vi')
├── formatters.ts             # formatCurrency(amount, lang), formatDateTime() theo Intl locale
├── index.ts                  # Khởi tạo i18next, LanguageDetector, lắng nghe languageChanged -> document.documentElement.lang
└── locales/
    ├── vi/                   # 10 file JSON tiếng Việt
    └── en/                   # 10 file JSON tiếng Anh
```

| Namespace  | Phạm vi sử dụng                                                              |
| :--------- | :--------------------------------------------------------------------------- |
| `common`   | Điều hướng, footer, toast, trạng thái loading, report modal, nhãn chung      |
| `errors`   | Thông báo lỗi dịch vụ (`services.*`) và ánh xạ `errorCode` từ Backend        |
| `auth`     | Đăng nhập, đăng ký, OTP, quên/đặt lại mật khẩu                               |
| `guest`    | Trang chủ, tìm kiếm, danh mục, chi tiết sản phẩm & shop                      |
| `auction`  | Phòng đấu giá 3D, đặt giá, lịch sử lô, khiếu nại                             |
| `commerce` | Giỏ hàng, checkout, PayOS/Ví/COD, hủy & trả hàng                             |
| `buyer`    | Cổng Buyer: đơn hàng, ví, uy tín, sổ địa chỉ, thông báo                      |
| `seller`   | Cổng Seller: form sản phẩm, tồn kho, đơn hàng GHN, ký gửi đấu giá, tài chính |
| `staff`    | Cổng Staff: hộp thư hỗ trợ, duyệt seller, tranh chấp, banner, FAQ            |
| `admin`    | Cổng Admin: quản trị toàn sàn, hoàn tiền, cấu hình hệ thống                  |

## 2. Kiểm tra Parity Tự động (`npm run i18n:check`)

Script `frontend/scripts/check-i18n-parity.mjs` xác minh:

1. Mọi file JSON trong `vi/` đều tồn tại tương ứng trong `en/` và ngược lại.
2. Toàn bộ key lồng nhau (nested keys) khớp 100% giữa hai ngôn ngữ.
3. Toàn bộ biến nội suy `{{variable}}` khớp chính xác, không bị dịch sai tên biến.

## 3. Quy trình Thêm một Ngôn ngữ Mới (VD: Tiếng Nhật `ja`)

1. Sao chép thư mục `frontend/src/i18n/locales/vi/` thành `frontend/src/i18n/locales/ja/` và dịch đầy đủ 10 file JSON.
2. Đăng ký `{ code: 'ja', label: '日本語', shortLabel: 'JA', intlLocale: 'ja-JP' }` trong `frontend/src/i18n/config.ts`.
3. Import bộ JSON `ja` vào `resources` trong `frontend/src/i18n/index.ts`.
4. Chạy `npm run i18n:check` và `npm run test --workspace=frontend` để xác nhận không sót key hoặc lỗi formatter.
