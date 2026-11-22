import { useEffect, useState } from 'react';
import { OrderStatus } from '@nexus/types';
import { getAdminShopOrders } from '../../../services/adminCommerce';
import type { AdminShopOrderPage } from '../../../types/admin.types';
import { Badge, Button } from '../shared/AdminUI';

const orderStatuses = Object.values(OrderStatus);

function formatMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatStatus(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ');
}

function formatAddress(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return Object.values(value)
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .join(', ');
}

export default function ShopOrdersPanel({ shopId }: { shopId: string }) {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<AdminShopOrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void getAdminShopOrders(
      shopId,
      { page, limit: 5, ...(status ? { status } : {}) },
      controller.signal,
    )
      .then((response) => {
        if (!controller.signal.aborted) setResult(response);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Không tải được đơn hàng của shop.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, revision, shopId, status]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Đơn hàng</h3>
          <p className="mt-1 text-xs text-slate-500">Đơn và trạng thái giao hàng của shop.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Lọc đơn hàng theo trạng thái"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as OrderStatus | '');
              setPage(1);
            }}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="">Tất cả trạng thái</option>
            {orderStatuses.map((value) => (
              <option key={value} value={value}>
                {formatStatus(value)}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRevision((current) => current + 1)}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {loading ? (
        <p role="status" className="py-6 text-center text-sm text-slate-500">
          Đang tải đơn hàng…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => setRevision((current) => current + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : !result?.items.length ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Shop chưa có đơn hàng phù hợp.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {result.items.map((order) => (
              <li key={order.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-xs font-semibold text-slate-700">#{order.id}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {order.buyer?.fullName || 'Khách hàng'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.buyer?.email || 'Không có email'} ·{' '}
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <Badge tone={order.status === OrderStatus.CANCELLED ? 'red' : 'blue'}>
                    {formatStatus(order.status)}
                  </Badge>
                </div>

                <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 text-xs">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="size-10 rounded object-cover" />
                      ) : (
                        <span aria-hidden="true" className="size-10 rounded bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 break-words">
                        {item.title || 'Sản phẩm'} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-medium">{formatMoney(item.totalPrice)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-500">
                    {order.shipment?.waybillCode
                      ? `Vận đơn ${order.shipment.waybillCode}`
                      : formatAddress(order.shippingAddress) || `${order.itemsCount} sản phẩm`}
                  </span>
                  <span className="font-bold text-slate-900">{formatMoney(order.totalAmount)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {result.total} đơn · Trang {result.page}/{Math.max(1, result.totalPages)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={result.page <= 1}
                onClick={() => setPage(result.page - 1)}
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                disabled={result.page >= result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
