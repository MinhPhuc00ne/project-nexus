import { Badge } from '../shared/AdminUI';
import type { SellerOrderStatus } from '../../../types/order.types';

export const orderLabels: Record<SellerOrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CONFIRMED: 'Đã xác nhận nhận hàng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};
export const paymentLabels: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
};
export const shipmentLabels: Record<string, string> = {
  CREATED: 'Đã tạo vận đơn',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  FAILED: 'Giao thất bại',
  RETURNED: 'Đã hoàn hàng',
};
export const money = (value: string | number) => Number(value).toLocaleString('vi-VN') + ' ₫';
export const date = (value: string) => new Date(value).toLocaleString('vi-VN');
export const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Yêu cầu thất bại.';

export function OrderBadge({ status }: { status: SellerOrderStatus }) {
  return (
    <Badge
      tone={
        status === 'CANCELLED'
          ? 'red'
          : status === 'PENDING_PAYMENT'
            ? 'amber'
            : ['CONFIRMED', 'DELIVERED', 'PAID'].includes(status)
              ? 'green'
              : 'blue'
      }
    >
      {orderLabels[status] ?? status}
    </Badge>
  );
}
