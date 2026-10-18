import SellerApplicationsPanel from '../../components/adminDashboard/SellerApplicationsPanel';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

// Hiển thị đầy đủ hồ sơ Seller; Tổng quan dùng cùng component với chế độ preview.
export default function AdminSellersPage() {
  const { data, actions } = useAdminContext();

  // Danh sách hồ sơ Seller đang chờ duyệt; phê duyệt/từ chối qua action chung của layout.
  return <SellerApplicationsPanel data={data} actions={actions} />;
}
