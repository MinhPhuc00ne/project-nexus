import { useOutletContext } from 'react-router-dom';
import type { AdminTabProps } from './adminTypes';

// Page con gọi hook này để lấy data/actions mà AdminLayout truyền qua Outlet.
// Không tạo state mới ở đây: mọi page đều đọc cùng dữ liệu nên số đếm sidebar luôn đồng bộ.
export function useAdminContext() {
  return useOutletContext<AdminTabProps>();
}
