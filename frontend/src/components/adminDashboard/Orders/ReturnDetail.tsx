import { useEffect, useRef, useState } from 'react';
import Popup from '../../Popup';
import { Badge, Button } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { getAdminOrderById } from '../../../services/admin';
import { getAdminReturnOrder, processAdminReturn } from '../../../services/admin-returns';
import type { AdminOrderDetail } from '../../../types/admin-order.types';
import {
  returnStatusLabels,
  type AdminReturnOrder,
  type ReturnAction,
  type ReturnStatus,
} from '../../../types/admin-return.types';
import { date, message, money, OrderBadge, shipmentLabels } from './orderPresentation';

type Action = 'approve' | 'reject' | 'waybill' | 'receive';
const actionLabels: Record<Action, string> = {
  approve: 'Duyệt trả hàng',
  reject: 'Từ chối',
  waybill: 'Gắn vận đơn chiều về',
  receive: 'Xác nhận nhận hàng',
};

export default function ReturnDetail({
  orderId,
  onClose,
  onUpdated,
}: {
  orderId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [data, setData] = useState<{ order: AdminOrderDetail; returns: AdminReturnOrder } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      getAdminOrderById(orderId, controller.signal),
      getAdminReturnOrder(orderId, controller.signal),
    ])
      .then(([order, returns]) => {
        if (!controller.signal.aborted) setData({ order, returns });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderId, revision]);

  async function submit(payload: ReturnAction) {
    if (busy.current || loading || error) return;
    busy.current = true;
    setPending(true);
    setActionError('');
    setNotice('');
    try {
      const updated = await processAdminReturn(orderId, payload);
      setData((current) =>
        current ? { ...current, returns: { ...current.returns, afterSales: updated } } : null,
      );
      setNotice('Đã xử lý yêu cầu. Đang tải trạng thái mới nhất.');
      setAction(null);
      onUpdated();
    } catch (cause) {
      setActionError(message(cause));
    } finally {
      // A GHN timeout can still change the server state. Always reload before another attempt.
      setRevision((value) => value + 1);
      setPending(false);
      busy.current = false;
    }
  }

  const request = data?.returns.afterSales;
  const evidence = Array.isArray(request?.evidenceUrls)
    ? request.evidenceUrls.filter(
        (url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url),
      )
    : [];
  const blocked = pending || loading || !!error;

  return (
    <Popup
      isOpen
      title="Chi tiết hoàn trả hàng"
      size="xl"
      onClose={() => {
        if (!pending) onClose();
      }}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <div className="space-y-5">
        {loading && (
          <p role="status" className="text-sm text-slate-500">
            Đang tải thông tin trả hàng…
          </p>
        )}
        {error && (
          <div role="alert" className="space-y-2 text-sm text-red-700">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-700">
            {notice}
          </p>
        )}
        {actionError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
        {data && request?.kind === 'RETURN' && (
          <>
            <DetailFields
              fields={[
                ['Đơn hàng', data.order.id],
                [
                  'Nguồn đơn hàng',
                  data.returns.isAuction ? 'Mua từ phiên đấu giá' : 'Mua hàng thông thường',
                ],
                ['Trạng thái đơn', <OrderBadge status={data.order.status} />],
                ['Người mua', `${data.order.buyer.fullName}\n${data.order.buyer.email}`],
                ['Người bán', `${data.order.seller.fullName}\n${data.order.seller.email}`],
                ['Tổng tiền đơn hàng', money(data.order.totalAmount)],
                ['Ngày yêu cầu', date(request.createdAt)],
                [
                  'Trạng thái trả hàng',
                  <Badge>
                    {returnStatusLabels[request.status as ReturnStatus] ?? request.status}
                  </Badge>,
                ],
                ['Lý do yêu cầu', request.reason],
                ['Ghi chú duyệt', request.decisionReason],
                ['Vận đơn gốc', data.returns.shipment?.waybillCode],
                [
                  'Vận chuyển',
                  data.returns.shipment
                    ? (shipmentLabels[data.returns.shipment.status] ?? data.returns.shipment.status)
                    : null,
                ],
                ['Vận đơn chiều về', request.returnWaybillCode],
                ['Đã nhận hàng lúc', request.receivedAt ? date(request.receivedAt) : null],
                ['Đã nhập lại kho lúc', request.restockedAt ? date(request.restockedAt) : null],
                ['Ký quỹ', data.returns.escrowRecord?.status],
              ]}
            />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Sản phẩm trả hàng</h3>
              {data.order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">
                    {item.titleSnapshot ?? item.product?.title ?? 'Vật phẩm trong đơn'}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {item.quantity} × {money(item.unitPrice)}
                  </p>
                </div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Bằng chứng</h3>
              {evidence.length ? (
                <div className="flex flex-wrap gap-3">
                  {evidence.map((url, index) => (
                    <a
                      key={`${index}:${url}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 underline"
                    >
                      Bằng chứng {index + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Không có bằng chứng đính kèm.</p>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Hoàn tiền</h3>
              {data.returns.refunds.length ? (
                data.returns.refunds.map((refund) => (
                  <div key={refund.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p>
                      {money(refund.amount)} ·{' '}
                      {refund.destination === 'WALLET'
                        ? 'Ví NEXUS'
                        : refund.destination === 'ORIGINAL'
                          ? 'Nguồn thanh toán ban đầu'
                          : refund.destination}{' '}
                      ·{' '}
                      {refund.status === 'SUCCESS'
                        ? 'Đã hoàn tiền'
                        : refund.status === 'PENDING'
                          ? 'Chờ hoàn tiền'
                          : refund.status}
                    </p>
                    {refund.externalReference && (
                      <p className="mt-1 break-all text-xs text-slate-500">
                        Mã đối soát: {refund.externalReference}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Chưa có giao dịch hoàn tiền.</p>
              )}
            </section>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(actionLabels) as Action[]).map((value) => (
                <Button
                  key={value}
                  variant={value === 'reject' ? 'danger' : 'secondary'}
                  disabled={blocked}
                  onClick={() => {
                    setAction(value);
                    setActionError('');
                    setNotice('');
                  }}
                >
                  {actionLabels[value]}
                </Button>
              ))}
            </div>
            {action && (
              <form
                key={action}
                className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (blocked) return;
                  const fields = new FormData(event.currentTarget);
                  const reason = String(fields.get('reason') ?? '').trim();
                  const waybillCode = String(fields.get('waybillCode') ?? '').trim();
                  if ((action === 'waybill' && !waybillCode) || (action !== 'waybill' && !reason))
                    return;
                  void submit(
                    action === 'waybill'
                      ? { type: 'waybill', waybillCode }
                      : action === 'receive'
                        ? { type: 'receive', reason, restock: fields.get('restock') === 'true' }
                        : {
                            type: 'review',
                            decision: action === 'approve' ? 'APPROVE' : 'REJECT',
                            reason,
                          },
                  );
                }}
              >
                <h3 className="text-sm font-semibold">{actionLabels[action]}</h3>
                {action === 'waybill' ? (
                  <>
                    <p className="text-sm text-slate-600">
                      Nhập mã vận đơn GHN chiều về đã được tạo cho đơn này. Hệ thống sẽ kiểm tra vận
                      đơn trước khi lưu.
                    </p>
                    <label className="block text-sm">
                      Mã vận đơn chiều về
                      <input
                        name="waybillCode"
                        required
                        maxLength={100}
                        disabled={blocked}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    {action === 'approve' && (
                      <p className="text-sm text-slate-600">
                        Xác nhận cho khách trả toàn bộ đơn hàng. Với đơn đang vận chuyển, hệ thống
                        sẽ gửi yêu cầu chuyển hoàn tới GHN.
                      </p>
                    )}
                    {action === 'reject' && (
                      <p className="text-sm text-slate-600">
                        Ghi rõ lý do từ chối để người mua theo dõi kết quả xử lý.
                      </p>
                    )}
                    {action === 'receive' && (
                      <>
                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                          Chỉ xác nhận sau khi đã nhận và kiểm hàng thực tế. Hệ thống sẽ kiểm tra
                          vận chuyển và xử lý hoàn tiền; lựa chọn nhập kho áp dụng cho toàn bộ sản
                          phẩm trong đơn.
                        </p>
                        <label className="block text-sm">
                          Kết quả kiểm hàng
                          <select
                            name="restock"
                            required
                            defaultValue=""
                            disabled={blocked}
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <option value="" disabled>
                              Chọn kết quả kiểm hàng
                            </option>
                            <option value="true">
                              Tất cả sản phẩm đủ điều kiện bán lại · Nhập lại kho
                            </option>
                            <option value="false">Không nhập lại kho</option>
                          </select>
                        </label>
                      </>
                    )}
                    <label className="block text-sm">
                      {action === 'receive' ? 'Ghi chú kiểm hàng' : 'Lý do xử lý'}
                      <textarea
                        name="reason"
                        required
                        maxLength={2000}
                        rows={3}
                        disabled={blocked}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
                      />
                    </label>
                  </>
                )}
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" required disabled={blocked} className="mt-1" />
                  Tôi đã kiểm tra thông tin và xác nhận thực hiện thao tác này.
                </label>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant={action === 'reject' ? 'danger' : 'primary'}
                    disabled={blocked}
                  >
                    {pending ? 'Đang xử lý…' : 'Xác nhận'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setAction(null)}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
        {!loading && !error && request?.kind !== 'RETURN' && (
          <p className="text-sm text-slate-500">Đơn hàng này không có yêu cầu trả hàng.</p>
        )}
      </div>
    </Popup>
  );
}
