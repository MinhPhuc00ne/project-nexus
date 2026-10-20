import RefundRequestsPanel from '../../components/adminDashboard/RefundRequestsPanel';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';
import { Link, useSearchParams } from 'react-router-dom';

// Hiển thị đầy đủ yêu cầu hoàn tiền; dữ liệu và hộp xác nhận dùng chung ở layout.
export default function AdminRefundsPage() {
  const { data, actions } = useAdminContext();
  const [params] = useSearchParams();
  const orderId = params.get('order') ?? undefined;

  // Danh sách yêu cầu hoàn tiền đang chờ quyết định; layout quản lý hộp xác nhận.
  return (
    <div className="space-y-4">
      {orderId && (
        <p className="text-sm text-slate-500">
          Đang xem yêu cầu chờ xử lý của đơn {orderId}.{' '}
          <Link className="font-semibold text-primary underline" to="/admin/refunds">
            Xem tất cả
          </Link>
        </p>
      )}
      <RefundRequestsPanel data={data} actions={actions} orderId={orderId} />
    </div>
  );
}
