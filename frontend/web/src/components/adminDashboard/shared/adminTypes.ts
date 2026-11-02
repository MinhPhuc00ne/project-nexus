// Union type: chỉ chấp nhận các tên tab này, giúp TypeScript phát hiện tên tab viết sai.
import type { AdminCommerceData, CommerceChange } from './commerceTypes';

export type AdminTab =
  | 'overview'
  | 'auctions'
  | 'categories'
  | 'banners'
  | 'studio'
  | 'users'
  | 'sellers'
  | 'products'
  | 'orders'
  | 'stores'
  | 'reports'
  | 'refunds'
  | 'finance'
  | 'system'
  | 'settings';

// Báo cáo khiếu nại để Admin xem xét hoàn tiền.
export interface RefundRequest {
  id: string;
  product: string;
  amount: number;
  gateway: string;
  report: string;
  recommendation: string;
  status: 'pending' | 'approved' | 'rejected';
}

// pending = chờ duyệt lịch, scheduled = đã lên lịch, live = đang diễn ra.
export interface AuctionItem {
  id: string;
  name: string;
  seller: string;
  price: number; // Giá khởi điểm, đơn vị VND; giữ kiểu number để tính tiền cọc/phí.
  preset: string; // Tên mẫu hiển thị 3D; bản demo chưa chứa file mô hình GLB.
  time: string;
  duration: number; // Thời lượng phiên, đơn vị phút.
  image: string;
  status: 'pending' | 'scheduled' | 'live';
}

// Gói dữ liệu chung do AdminLayout sở hữu và truyền xuống các tab qua props.
export interface AdminData extends AdminCommerceData {
  refunds: RefundRequest[];
  auctions: AuctionItem[];
}

// Hợp đồng callback giữa trang cha và tab: tab yêu cầu thao tác, trang cha cập nhật data.
// Các hàm hiện trả void vì thao tác đồng bộ trong demo; API thực tế có thể cần Promise.
export interface AdminActions {
  updateCommerce: (change: CommerceChange) => void;
  navigate: (tab: AdminTab) => void;
  reviewRefund: (id: string, status: 'approved' | 'rejected') => void;
  approveAuction: (id: string) => void;
  showDetail: (title: string, content: string) => void;
  notify: (message: string) => void;
}

// Props chung: data dùng để đọc/hiển thị, actions dùng để báo thao tác về trang cha.
export interface AdminTabProps {
  data: AdminData;
  actions: AdminActions;
}
