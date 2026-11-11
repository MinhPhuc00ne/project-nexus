import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Popup from '../../Popup';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { cancelAdminOrder, getAdminOrderById, listAdminOrders } from '../../../services/admin';
import type {
  AdminOrder,
  AdminOrderDetail,
  AdminOrderPage,
} from '../../../types/admin-order.types';
import type { SellerOrderStatus } from '../../../types/order.types';

const orderLabels: Record<SellerOrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CONFIRMED: 'Đã xác nhận nhận hàng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};
const paymentLabels: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
};
const shipmentLabels: Record<string, string> = {
  CREATED: 'Đã tạo vận đơn',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  FAILED: 'Giao thất bại',
  RETURNED: 'Đã hoàn hàng',
};
const money = (value: string | number) => Number(value).toLocaleString('vi-VN') + ' ₫';
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const message = (cause: unknown) => (cause instanceof Error ? cause.message : 'Yêu cầu thất bại.');

function OrderBadge({ status }: { status: SellerOrderStatus }) {
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

function OrderDetail({ id }: { id: string }) {
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
            <p className="font-medium">{item.product.title}</p>
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

function CancelOrder({
  order,
  onClose,
  onSuccess,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  return (
    <Popup
      isOpen
      onClose={onClose}
      title="Hủy đơn hàng"
      size="md"
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          if (!reason.trim()) {
            setError('Vui lòng nhập lý do hủy đơn.');
            return;
          }
          submitting.current = true;
          setPending(true);
          setError('');
          try {
            await cancelAdminOrder(order.id, reason.trim());
            onSuccess();
          } catch (cause) {
            setError(
              `${message(cause)} Nếu mất kết nối, hãy đóng cửa sổ và tải lại đơn để kiểm tra kết quả trước khi thử lại.`,
            );
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        <p className="mb-4 break-words text-sm text-slate-600">
          Đơn {order.id}. Chỉ hủy trước khi đơn vị vận chuyển nhận hàng. Với đơn đã thanh toán, hãy
          kiểm tra trạng thái hoàn tiền sau khi hủy.
        </p>
        <label className="block text-sm font-semibold">
          Lý do hủy đơn *
          <textarea
            autoFocus
            rows={3}
            maxLength={2000}
            disabled={pending}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-normal"
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Đóng
          </Button>
          <Button variant="danger" type="submit" disabled={pending}>
            {pending ? 'Đang hủy…' : 'Xác nhận hủy'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

export default function OrderManagement() {
  const [params, setParams] = useSearchParams();
  const detailId = params.get('order');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<SellerOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminOrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [cancelOrder, setCancelOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listAdminOrders(
      { page, limit: 10, search: term || undefined, status: status || undefined },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (page > Math.max(1, data.totalPages)) {
          setPage(Math.max(1, data.totalPages));
          return;
        }
        setResult(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(message(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, term, status, refresh]);

  function selectOrder(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set('order', id);
    else next.delete('order');
    setParams(next, { replace: !id });
  }

  return (
    <div className="space-y-5">
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      <Panel
        title="Đơn hàng toàn sàn"
        subtitle="Tra cứu đơn hàng, thanh toán, vận chuyển và hậu mãi"
        icon={<ShoppingBag size={19} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Tải lại
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm mã đơn, mã vận đơn, tên/email người mua hoặc người bán..."
            />
          </div>
          <select
            aria-label="Lọc trạng thái đơn hàng"
            className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as SellerOrderStatus | '');
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái đơn</option>
            {Object.entries(orderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Đang tải danh sách đơn hàng…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 text-sm text-red-600">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : (
          result && (
            <>
              {result.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-blue-50 text-slate-500">
                      <tr>
                        {[
                          'Đơn hàng',
                          'Người mua / Người bán',
                          'Tổng tiền',
                          'Vận chuyển',
                          'Trạng thái',
                          'Thao tác',
                        ].map((title) => (
                          <th scope="col" key={title} className="p-3 font-semibold">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.items.map((row) => (
                        <tr key={row.id} className="align-top hover:bg-slate-50/70">
                          <td className="p-3 leading-5">
                            <p className="max-w-56 break-all font-semibold">{row.id}</p>
                            <p>{row._count.items} dòng sản phẩm</p>
                            <span className="text-slate-400">{date(row.createdAt)}</span>
                          </td>
                          <td className="p-3 leading-5">
                            <p>{row.buyer.fullName}</p>
                            <p className="text-slate-400">{row.buyer.email}</p>
                            <p className="mt-2">{row.seller.fullName}</p>
                            <p className="text-slate-400">{row.seller.email}</p>
                          </td>
                          <td className="p-3 font-semibold">{money(row.totalAmount)}</td>
                          <td className="p-3 leading-5">
                            {row.shipment ? (
                              <>
                                <p>{shipmentLabels[row.shipment.status] ?? row.shipment.status}</p>
                                <p>{row.shipment.waybillCode || 'Chưa có mã vận đơn'}</p>
                              </>
                            ) : (
                              'Chưa có vận đơn'
                            )}
                          </td>
                          <td className="p-3">
                            <OrderBadge status={row.status} />
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" onClick={() => selectOrder(row.id)}>
                                Chi tiết
                              </Button>
                              {['PENDING_PAYMENT', 'PAID', 'PREPARING'].includes(row.status) &&
                                !row.dispute &&
                                (!row.afterSales ||
                                  (row.afterSales.kind === 'CANCEL' &&
                                    row.afterSales.status === 'REJECTED')) && (
                                  <Button
                                    variant="danger"
                                    onClick={() => {
                                      setNotice('');
                                      setCancelOrder(row);
                                    }}
                                  >
                                    Hủy đơn
                                  </Button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="Không có đơn hàng khớp với bộ lọc." />
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  {result.total} kết quả · Trang {result.page}/{Math.max(1, result.totalPages)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= result.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )
        )}
      </Panel>
      <Popup
        isOpen={!!detailId}
        onClose={() => selectOrder(null)}
        title="Chi tiết đơn hàng"
        size="lg"
      >
        {detailId && <OrderDetail key={`${detailId}:${refresh}`} id={detailId} />}
      </Popup>
      {cancelOrder && (
        <CancelOrder
          key={cancelOrder.id}
          order={cancelOrder}
          onClose={() => setCancelOrder(null)}
          onSuccess={() => {
            setCancelOrder(null);
            setNotice(
              'Đã xử lý yêu cầu hủy đơn. Hãy kiểm tra trạng thái đơn và hoàn tiền trong chi tiết.',
            );
            setRefresh((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
