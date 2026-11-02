# Hướng Dẫn Đóng Góp Mã Nguồn (Contributing Guide)

Tài liệu này xác định quy trình cộng tác mã nguồn, chiến lược phân nhánh Git, tiêu chuẩn thông điệp commit, quy trình kiểm duyệt Merge Request và hướng dẫn sử dụng công cụ GitLab CLI (`glab`) cho toàn bộ kỹ sư tham gia Project Nexus.

## 1. Chiến Lược Phân Nhánh Git (Git Branching Strategy)

Dự án áp dụng mô hình GitFlow tinh gọn xoay quanh nhánh chính được bảo vệ `main` và nhánh tích hợp liên tục `dev`.

### Vai trò các nhánh chính

- Nhánh `main`: Nhánh môi trường sản xuất chính thức. Nghiêm cấm mọi thao tác đẩy mã trực tiếp lên nhánh này.
- Nhánh `dev`: Nhánh tích hợp tập trung cho mọi hoạt động phát triển. Toàn bộ các nhánh tính năng đều phải xuất phát từ `dev` và tạo Merge Request quay trở lại `dev`.

### Quy tắc đặt tên nhánh làm việc

- Nhánh tính năng mới: `feature/<module>-<ten-tinh-nang>` (ví dụ: `feature/auction-live-bid`, `feature/commerce-cod`).
- Nhánh sửa lỗi trong phát triển: `bugfix/<module>-<ten-loi>` (ví dụ: `bugfix/chat-typing-status`).
- Nhánh vá lỗi khẩn cấp cho sản xuất: `hotfix/<ten-su-co>` (nhánh xuất phát từ `main` và phải được hợp nhất đồng thời vào cả `main` và `dev`).
- Nhánh tái cấu trúc kỹ thuật: `refactor/<hang-muc>` (ví dụ: `refactor/modular-monolith-phase3`).

## 2. Tiêu Chuẩn Thông Điệp Commit (Conventional Commits)

Toàn bộ thông điệp commit phải tuân thủ nghiêm ngặt quy chuẩn Conventional Commits v1.0.0 và được kiểm tra tự động qua Git hook commit-msg:

### Cú pháp thông điệp

```text
<loai>(<pham-vi>): <mo ta ngan gon bang tieng Anh hoac tieng Viet>
```

### Yêu cầu bắt buộc

- Tiêu đề commit không vượt quá 100 ký tự.
- Viết rõ ràng liên từ "and" thay cho ký hiệu "&".
- Sử dụng chữ thường cho loại commit và phạm vi.

### Các loại commit được chấp nhận

- `feat`: Tính năng hoặc năng lực nghiệp vụ mới.
- `fix`: Khắc phục lỗi phần mềm.
- `docs`: Cập nhật hoặc bổ sung tài liệu.
- `style`: Định dạng mã nguồn, khoảng trắng, chấm phẩy mà không thay đổi logic.
- `refactor`: Tái cấu trúc mã nguồn không làm thay đổi hành vi nghiệp vụ.
- `test`: Bổ sung hoặc điều chỉnh các kịch bản kiểm thử.
- `chore`: Tác vụ bảo trì, cấu hình repository hoặc cập nhật gói phụ thuộc.
- `perf`: Cải thiện hiệu năng xử lý.
- `ci`: Thay đổi cấu hình pipeline tích hợp và triển khai liên tục.
- `build`: Thay đổi hệ thống build hoặc dependency monorepo.

## 3. Quy Trình Merge Request (Merge Request Lifecycle)

Trước khi gửi Merge Request vào nhánh `dev`, kỹ sư thực hiện đầy đủ các bước kiểm tra cục bộ:

```bash
# Kiểm tra định dạng mã nguồn
npm run format:check

# Kiểm tra quy chuẩn mã nguồn với ESLint
npm run lint

# Kiểm tra quy trình build toàn bộ monorepo
npx turbo run build

# Chạy toàn bộ bộ kiểm thử đơn vị
npx turbo run test
```

Sau khi toàn bộ kiểm tra cục bộ thành công:

1. Đảm bảo nhánh làm việc đã được rebase mới nhất từ `origin/dev`.
2. Đẩy nhánh lên máy chủ GitLab.
3. Tạo Merge Request với đích đến là nhánh `dev` theo mẫu chuẩn tại `.gitlab/merge_request_templates/default.md`.
4. Đảm bảo pipeline CI/CD trên GitLab vượt qua cả ba giai đoạn validate, build và test.
5. Merge Request cần nhận được sự đồng thuận từ thành viên xét duyệt trước khi thực hiện hợp nhất.

## 4. Hướng Dẫn Tùy Chọn Sử Dụng GitLab CLI (glab)

Kỹ sư có thể sử dụng công cụ dòng lệnh chính thức `glab` để tự động hóa toàn bộ vòng đời phân nhánh và gửi Merge Request mà không cần thao tác qua giao diện web.

### Xác thực tài khoản với máy chủ GitLab nội bộ

```bash
glab auth login --hostname github.com
```

### Tạo Merge Request tự động từ nhánh hiện tại

```bash
glab mr create --target-branch dev --title "feat(auction): implement real-time bidding terminal" --description "Mo ta chi tiet cac thay doi"
```

### Xem trạng thái và kiểm tra kết quả CI của Merge Request

```bash
glab mr view
glab ci status
```

### Thực hiện hợp nhất sau khi hoàn tất kiểm duyệt

```bash
glab mr merge <mr-id> --rebase --remove-source-branch
```

## 5. Quy Chuẩn Kỹ Thuật Tham Chiếu

Các tiêu chuẩn kỹ thuật chi tiết về giới hạn dòng lệnh, cấm comment dòng đơn vô nghĩa, bắt buộc khối tài liệu TSDoc và phong cách viết kỹ thuật được quy định chi tiết tại các tài liệu:

- [Quy Chuẩn Clean Code](docs/standards/CLEAN_CODE.md)
- [Quy Chuẩn Văn Phong Kỹ Thuật](docs/standards/WRITING_STYLE.md)
- [Quy Ước Đặt Tên Hệ Thống](docs/standards/NAMING_CONVENTIONS.md)
