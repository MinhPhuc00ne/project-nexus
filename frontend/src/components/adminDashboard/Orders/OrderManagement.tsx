import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Popup from '../../Popup';
import { Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { listAdminOrders } from '../../../services/admin';
import type { AdminOrder, AdminOrderPage } from '../../../types/admin-order.types';
import type { SellerOrderStatus } from '../../../types/order.types';
import { orderLabels, shipmentLabels, money, date, message, OrderBadge } from './orderPresentation';
import OrderDetail from './OrderDetail';
import CancelOrder from './CancelOrder';

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
