# Quy Chuẩn Văn Phong Kỹ Thuật (Technical Writing Style Guide)

Tài liệu này xác định các tiêu chuẩn bắt buộc khi biên soạn tài liệu kỹ thuật, hướng dẫn đóng góp, mô tả cam kết và ghi chú mã nguồn trong toàn bộ dự án Project Nexus.

## 1. Nguyên Tắc Văn Phong Cốt Lõi

### Giọng văn kỹ thuật trung lập và trực diện

- Trình bày thông tin khách quan, chính xác và có thể kiểm chứng.
- Tránh sử dụng từ ngữ hoa mỹ, khẩu hiệu tiếp thị hoặc đại từ nhân xưng không trang trọng.
- Sử dụng câu chủ động, ngắn gọn và tập trung vào trách nhiệm kỹ thuật của từng thành phần.

### Sử dụng liên từ chính thức

- Luôn viết rõ ràng từ "và" trong tiếng Việt hoặc "and" trong tiếng Anh thay cho ký tự "&".
- Không viết tắt tùy tiện các thuật ngữ kỹ thuật khi chưa được định nghĩa trong ngữ cảnh tài liệu.

### Quy định định dạng văn bản

- Không in đậm giữa câu để nhấn mạnh cảm tính. Việc nhấn mạnh được thể hiện qua cấu trúc câu và vị trí thông tin.
- Không sử dụng danh sách kiểu máy móc lặp lại thuật ngữ in đậm kèm dấu hai chấm ở đầu mỗi dòng. Thay vào đó, sử dụng câu văn hoàn chỉnh diễn giải rõ ràng ý nghĩa hoặc lập bảng đối chiếu khi cần so sánh nhiều thuộc tính.

## 2. Quy Định Về Ghi Chú Mã Nguồn (Code Comments)

### Cấm tuyệt đối comment dòng đơn vô nghĩa

- Nghiêm cấm hoàn toàn việc viết comment dòng đơn (dạng `// ...`) để giải thích lại cú pháp hoặc từng dòng mã nguồn hiển nhiên (ví dụ: `// bước 1`, `// gọi database`, `// kiểm tra id`).
- Mã nguồn cần tự giải thích thông qua tên biến, hàm và lớp mang tính mô tả cao theo các nguyên tắc Clean Code.

### Bắt buộc chuẩn hóa khối tài liệu chính quy

- Đối với TypeScript và JavaScript: Bắt buộc sử dụng khối tài liệu TSDoc hoặc JSDoc (`/** ... */`) cho toàn bộ Class, Interface, Type, Service Method, Controller Endpoint, Helper Function và WebSocket Event.
- Khối tài liệu phải mô tả đầy đủ chức năng, trách nhiệm, ý nghĩa tham số (`@param`), giá trị trả về (`@returns`) và các ngoại lệ có thể phát sinh (`@throws`).
- Đối với Prisma Schema: Sử dụng cú pháp ghi chú tài liệu ba dấu gạch chéo (`/// ...`) phía trên các model hoặc field quan trọng để phục vụ tự sinh tài liệu cơ sở dữ liệu.

## 3. Phân Định Trách Nhiệm Tài Liệu

### Tệp README.md

Chỉ chứa các thông tin giới thiệu cấp cao nhất về dự án:

- Mục đích và phạm vi ứng dụng của Project Nexus.
- Bảng tổng hợp công nghệ sử dụng trong monorepo.
- Cấu trúc thư mục mức cao nhất.
- Hướng dẫn cài đặt và khởi chạy môi trường phát triển cục bộ.
- Không sao chép các tài liệu chi tiết về kiến trúc, mô hình dữ liệu hoặc đặc tả nghiệp vụ từ thư mục `docs/`.

### Tệp CONTRIBUTING.md

Chỉ tập trung vào quy trình làm việc của kỹ sư:

- Quy định đặt tên nhánh làm việc.
- Quy chuẩn thông điệp commit theo Conventional Commits.
- Quy trình tạo và kiểm duyệt Merge Request.
- Hướng dẫn thao tác lệnh với công cụ `glab` CLI trên máy trạm.
- Không sao chép nội dung kiến trúc hoặc hướng dẫn triển khai từ `README.md` và `docs/`.

### Thư mục docs/

Lưu trữ toàn bộ tài liệu kiến trúc chuyên sâu:

- `docs/architecture/`: Kiến trúc tổng thể Modular Monolith, luật nghiệp vụ và mẫu thiết kế.
- `docs/standards/`: Tiêu chuẩn Clean Code, nguyên tắc thiết kế, quy ước đặt tên và phong cách biên soạn tài liệu.
- `docs/backend/`: Hướng dẫn phát triển dịch vụ phía máy chủ NestJS và Prisma ORM.
- `docs/frontend/`: Hướng dẫn phát triển giao diện React và Vite.
- `docs/api/`: Đặc tả chi tiết các nhóm giao tiếp REST API và WebSocket.
- `docs/srs/`: Đặc tả yêu cầu phần mềm và luồng nghiệp vụ sàn thương mại điện tử kết hợp đấu giá.
