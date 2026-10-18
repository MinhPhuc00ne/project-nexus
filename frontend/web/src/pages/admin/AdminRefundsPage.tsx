import RefundRequestsPanel from '../../components/adminDashboard/RefundRequestsPanel';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

// Hiển thị đầy đủ yêu cầu hoàn tiền; dữ liệu và hộp xác nhận dùng chung ở layout.
export default function AdminRefundsPage() {
  const { data, actions } = useAdminContext();

  // Danh sách yêu cầu hoàn tiền đang chờ quyết định; layout quản lý hộp xác nhận.
  return <RefundRequestsPanel data={data} actions={actions} />;
}
