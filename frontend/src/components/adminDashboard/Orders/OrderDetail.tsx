import { useEffect, useState } from 'react';
import { Button } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { getAdminOrderById } from '../../../services/admin';
import type { AdminOrderDetail } from '../../../types/admin-order.types';
import {
  paymentLabels,
  shipmentLabels,
  money,
  date,
  message,
  OrderBadge,
} from './orderPresentation';

export default function OrderDetail({ id }: { id: string }) {
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
          Thử lại
        </Button>
      </div>
    );
  if (!detail)
    return (
      <p role="status" className="text-sm text-slate-500">
        Đang tải chi tiết đơn hàng…
      </p>
    );
  const address = detail.shippingAddressSnapshot;
  return (
    <div className="space-y-5">
      <DetailFields
        fields={[
          ['Mã đơn', detail.id],
          ['Trạng thái', <OrderBadge status={detail.status} />],
          ['Người mua', `${detail.buyer.fullName}\n${detail.buyer.email}`],
          ['Người bán', `${detail.seller.fullName}\n${detail.seller.email}`],
          ['Ngày tạo', date(detail.createdAt)],
          ['Cập nhật', date(detail.updatedAt)],
          ['Tiền hàng', money(detail.subtotal)],
          ['Phí vận chuyển', money(detail.shippingFee)],
          ['Tổng tiền', money(detail.totalAmount)],
          [
            'Vận chuyển',
            detail.shipment
              ? (shipmentLabels[detail.shipment.status] ?? detail.shipment.status)
              : 'Chưa có vận đơn',
          ],
          ['Mã vận đơn', detail.shipment?.waybillCode],
          [
            'Người nhận',
            address ? [address.recipientName, address.phone].filter(Boolean).join(' · ') : null,
          ],
          [
            'Địa chỉ giao hàng',
            address?.formattedAddress ||
              (address
                ? [address.street, address.ward, address.district, address.city]
                    .filter(Boolean)
                    .join(', ')
                : null),
          ],
          ['Bên hủy đơn', detail.cancellationActor],
        ]}
      />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Sản phẩm</h3>
        {detail.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium">
              {item.titleSnapshot ?? item.product?.title ?? 'Vật phẩm trong đơn'}
            </p>
            <p className="mt-1 text-slate-500">
              {item.quantity} × {money(item.unitPrice)} = {money(item.totalPrice)}
            </p>
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Lịch sử thanh toán</h3>
        {detail.payments.length ? (
          detail.payments.map((payment) => (
            <div key={payment.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p>
                {payment.provider} · {money(payment.amount)} ·{' '}
                {paymentLabels[payment.status] ?? payment.status}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                {payment.id} · {date(payment.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Chưa có giao dịch thanh toán.</p>
        )}
      </section>
      {detail.escrowRecord && (
        <DetailFields
          fields={[
            ['Trạng thái ký quỹ', detail.escrowRecord.status],
            ['Tiền ký quỹ', money(detail.escrowRecord.totalAmount)],
            ['Phí nền tảng', money(detail.escrowRecord.platformFee)],
            ['Tiền trả người bán', money(detail.escrowRecord.sellerPayout)],
          ]}
        />
      )}
      {detail.afterSales && (
        <DetailFields
          fields={[
            ['Yêu cầu hậu mãi', `${detail.afterSales.kind} · ${detail.afterSales.status}`],
            ['Lý do', detail.afterSales.reason],
            ['Lý do quyết định', detail.afterSales.decisionReason],
          ]}
        />
      )}
      {detail.dispute && (
        <DetailFields fields={[['Khiếu nại', `${detail.dispute.id} · ${detail.dispute.status}`]]} />
      )}
      {!!detail.refunds.length && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Hoàn tiền</h3>
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
