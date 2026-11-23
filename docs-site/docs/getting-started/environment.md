---
title: Biến môi trường
---

# Cấu hình Biến môi trường

Tham khảo file `.env.example` tại thư mục gốc để thiết lập `.env` cho môi trường local:

| Nhóm           | Biến tiêu biểu                                                                 | Mô tả                                                        |
| :------------- | :----------------------------------------------------------------------------- | :----------------------------------------------------------- |
| Database       | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`            | Kết nối PostgreSQL 17 cho Prisma                             |
| Cache          | `REDIS_HOST`, `REDIS_PORT`                                                     | Kết nối Redis 7 cho lock đấu giá & session                   |
| Auth & JWT     | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Xác thực JWT & Google OAuth 2.0                              |
| Thanh toán     | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`                       | Tích hợp PayOS VietQR & xác thực webhook                     |
| Vận chuyển     | `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_API_BASE_URL`                                 | Tích hợp Giao Hàng Nhanh                                     |
| Storage & Mail | `CLOUDINARY_*`, `MAIL_*`                                                       | Upload media & gửi email OTP/Staff invite                    |
| Frontend       | `VITE_API_URL`                                                                 | Base URL cho Axios (mặc định `http://localhost:3000/api/v1`) |
