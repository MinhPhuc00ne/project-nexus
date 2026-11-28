import { useTranslation } from 'react-i18next';
import { Badge } from '../shared/AdminUI';
import type { SellerOrderStatus } from '@/features/orders/types/order.types';
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
  PENDING_PAYMENT: 'Pending Payment',
  PAID: 'Paid',
  PREPARING: 'Preparing',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CONFIRMED: 'Delivery Confirmed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};
export const paymentLabels: Record<string, string> = {
  PENDING: 'Pending Payment',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};
export const shipmentLabels: Record<string, string> = {
  CREATED: 'Waybill Created',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery Failed',
  RETURNED: 'Returned',
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
