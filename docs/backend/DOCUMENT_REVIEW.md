# Đối chiếu tài liệu kiểm tra backend — 27/10/2026

Nguồn: [Google Docs của nhóm](https://docs.google.com/document/d/1IWrnrdBEfcQNL6gU96xYofERGn7hVlM8IwdlvfpcYqA/edit).
Đã pull `origin/dev` trước khi sửa; Git trả `Already up to date` trên nhánh
`feature/backend-ghn-staff-provisioning`. Không sửa frontend, manifest hoặc lockfile.
Chatbox và đấu giá được loại khỏi đợt này theo yêu cầu.

## Kết quả đối chiếu

| Nội dung trong tài liệu                                                               | Kết quả backend                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chi tiết shop cho admin                                                               | Đã có hồ sơ, sản phẩm, đơn hàng, vi phạm, bằng chứng và lịch sử xử lý. Sửa cách tính: hoàn tất là `CONFIRMED`; phí sàn lấy tiền đã `DISBURSED`, không tự giả định 7% trên tổng gồm shipping.                                                                                           |
| Tỷ lệ shop hủy/giao trễ                                                               | Không trả số giả: đơn cũ thiếu người hủy thì tỷ lệ hủy do shop là `null`, kèm số đơn thiếu dữ liệu. Giao trễ là `null` và `lateDeliveryDataAvailable=false`, vì chưa có thời điểm giao thực tế đáng tin cậy từ carrier.                                                                |
| Seller cập nhật shop, đơn bán/GHN, tài chính/rút tiền, tranh chấp, tùy chọn thông báo | Code mới nhất đã có API; không còn đúng với nhận định “chưa có” trong tài liệu. Xem Swagger và `GHN_SHIPPING.md`.                                                                                                                                                                      |
| Bật chế độ seller để vượt đình chỉ                                                    | Đã có cờ đình chỉ riêng. Bổ sung khóa giao dịch để việc bật chế độ/đăng, sửa sản phẩm không chạy vượt qua thao tác đình chỉ đồng thời.                                                                                                                                                 |
| Unban không hiện lại sản phẩm                                                         | Chỉ khôi phục sản phẩm đã bị ẩn bởi lần đình chỉ; sản phẩm seller tự ẩn hoặc admin ẩn riêng vẫn giữ nguyên.                                                                                                                                                                            |
| Admin cho hiện sản phẩm của shop bị ban                                               | Kiểm tra lại shop trong cùng giao dịch trước khi bật sản phẩm.                                                                                                                                                                                                                         |
| Samsung/iPad mini bị chặn nhầm, thiếu số nhà/đường                                    | Bản code đã có sửa bộ lọc theo từ và trả `street`; giữ các sửa đó.                                                                                                                                                                                                                     |
| Staff nhận tài khoản/đổi mật khẩu                                                     | Đã có cấp tài khoản ngay, mật khẩu ngẫu nhiên gửi về email cá nhân; quên mật khẩu dùng luồng chung. Kiểm thử vẫn qua. Luồng đổi mật khẩu bằng OTP khi đang đăng nhập cũng được sửa để tiêu thụ OTP và thu hồi refresh token trong một giao dịch; SMTP thất bại trả lỗi, không log OTP. |
| GHN HTTP 200 nhưng thiếu dữ liệu                                                      | Trả 502 nếu thiếu/null/sai cấu trúc master data. Danh sách quận/phường `[]` hợp lệ vẫn là `[]`; tỉnh/thành `[]` báo lỗi. Chuẩn hóa URL có dấu `/` cuối; diagnostic kiểm tra dữ liệu và che toàn bộ token.                                                                              |
| Seller sửa hồ sơ chưa reauthenticate                                                  | Cả `PATCH /buyer/profile` và `/auth/profile` kiểm tra bằng chứng. Không chấp nhận access/refresh token như bằng chứng xác minh.                                                                                                                                                        |
| Quyền sửa hồ sơ                                                                       | Kiểm tra role thực trong DB, chỉ Buyer/Seller. Staff có API sửa hồ sơ riêng.                                                                                                                                                                                                           |
| Avatar shop trùng avatar cá nhân                                                      | Có `shopAvatarUrl` riêng. Cập nhật liên hệ/địa chỉ shop không đổi hồ sơ hay địa chỉ nhận hàng cá nhân.                                                                                                                                                                                 |
| Chuyển role/mode sai                                                                  | Giữ `role` là quyền tài khoản; trả thêm `accountRole`, `activeRole`, `currentMode`. Hai JWT guard đọc lại quyền/mode hiện tại từ DB, tránh dùng trạng thái cũ trong token sau khi chuyển chế độ.                                                                                       |
| Sale                                                                                  | API thiết lập/dừng/lên lịch giá sale. Catalog, giỏ, checkout và khai giá GHN dùng giá đang có hiệu lực.                                                                                                                                                                                |
| Màu/size                                                                              | Có DB/API cho nhóm lựa chọn; giỏ tách từng tổ hợp; đơn lưu lựa chọn đã mua. Các tổ hợp dùng chung giá và tồn kho của sản phẩm.                                                                                                                                                         |
| Đánh giá shop/sản phẩm/khách hàng                                                     | Có API tạo và xem; chỉ tài khoản thuộc đơn `CONFIRMED` được đánh giá, chống trùng theo đơn/sản phẩm. Seller xem đánh giá shop qua API hiện có và đánh giá sản phẩm qua API mới.                                                                                                        |
| Báo cáo shop/sản phẩm                                                                 | Có API tạo báo cáo; xác định shop từ sản phẩm trên server, chặn tự báo cáo và báo cáo trùng đang xử lý; đưa vào `shop_violations` để admin xử lý.                                                                                                                                      |
| Bộ lọc tìm kiếm                                                                       | Danh mục, seller, từ khóa, giá thực trả sau sale, tỉnh/thành, sao tối thiểu, còn/hết hàng; phân trang tối đa 100. Sắp giá sau sale tại DB.                                                                                                                                             |
| Đề xuất cá nhân                                                                       | Theo danh mục trong giỏ và đơn đã hoàn tất của tài khoản hiện tại; dự phòng bằng số đánh giá/điểm sao/độ mới. Loại shop bị đình chỉ, hàng ngừng bán/hết hàng và sản phẩm của chính người mua. Đây là quy tắc gợi ý, chưa có mô hình ML.                                                |
| Hồ sơ staff                                                                           | PATCH riêng, chỉ sửa tên, điện thoại, avatar của staff đang đăng nhập.                                                                                                                                                                                                                 |
| Banner event                                                                          | Staff/Admin quản lý banner ảnh URL, link, lịch hiển thị và ưu tiên; API public chỉ trả banner đang bật và trong lịch. DELETE ẩn banner.                                                                                                                                                |
| Cảnh báo admin tới seller                                                             | Backend đã tạo notification IN_APP cho đúng seller, có kiểm thử hồi quy. Frontend cần đọc API thông báo hiện có để hiển thị; đợt này không sửa frontend.                                                                                                                               |
| Toast login/logout, giao diện hồ sơ, mock homepage, màn hình checkout                 | Thuộc frontend; chưa sửa theo giới hạn đã được yêu cầu. API mới cần được frontend tích hợp trước khi test đầy đủ trên giao diện.                                                                                                                                                       |

## API và dữ liệu mới

Mọi đường dẫn dưới đây có tiền tố `/api/v1`.

| Method | Đường dẫn                                              | Quyền                                                        |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------ |
| POST   | `/auth/profile/reauthenticate`                         | Buyer/Seller, body `{ "password": "..." }`                   |
| PATCH  | `/staff/profile`                                       | Staff, body `fullName`, `phoneNumber`, `avatarUrl`           |
| PATCH  | `/seller/shop-profile`                                 | API shop hiện có: thêm `shopAvatarUrl`                       |
| PATCH  | `/catalog/products/:id/sale`                           | Chủ sản phẩm, body `salePrice`, `saleStartsAt`, `saleEndsAt` |
| POST   | `/commerce/orders/:orderId/shop-review`                | Buyer của đơn hoàn tất                                       |
| POST   | `/commerce/orders/:orderId/products/:productId/review` | Buyer của đơn, sản phẩm phải có trong đơn                    |
| POST   | `/seller/orders/:orderId/customer-review`              | Seller của đơn hoàn tất                                      |
| GET    | `/catalog/shops/:id/reviews`                           | Public, chỉ shop không bị đình chỉ                           |
| GET    | `/catalog/products/:id/reviews`                        | Public, chỉ sản phẩm đang bán/shop không bị đình chỉ         |
| GET    | `/seller/product-reviews`                              | Seller, chỉ sản phẩm của mình                                |
| GET    | `/buyer/customer-reviews`                              | Buyer/Seller, đánh giá khách hàng của chính mình             |
| POST   | `/catalog/shops/:id/reports`                           | Buyer/Seller                                                 |
| POST   | `/catalog/products/:id/reports`                        | Buyer/Seller                                                 |
| GET    | `/catalog/recommendations?limit=20`                    | Buyer/Seller, tối đa 50 kết quả                              |
| GET    | `/staff/banners`                                       | Staff/Admin, tối đa 100                                      |
| POST   | `/staff/banners`                                       | Staff/Admin                                                  |
| PUT    | `/staff/banners/:id`                                   | Staff/Admin; gửi đầy đủ title/imageUrl và lịch mong muốn     |
| DELETE | `/staff/banners/:id`                                   | Staff/Admin; chuyển về ẩn                                    |
| GET    | `/catalog/banners`                                     | Public, tối đa 100                                           |

`GET` danh sách đánh giá hỗ trợ `page`, `limit` (1–100).
Đánh giá nhận `{ "rating": 5, "comment": "..." }` (rating nguyên 1–5).
Báo cáo nhận `title`, `description`, `evidenceUrls` (tối đa 10 URL HTTP/HTTPS).
Banner nhận `title`, `imageUrl`, `targetUrl`, `startsAt`, `endsAt`, `isActive`, `priority`.
Ảnh banner dùng URL từ chức năng upload media hiện có.

Seller lấy token xác minh rồi gửi `verificationToken` trong body cập nhật hồ sơ;
`/buyer/profile` cũng hỗ trợ header `x-verification-token`. Token hết hạn sau 5 phút,
ràng buộc người dùng và phiên bản mật khẩu. Có thể gửi mật khẩu hiện tại hoặc dùng
thông tin đăng nhập đã xác minh trong 5 phút gần đây. Redis lỗi không làm bỏ qua kiểm tra.

Ví dụ khi tạo/sửa sản phẩm:

```json
{
  "options": [
    { "name": "Màu", "values": ["Đen", "Trắng"] },
    { "name": "Size", "values": ["M", "L"] }
  ]
}
```

Thêm vào giỏ với `productId`, `quantity`, `selections: { "Màu": "Đen", "Size": "M" }`.
Cần chọn đủ các nhóm, đúng giá trị; không nhận giá do client gửi. Tối đa 6 nhóm,
50 giá trị/nhóm. `options: []` xóa nhóm lựa chọn; giỏ cũ không còn hợp lệ được đánh dấu
`hasInvalidSelections` và bị chặn checkout để người mua chọn lại. Các lựa chọn chưa có
SKU/giá/tồn kho riêng; tồn kho được cộng chung qua mọi tổ hợp trong giỏ.

Giá sale từ 1.000đ và nhỏ hơn giá gốc; bắt đầu có hiệu lực tại `saleStartsAt`, hết hiệu
lực tại `saleEndsAt`; null thời gian nghĩa là không giới hạn phía đó. Gửi
`{ "salePrice": null }` dừng sale. Hệ thống lấy đủ báo giá GHN rồi kiểm tra lại giỏ,
giá, sản phẩm và shop trước khi tạo bất kỳ đơn nào. Nếu có thay đổi, trả lỗi để lấy lại
báo giá và giữ giỏ hàng. Đơn đã tạo giữ nguyên giá/lựa chọn tại thời điểm checkout.

Ví dụ bộ lọc:
`GET /catalog/products?search=Samsung&minPrice=100000&maxPrice=5000000&city=Hồ%20Chí%20Minh&minRating=4&inStock=true&sortBy=price_asc&page=1&limit=20`.

## Migration và kiểm tra triển khai

Migration: `backend/prisma/migrations/20261027130000_document_review_fixes/migration.sql`.
Thêm avatar riêng, sale, lựa chọn giỏ/đơn, đánh giá, banner và liên kết báo cáo sản phẩm;
giữ dữ liệu cũ. Avatar seller được copy sang avatar shop đúng một lần khi migration.
Không suy đoán sản phẩm cũ bị ẩn vì ban hay seller tự ẩn: cờ khôi phục mặc định false;
admin cần kiểm tra và bật lại riêng các sản phẩm cũ đó.

Chưa áp dụng migration lên DB thực. Cần PostgreSQL sẵn sàng, kiểm tra đúng môi trường
và sao lưu theo quy trình triển khai, rồi chạy từ thư mục `backend`:

```powershell
..\node_modules\.bin\prisma.cmd migrate deploy
..\node_modules\.bin\prisma.cmd generate
```

Prisma schema đã validate; kiểm thử hiện dùng mock DB/GHN/SMTP và khởi tạo Nest/Swagger
không gọi dịch vụ ngoài. Chưa xác nhận end-to-end với database thực, tài khoản GHN,
Gmail hoặc giao diện. Các chức năng tồn kho/đặt giữ hàng trước đây không được thay đổi
thành quản lý tồn kho theo SKU trong đợt này.

Kết quả hồi quy: 116/116 kiểm thử qua; backend build, lint toàn repository,
format check và `git diff --check` qua. Các ca mới kiểm tra xác minh hồ sơ, token
cũ sau chuyển mode, tiêu thụ OTP đồng thời, avatar/liên hệ độc lập, khôi phục sản
phẩm, GHN thiếu dữ liệu, sale/lựa chọn qua checkout, quyền đánh giá/báo cáo,
lọc banner/gợi ý và đăng ký route/DTO Swagger.

Chạy hồi quy từ root:

```powershell
node --test --test-concurrency=2 --test-reporter=spec backend/test/*.test.mjs
npm run build:backend
npm run lint
npm run format:check
```
