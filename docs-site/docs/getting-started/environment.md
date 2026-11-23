---
title: Biến môi trường
---

# Cấu hình Biến môi trường

Project Nexus sử dụng file `.env` tại thư mục gốc monorepo (được `ConfigModule.forRoot({ envFilePath: ['.env', '../.env'] })` nạp tự động cho Backend) và biến tiền tố `VITE_*` cho Frontend. Tham khảo mẫu chuẩn tại `.env.example`.

## 1. Cơ sở dữ liệu & Cache (PostgreSQL 17 & Redis 7)

| Biến                | Giá trị mẫu (`.env.example`)                                                      | Bắt buộc | Mô tả                                                 |
| :------------------ | :-------------------------------------------------------------------------------- | :------- | :---------------------------------------------------- |
| `NODE_ENV`          | `development`                                                                     | Có       | Chế độ vận hành (`development`, `test`, `production`) |
| `POSTGRES_USER`     | `postgres`                                                                        | Có       | Tên user PostgreSQL trong Docker                      |
| `POSTGRES_PASSWORD` | `nexus_secret_2026`                                                               | Có       | Mật khẩu PostgreSQL                                   |
| `POSTGRES_DB`       | `nexus_main`                                                                      | Có       | Tên database chính                                    |
| `POSTGRES_PORT`     | `5432`                                                                            | Có       | Cổng PostgreSQL                                       |
| `DATABASE_URL`      | `postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public` | Có       | Connection string cho Prisma 7                        |
| `REDIS_HOST`        | `localhost`                                                                       | Có       | Host Redis                                            |
| `REDIS_PORT`        | `6379`                                                                            | Có       | Cổng Redis                                            |
| `REDIS_PASSWORD`    | _(trống)_                                                                         | Không    | Mật khẩu Redis (nếu bật auth)                         |
| `REDIS_URL`         | `redis://localhost:6379`                                                          | Có       | Connection URL cho Redis client & distributed lock    |

## 2. Xác thực JWT, OAuth & Server

| Biến                       | Giá trị mẫu                                         | Bắt buộc | Mô tả                                                       |
| :------------------------- | :-------------------------------------------------- | :------- | :---------------------------------------------------------- |
| `JWT_SECRET`               | `super-secret-jwt-key-...`                          | Có       | Khóa ký Access Token (bắt buộc đổi khi lên production)      |
| `JWT_EXPIRES_IN`           | `7d`                                                | Có       | Thời hạn Access Token                                       |
| `REFRESH_TOKEN_SECRET`     | `super-secret-refresh-key-...`                      | Có       | Khóa ký Refresh Token                                       |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d`                                               | Có       | Thời hạn Refresh Token (rotation trong bảng `RefreshToken`) |
| `PORT_BACKEND`             | `3000`                                              | Có       | Cổng HTTP & WebSocket của NestJS                            |
| `FRONTEND_URL`             | `http://localhost:5173`                             | Có       | Origin cho CORS và redirect link trong email / OAuth        |
| `GOOGLE_CLIENT_ID`         | `your-google-client-id`                             | Tùy chọn | Client ID cho Google OAuth 2.0                              |
| `GOOGLE_CLIENT_SECRET`     | `your-google-client-secret`                         | Tùy chọn | Client Secret cho Google OAuth 2.0                          |
| `GOOGLE_CALLBACK_URL`      | `http://localhost:3000/api/v1/auth/google/callback` | Tùy chọn | Callback URL đã đăng ký trên Google Cloud Console           |

## 3. Thanh toán (PayOS) & Vận chuyển (GHN Express)

| Biến                 | Giá trị mẫu                                             | Bắt buộc  | Mô tả                                                   |
| :------------------- | :------------------------------------------------------ | :-------- | :------------------------------------------------------ |
| `PAYOS_CLIENT_ID`    | `your-payos-client-id`                                  | Tùy chọn* | Mã định danh tích hợp PayOS VietQR                      |
| `PAYOS_API_KEY`      | `your-payos-api-key`                                    | Tùy chọn* | API Key tạo link thanh toán PayOS                       |
| `PAYOS_CHECKSUM_KEY` | `your-payos-checksum-key`                               | Tùy chọn* | Khóa HMAC xác thực chữ ký PayOS Webhook                 |
| `GHN_API_URL`        | `https://dev-online-gateway.ghn.vn/shiip/public-api/v2` | Có        | Endpoint GHN Sandbox hoặc Production                    |
| `GHN_TOKEN`          | `your-ghn-sandbox-token`                                | Tùy chọn* | Token tích hợp Giao Hàng Nhanh                          |
| `GHN_SHOP_ID`        | `123456`                                                | Tùy chọn* | Shop ID mặc định trên GHN                               |
| `GHN_CLIENT_ID`      | `123456`                                                | Tùy chọn* | Client ID GHN                                           |
| `GHN_WEBHOOK_SECRET` | `nexus_ghn_webhook_secret_2026`                         | Có        | Secret xác thực webhook cập nhật trạng thái vận đơn GHN |

_\*Ghi chú_: Khi chạy local không có key thật, các luồng thanh toán Ví nội bộ / COD vẫn hoạt động đầy đủ; luồng PayOS hoặc GHN sandbox cần key hợp lệ nếu kiểm thử tích hợp thực tế.

## 4. Quy tắc Nghiệp vụ, Media, Mail & AI Chatbot

| Biến                                                                | Giá trị mẫu                    | Mô tả                                                               |
| :------------------------------------------------------------------ | :----------------------------- | :------------------------------------------------------------------ |
| `PLATFORM_FEE_PERCENTAGE`                                           | `7.0`                          | Tỷ lệ phí sàn mặc định (%) khấu trừ khi giải ngân Escrow            |
| `AUCTION_ANTI_SNIPING_TRIGGER_MINUTES`                              | `2`                            | Ngưỡng phút cuối kích hoạt chống bắn tỉa đấu giá                    |
| `AUCTION_ANTI_SNIPING_EXTEND_MINUTES`                               | `5`                            | Thời gian tối đa/tham số gia hạn cấu hình qua env                   |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET`                  | `your-*`                       | Lưu trữ media cloud (nếu bỏ trống sẽ fallback về local `/uploads`)  |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | `smtp.gmail.com` (`465`)       | Gửi email OTP xác thực, đặt lại mật khẩu và thư mời kích hoạt Staff |
| `CHATBOT_AI_ENABLED`                                                | `true`                         | Bật/tắt trợ lý AI Chatbot                                           |
| `GEMINI_API_KEY`                                                    | `your-gemini-api-key`          | API Key cho Google Gemini                                           |
| `CHATBOT_GEMINI_MODEL`                                              | `gemini-3.1-flash-lite`        | Model Gemini sử dụng cho `ChatbotAiService`                         |
| `VITE_API_URL`                                                      | `http://localhost:3000/api/v1` | Base URL cho Axios client trên Frontend                             |
