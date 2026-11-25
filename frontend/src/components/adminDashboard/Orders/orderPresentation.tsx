import { useTranslation } from 'react-i18next';
import { Badge } from '../shared/AdminUI';
import type { SellerOrderStatus } from '../../../types/order.types';
import i18n from '../../../i18n';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';

export const ORDER_STATUS_KEYS: SellerOrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'SHIPPING',
  'DELIVERED',
  'CONFIRMED',
  'CANCELLED',
  'REFUNDED',
];

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
export const money = (value: string | number) => formatCurrency(Number(value));
export const date = (value: string) => new Date(value).toLocaleString(getIntlLocale(i18n.language));
export const message = (cause: unknown) =>
  cause instanceof Error ? cause.message : i18n.t('admin:orders.requestFailed');

export function OrderBadge({ status }: { status: SellerOrderStatus }) {
  const { t } = useTranslation('admin');
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
      {t(`orders.orderStatuses.${status}`, { defaultValue: orderLabels[status] ?? status })}
    </Badge>
  );
}
