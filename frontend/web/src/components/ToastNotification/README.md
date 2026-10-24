# Toast notification

`ToastProvider` được gắn một lần trong `App.tsx`. Mọi page/component bên dưới có thể dùng hook:

```tsx
import { useToast } from '@/components/ToastNotification';

// Gọi hook bên trong component.
const toast = useToast();

toast.success('Đã lưu thay đổi.');
toast.error('Không thể lưu thay đổi. Vui lòng thử lại.');
```

- Thành công: xanh lá. Thất bại: đỏ. Cùng bố cục và nằm ở góc dưới bên phải.
- Tự đóng sau 4 giây; mỗi thông báo có timer riêng và nút đóng.
- Tối đa 3 thông báo hiển thị cùng lúc; thông báo mới thay thông báo cũ nhất khi đầy.
- Đổi thời gian bằng `toast.success('Đã lưu.', { duration: 3000 })` (mili giây).
- Có thể đóng sớm: `const id = toast.error('Lỗi.'); toast.dismiss(id);`.
- Không cần import/render `Success` hoặc `Fail` trong từng page; provider quản lý chúng.
