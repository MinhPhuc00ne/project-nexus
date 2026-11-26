import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { getAdminOrderById } from '@/features/admin/services/admin';
import type { AdminOrderDetail } from '../../../types/admin-order.types';
import { money, date, message, OrderBadge } from './orderPresentation';

export default function OrderDetail({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError('');
    getAdminOrderById(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDetail(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(message(cause));
      });
    return () => controller.abort();
  }, [id, refresh]);
  if (error)
    return (
      <div role="alert" className="space-y-3 text-sm text-red-600">
        <p>{error}</p>
        <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
          {t('orders.detail.retry')}
        </Button>
      </div>
    );
  if (!detail)
    return (
      <p role="status" className="text-sm text-slate-500">
        {t('orders.detail.loading')}
      </p>
    );
  const address = detail.shippingAddressSnapshot;
  return (
    <div className="space-y-5">
      <DetailFields
        fields={[
          [t('orders.detail.fields.id'), detail.id],
          [t('orders.detail.fields.status'), <OrderBadge status={detail.status} />],
          [t('orders.detail.fields.buyer'), `${detail.buyer.fullName}\n${detail.buyer.email}`],
          [t('orders.detail.fields.seller'), `${detail.seller.fullName}\n${detail.seller.email}`],
          [t('orders.detail.fields.createdAt'), date(detail.createdAt)],
          [t('orders.detail.fields.updatedAt'), date(detail.updatedAt)],
          [t('orders.detail.fields.subtotal'), money(detail.subtotal)],
          [t('orders.detail.fields.shippingFee'), money(detail.shippingFee)],
          [t('orders.detail.fields.total'), money(detail.totalAmount)],
          [
            t('orders.detail.fields.shipping'),
            detail.shipment
              ? t(`orders.shipmentStatuses.${detail.shipment.status}`, {
                  defaultValue: detail.shipment.status,
                })
              : t('orders.detail.noWaybill'),
          ],
          [t('orders.detail.fields.waybill'), detail.shipment?.waybillCode],
          [
            t('orders.detail.fields.recipient'),
            address ? [address.recipientName, address.phone].filter(Boolean).join(' · ') : null,
          ],
          [
            t('orders.detail.fields.address'),
            address?.formattedAddress ||
              (address
                ? [address.street, address.ward, address.district, address.city]
                    .filter(Boolean)
                    .join(', ')
                : null),
          ],
          [t('orders.detail.fields.cancelledBy'), detail.cancellationActor],
        ]}
      />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('orders.detail.productsTitle')}</h3>
        {detail.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium">
              {item.titleSnapshot ?? item.product?.title ?? t('orders.detail.defaultItem')}
            </p>
            <p className="mt-1 text-slate-500">
              {item.quantity} × {money(item.unitPrice)} = {money(item.totalPrice)}
            </p>
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('orders.detail.paymentsTitle')}</h3>
        {detail.payments.length ? (
          detail.payments.map((payment) => (
            <div key={payment.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p>
                {payment.provider} · {money(payment.amount)} ·{' '}
                {t(`orders.paymentStatuses.${payment.status}`, {
                  defaultValue: payment.status,
                })}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                {payment.id} · {date(payment.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{t('orders.detail.noPayments')}</p>
        )}
      </section>
      {detail.escrowRecord && (
        <DetailFields
          fields={[
            [t('orders.detail.fields.escrowStatus'), detail.escrowRecord.status],
            [t('orders.detail.fields.escrowTotal'), money(detail.escrowRecord.totalAmount)],
            [t('orders.detail.fields.platformFee'), money(detail.escrowRecord.platformFee)],
            [t('orders.detail.fields.sellerPayout'), money(detail.escrowRecord.sellerPayout)],
          ]}
        />
      )}
      {detail.afterSales && (
        <DetailFields
          fields={[
            [
              t('orders.detail.fields.afterSales'),
              `${detail.afterSales.kind} · ${detail.afterSales.status}`,
            ],
            [t('orders.detail.fields.reason'), detail.afterSales.reason],
            [t('orders.detail.fields.decisionReason'), detail.afterSales.decisionReason],
          ]}
        />
      )}
      {detail.dispute && (
        <DetailFields
          fields={[
            [t('orders.detail.fields.dispute'), `${detail.dispute.id} · ${detail.dispute.status}`],
          ]}
        />
      )}
      {!!detail.refunds.length && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('orders.detail.refundsTitle')}</h3>
          {detail.refunds.map((refund) => (
            <div key={refund.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p>
                {money(refund.amount)} · {refund.destination} · {refund.status}
              </p>
              {refund.externalReference && (
                <p className="break-all text-xs text-slate-500">{refund.externalReference}</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
