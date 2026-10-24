import Popup from '../Popup';
import { Button } from './AdminUI';

export default function ShopDetail({ onClose }: { onClose: () => void }) {
  return (
    <Popup
      isOpen
      onClose={onClose}
      title="Chi tiết cửa hàng"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <p className="py-8 text-sm leading-relaxed text-slate-500">
        Đây là nơi hiển thị shop đang bán gì, thống kê doanh thu, đơn hàng, đánh giá, vi phạm và
        lịch sử xử lý của shop. Các nội dung này cần được triển khai sau.
      </p>
    </Popup>
  );
}
