import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@nexus/contracts';
import { getAdminShopOrders } from '@/features/admin/services/adminCommerce';
import type { AdminShopOrderPage } from '@/features/admin/types/admin.types';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import { Badge, Button } from '../shared/AdminUI';

const orderStatuses = Object.values(OrderStatus);

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
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
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
          setError(cause instanceof Error ? cause.message : t('stores.orders.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, revision, shopId, status, t]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t('stores.orders.title')}</h3>
          <p className="mt-1 text-xs text-slate-500">{t('stores.orders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label={t('stores.orders.statusAria')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as OrderStatus | '');
              setPage(1);
            }}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="">{t('stores.orders.allStatuses')}</option>
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
            {t('stores.orders.refresh')}
          </Button>
        </div>
      </div>

      {loading ? (
        <p role="status" className="py-6 text-center text-sm text-slate-500">
          {t('stores.orders.loading')}
        </p>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => setRevision((current) => current + 1)}
          >
            {t('stores.orders.retry')}
          </button>
        </div>
      ) : !result?.items.length ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          {t('stores.orders.empty')}
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
                      {order.buyer?.fullName || t('stores.orders.defaultBuyer')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {order.buyer?.email || t('stores.orders.noEmail')} ·{' '}
                      {new Date(order.createdAt).toLocaleString(locale)}
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
                        {item.title || t('stores.orders.defaultItem')} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-medium">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-500">
                    {order.shipment?.waybillCode
                      ? t('stores.orders.waybill', { code: order.shipment.waybillCode })
                      : formatAddress(order.shippingAddress) ||
                        t('stores.orders.itemsCount', { count: order.itemsCount })}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {t('stores.orders.pagination', {
                total: result.total,
                page: result.page,
                totalPages: Math.max(1, result.totalPages),
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={result.page <= 1}
                onClick={() => setPage(result.page - 1)}
              >
                {t('stores.orders.prev')}
              </Button>
              <Button
                variant="secondary"
                disabled={result.page >= result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                {t('stores.orders.next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
