# Quy Chuẩn Mã Nguồn Sạch Và Tài Liệu Hóa (Clean Code Standards)

Tài liệu này xác định các tiêu chuẩn bắt buộc về chất lượng mã nguồn, kiểm soát độ phức tạp, định dạng tự động và phương thức tài liệu hóa trên toàn bộ Project Nexus.

## 1. Giới Hạn Tệp Và Phân Tách Trách Nhiệm

### Hướng dẫn kiểm soát độ dài tệp

Mục tiêu cốt lõi của việc kiểm soát độ dài là đảm bảo tính gắn kết và khả năng bảo trì:

- Không trộn lẫn nhiều trách nhiệm: Tuyệt đối không gộp chung các luồng xử lý không liên quan, máy trạng thái, quy tắc tài chính và các khối giao diện khác biệt vào cùng một tệp.
- Ngưỡng khuyến nghị xấp xỉ 300 dòng: Giữ kích thước tệp dưới 300 dòng là thước đo thực tế cho sự gắn kết lành mạnh. Khi một tệp đạt từ 250 đến 300 dòng, kỹ sư chủ động tái cấu trúc bằng cách tách component con, tách custom hook hoặc trích xuất hằng số cấu hình ra tệp riêng.
- Tính linh hoạt theo trách nhiệm duy nhất: Ngưỡng 300 dòng là khuyến nghị kiến trúc chứ không áp đặt máy móc. Nếu một tệp vượt quá 300 dòng nhưng tuân thủ triệt để nguyên lý đơn nhiệm (Single Responsibility Principle) và việc chia nhỏ sẽ làm phân mảnh logic, cấu trúc đó hoàn toàn được chấp thuận.

## 2. Quy Định Bình Luận Và Tài Liệu Hóa Mã Nguồn

### Cấm tuyệt đối comment dòng đơn vô nghĩa

- Nghiêm cấm hoàn toàn việc viết comment dòng đơn (dạng `// ...`) để thuật lại cú pháp hoặc giải thích từng dòng mã nguồn hiển nhiên (ví dụ: `// bước 1`, `// gọi database`, `// kiểm tra id`).
- Không sử dụng ký tự phân cách trang trí kiểu ASCII (ví dụ: `// ================== HELPER FUNCTIONS ==================`).

### Bắt buộc chuẩn hóa khối tài liệu TSDoc và JSDoc

- Toàn bộ Class, Interface, Type, Service Method, Controller Endpoint, Helper Function và WebSocket Gateway phải được tài liệu hóa bằng khối cú pháp TSDoc hoặc JSDoc (`/** ... */`).
- Khối tài liệu phải mô tả chức năng tổng quan, giải trình ý nghĩa tham số bằng `@param`, định nghĩa giá trị trả về bằng `@returns` và liệt kê các ngoại lệ phát sinh bằng `@throws`.
- Đối với Prisma Schema: Sử dụng cú pháp ba dấu gạch chéo (`///`) phía trên các Model và Field quan trọng để phục vụ trích xuất tài liệu lược đồ cơ sở dữ liệu.

## 3. Tiêu Chuẩn Chất Lượng TypeScript

Dự án áp dụng chế độ kiểm tra nghiêm ngặt cấu hình từ `@nexus/config/tsconfig.base.json`:

### Loại bỏ hoàn toàn kiểu any

```typescript
// Không được phép:
const handleEvent = (data: any) => { ... };

// Bắt buộc sử dụng kiểu dữ liệu tường minh hoặc unknown kèm type guard:
const handleEvent = (data: OrderCreatedEventPayload) => { ... };
const parsePayload = (raw: unknown): UserProfile => {
  if (isUserProfile(raw)) return raw;
  throw new InvalidPayloadException();
};
```

### Khai báo kiểu trả về tường minh

Toàn bộ service method, controller endpoint và hàm tiện ích công khai bắt buộc phải có kiểu trả về rõ ràng:

```typescript
// Tuân thủ:
async getSellerSession(): Promise<UserProfile> { ... }

// Không tuân thủ:
async getSellerSession() { ... }
```

### Xử lý giá trị null và undefined an toàn

- Ưu tiên toán tử optional chaining `?.` và toán tử nullish coalescing `??` thay vì kiểm tra truthy thủ công.
- Tránh sử dụng toán tử non-null assertion `!` trừ trường hợp gắn root element tại `main.tsx`.

## 4. Định Dạng Mã Nguồn Tự Động

Mã nguồn được tự động định dạng thông qua Prettier cấu hình tại `.prettierrc.json`:

- Chạy `npm run format` để tự động chuẩn hóa toàn bộ tệp tin.
- Chạy `npm run format:check` để xác minh định dạng trong pipeline kiểm thử và Git hook.

## 5. Quy Tắc Linting Với ESLint

Hệ thống quy chuẩn ESLint phẳng (`eslint.config.mjs`) giám sát các lỗi phổ biến:

- Cấm sử dụng `any` (@typescript-eslint/no-explicit-any đặt mức `error`).
- Cấm câu lệnh `debugger` và từ khóa `var`.
- Bắt buộc so sánh nghiêm ngặt bằng toán tử `===` (eqeqeq đặt mức `error`).
- Không sử dụng `console.log` trong các dịch vụ sản xuất; chỉ cho phép ghi nhận qua NestJS `Logger` hoặc các mức `warn`, `error`, `info`.
- Biến không sử dụng phải được xóa bỏ hoặc đặt tiền tố gạch dưới `_` nếu cố ý giữ lại.

## 6. Thiết Kế Hàm Và Kiểm Soát Độ Phức Tạp

- Kích thước hàm: Khuyến nghị mỗi hàm không vượt quá 30 dòng.
- Số lượng tham số: Giới hạn tối đa 3 tham số. Khi cần truyền nhiều dữ liệu, bắt buộc gom nhóm thành DTO hoặc object có định kiểu.
- Áp dụng kỹ thuật Early Return: Triệt tiêu các cấu trúc điều kiện lồng nhau phức tạp để mã nguồn dễ theo dõi từ trên xuống dưới.
