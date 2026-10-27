# Cấp tài khoản Staff

Admin gọi `POST /api/v1/admin/staff/invite` với `fullName`, `email` cá nhân, `phoneNumber`, `department`. Backend cấp ngay tài khoản đã xác minh, vai trò `SUPPORT_STAFF`, kèm ví. Format giữ nguyên: **Nguyễn Quang Huy → HuyNQ@staff.com**; nếu trùng thì thêm số, ví dụ `HuyNQ2@staff.com`.

Backend sinh mật khẩu ngẫu nhiên bằng `crypto.randomBytes`, chỉ lưu bcrypt hash. Email cá nhân nhận tài khoản, mật khẩu ban đầu và đường dẫn đăng nhập. API chỉ trả thông tin tài khoản, không trả mật khẩu hoặc token kích hoạt. Không ghi mật khẩu hay OTP của staff vào log.

Staff đăng nhập ngay tại trang đăng nhập chung. Khi muốn đặt mật khẩu riêng:

1. Chọn **Quên mật khẩu**, nhập tài khoản công tác `HuyNQ@staff.com`.
2. Backend gửi OTP về email cá nhân đã liên kết. OTP hết hạn sau 10 phút; thời gian chờ gửi lại là 60 giây.
3. Nhập OTP và mật khẩu mới theo luồng quên mật khẩu chung.
4. OTP được tiêu thụ một lần, mật khẩu ban đầu hết hiệu lực, refresh token cũ bị thu hồi.

Hai API `/api/v1/staff/forgot-password` và `/api/v1/staff/reset-password` cũng dùng cùng xử lý này; endpoint staff nhận trường `otp`, endpoint auth nhận trường `code`.

Không còn bước mở link kích hoạt. `/api/v1/staff/invitation-info` và `/api/v1/staff/activate` trả HTTP 410. Các lời mời cũ chưa kích hoạt cần được admin gửi lại để cấp tài khoản theo luồng mới. Không gửi lại lời mời cho email cá nhân đã gắn với Staff hoặc Admin; tài khoản đã tồn tại dùng quên mật khẩu. Nếu email cá nhân đã có tài khoản Buyer, backend tạo Staff riêng và giữ nguyên Buyer.

## Email và cấu hình

Email cấp tài khoản dùng `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Với Gmail: host `smtp.gmail.com`, cổng 465 dùng TLS hoặc 587 dùng STARTTLS, thông tin đăng nhập SMTP hợp lệ. Link đăng nhập lấy từ `FRONTEND_URL`, sau đó `ADMIN_PORTAL_URL`, mặc định `http://localhost:5173/login`.

OTP dùng transporter Gmail của chức năng quên mật khẩu chung, cùng `SMTP_USER` và `SMTP_PASS`. Vì vậy khi triển khai với Gmail, dùng thông tin đăng nhập Gmail SMTP hợp lệ cho cả email cấp tài khoản và email OTP.

Nếu SMTP không chấp nhận email cấp tài khoản, API trả lỗi và transaction không lưu tài khoản, ví hoặc lời mời mới. Việc SMTP chấp nhận thư không đảm bảo thư đã vào Inbox; cần kiểm tra cả Spam. Gửi email và commit cơ sở dữ liệu không phải một giao dịch phân tán: nếu commit lỗi sau khi SMTP đã nhận thư, cần kiểm tra tài khoản trước khi thử lại.

## Kiểm tra

1. Cấu hình SMTP và email quên mật khẩu, chạy backend với cơ sở dữ liệu hoạt động.
2. Admin gửi lời mời đến hộp thư kiểm thử; kiểm tra phản hồi không có mật khẩu/token và hộp thư nhận đủ tài khoản/mật khẩu.
3. Đăng nhập bằng thông tin được cấp; chọn quên mật khẩu bằng tài khoản `@staff.com`, nhận OTP ở email cá nhân, đặt mật khẩu mới.
4. Kiểm tra mật khẩu mới đăng nhập được, mật khẩu cũ và OTP đã dùng bị từ chối.
5. Kiểm tra gửi trùng Staff bị từ chối và lỗi SMTP không để lại tài khoản mới.

Kiểm thử tự động dùng email/Prisma giả lập, không gửi thư thật:

```powershell
node --test backend/test/staff-provisioning.test.mjs backend/test/staff-mail.test.mjs
```

Backend không yêu cầu thay đổi schema cho luồng Staff này. Frontend và `package.json` được giữ nguyên; nội dung giao diện cũ nhắc đến link kích hoạt cần được cập nhật riêng khi có yêu cầu.
