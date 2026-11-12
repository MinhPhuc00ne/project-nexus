import SellerApplicationsPanel from '../../components/adminDashboard/Sellers/SellerApplicationsPanel';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';

// Hiển thị đầy đủ hồ sơ Seller; Tổng quan dùng cùng component với chế độ preview.
export default function AdminSellersPage() {
  const { actions } = useAdminContext();

  // Panel tự đọc danh sách từ Seller context và gọi API duyệt/từ chối.
  // actions dùng để hiện thông báo và điều hướng trong khu vực admin.
  return <SellerApplicationsPanel actions={actions} />;
}
