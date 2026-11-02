# Cẩm Nang Kỹ Thuật Giao Diện Người Dùng (Frontend Engineering Guide)

Tài liệu này cung cấp hướng dẫn toàn diện cho kỹ sư giao diện về kiến trúc monorepo, quản lý phiên đăng nhập, chuẩn hóa component và kết nối API trên ứng dụng `frontend/`.

## 1. Tổng Quan Công Nghệ (Tech Stack)

- Framework: React 19 and TypeScript (Strict Mode)
- Công cụ build: Vite 8 (Hot Module Replacement)
- Styling: Tailwind CSS v4 and `@tailwindcss/vite`
- Bộ icon: Lucide React and `@ant-design/icons`
- Điều hướng: React Router 7 (`react-router-dom`)
- Hợp đồng kiểu dữ liệu: `@nexus/types` (Monorepo shared library)
- HTTP Client: Axios instance duy nhất (`src/services/api.ts`)

## 2. Tích Hợp Monorepo Và Cấu Hình Vite

Ứng dụng giao diện tiêu thụ trực tiếp các hợp đồng từ `@nexus/types`. Để hỗ trợ Hot Module Replacement tức thì và loại bỏ xung đột biên dịch giữa CommonJS và ESM trong quá trình phát triển cục bộ, tệp `frontend/vite.config.ts` định nghĩa alias trỏ trực tiếp đến mã nguồn TypeScript:

```typescript
// frontend/vite.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@nexus/types': fileURLToPath(new URL('../packages/types/src/index.ts', import.meta.url)),
    },
  },
});
```

Cấu hình này giúp Vite biên dịch TypeScript tức thì qua esbuild. Khi kỹ sư cập nhật DTOs, Enums hoặc Events trong `packages/types/src/`, giao diện trên trình duyệt sẽ tự động cập nhật ngay mà không cần chạy lại lệnh build thủ công.

## 3. Kiến Trúc Phiên Đăng Nhập Và Xác Thực (`AuthContext`)

Tầng xác thực được tập trung tại `frontend/src/contexts/AuthContext.tsx`, bao bọc toàn bộ ứng dụng tại `App.tsx`.

### Khử trùng lặp yêu cầu mạng đồng thời (In-Flight Request Deduplication)

Khi nhiều component trên cùng một trang hoặc trong các lần chuyển hướng gọi `fetchCurrentUser()`, `AuthContext` duy trì một tham chiếu `inFlightPromiseRef`. Nếu một yêu cầu đang được xử lý trên đường truyền mạng, các lệnh gọi tiếp theo sẽ gắn vào Promise hiện có thay vì gửi thêm các request trùng lặp đến `/users/me`.

### Đồng bộ phiên đa tab qua Storage Event

`AuthContext` lắng nghe đồng thời sự kiện `storage` của trình duyệt và sự kiện nội bộ `nexus:auth-change`:

- Đăng nhập hoặc đăng xuất tại một tab sẽ ngay lập tức đồng bộ hóa trạng thái trên toàn bộ các tab đang mở.
- Chuyển đổi vai trò giữa Buyer và Seller cập nhật giao diện người dùng tức thì mà không cần tải lại toàn bộ trang.

## 4. Chuẩn Hóa Kết Nối Dịch Vụ Và Cơ Sở Dữ Liệu Seed

Hệ thống giao diện kết nối trực tiếp đến các điểm cuối REST API của Backend và kênh WebSocket thời gian thực thông qua instance Axios chuẩn tại `src/services/api.ts`:

- Toàn bộ dữ liệu mẫu phục vụ kiểm thử và trình diễn được tập trung duy nhất tại `backend/prisma/seed.ts`.
- Các dịch vụ phía frontend xử lý phản hồi có định kiểu, hiển thị thông báo lỗi rõ ràng khi phát sinh sự cố và duy trì trải nghiệm người dùng liền mạch.
- Kênh WebSocket đấu giá thời gian thực (`src/services/auction.service.ts`) tự động đồng bộ hóa mức giá cao nhất, người dẫn đầu và kích hoạt chống bắn tỉa khi có lệnh đặt cọc thành công.
