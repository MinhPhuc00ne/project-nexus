import AuctionsPanel from './AuctionsPanel';
import { useAdminContext } from '../shared/useAdminContext';

// Ghép bảng đấu giá dùng chung với Tổng quan; duyệt lịch qua actions của layout.
export default function AdminAuctionsPage() {
  const { data, actions } = useAdminContext();

  // Danh sách phiên đấu giá đầy đủ; component chung quản lý bộ lọc và các nút thao tác.
  return <AuctionsPanel data={data} actions={actions} />;
}
