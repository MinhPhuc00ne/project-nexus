import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import Popup from '../../Popup';
import { Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { listAdminOrders } from '@/features/admin/services/admin';
import type { AdminOrder, AdminOrderPage } from '../../../types/admin-order.types';
import type { SellerOrderStatus } from '../../../types/order.types';
import { ORDER_STATUS_KEYS, money, date, message, OrderBadge } from './orderPresentation';
import OrderDetail from './OrderDetail';
import CancelOrder from './CancelOrder';

export default function OrderManagement() {
  const { t } = useTranslation('admin');
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
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        icon={<ShoppingBag size={19} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            {t('orders.reload')}
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('orders.searchPlaceholder')}
            />
          </div>
          <select
            aria-label={t('orders.statusAria')}
            className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as SellerOrderStatus | '');
              setPage(1);
            }}
          >
            <option value="">{t('orders.allStatuses')}</option>
            {ORDER_STATUS_KEYS.map((value) => (
              <option key={value} value={value}>
                {t(`orders.orderStatuses.${value}`)}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            {t('orders.loading')}
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 text-sm text-red-600">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
              {t('orders.retry')}
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
                          t('orders.cols.order'),
                          t('orders.cols.parties'),
                          t('orders.cols.total'),
                          t('orders.cols.shipping'),
                          t('orders.cols.status'),
                          t('orders.cols.actions'),
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
                            <p>{t('orders.itemLines', { count: row._count.items })}</p>
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
                                <p>
                                  {t(`orders.shipmentStatuses.${row.shipment.status}`, {
                                    defaultValue: row.shipment.status,
                                  })}
                                </p>
                                <p>{row.shipment.waybillCode || t('orders.noWaybillCode')}</p>
                              </>
                            ) : (
                              t('orders.noWaybill')
                            )}
                          </td>
                          <td className="p-3">
                            <OrderBadge status={row.status} />
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" onClick={() => selectOrder(row.id)}>
                                {t('orders.detailsBtn')}
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
                                    {t('orders.cancelBtn')}
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
                <EmptyState text={t('orders.empty')} />
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  {t('orders.pagination', {
                    total: result.total,
                    page: result.page,
                    totalPages: Math.max(1, result.totalPages),
                  })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    {t('orders.prev')}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= result.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    {t('orders.next')}
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
        title={t('orders.detailTitle')}
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
            setNotice(t('orders.cancelSuccessNotice'));
            setRefresh((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
