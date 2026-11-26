import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, RefreshCw, Search } from 'lucide-react';
import { Button, EmptyState, Panel } from '../../components/adminDashboard/shared/AdminUI';
import {
  getStaffAfterSales,
  getStaffAdminOrderDetail,
  getStaffOrders,
  getStaffOrderTracking,
  processStaffReturn,
  type StaffAfterSalesRequest,
  type StaffAfterSalesStatus,
  type StaffOrderSupportDetail,
  type StaffOrderTracking,
  type StaffAdminOrderListItem,
  type StaffReturnAction,
} from '@/features/staff/services/staff';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import StaffOrderDetailDialog from './StaffOrderDetailDialog';
import {
  filterStaffAfterSalesPage,
  getAfterSalesPageCount,
  type StaffAfterSalesKindFilter,
} from './afterSales.helpers';

const PAGE_SIZE = 20;
const AFTER_SALES_STATUSES: StaffAfterSalesStatus[] = [
  'REQUESTED',
  'APPROVING',
  'APPROVED',
  'RECEIVED',
  'COMPLETED',
  'REJECTED',
];

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(locale) : '—';
}

function amount(value: number | string | null | undefined, language: string): string {
  if (value === null || value === undefined) return '—';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? formatCurrency(parsed, language) : '—';
}

export default function StaffOrdersPanel() {
  const { t, i18n } = useTranslation('staff');
  const [searchParams] = useSearchParams();
  const locale = getIntlLocale(i18n.language);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StaffAfterSalesStatus | ''>('');
  const [kind, setKind] = useState<StaffAfterSalesKindFilter>('ALL');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<StaffAfterSalesRequest[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestsLimit, setRequestsLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderMatches, setOrderMatches] = useState<StaffAdminOrderListItem[]>([]);
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);
  const [orderSearchError, setOrderSearchError] = useState('');
  const [orderSearchPage, setOrderSearchPage] = useState(1);
  const [orderSearchTotal, setOrderSearchTotal] = useState(0);
  const [orderSearchPages, setOrderSearchPages] = useState(1);
  const handledNotificationOrderRef = useRef<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [order, setOrder] = useState<StaffOrderSupportDetail | null>(null);
  const [tracking, setTracking] = useState<StaffOrderTracking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnWaybill, setReturnWaybill] = useState('');
  const [restock, setRestock] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const loadRequestsPage = async (): Promise<void> => {
      try {
        const result = await getStaffAfterSales(
          { page, limit: PAGE_SIZE, ...(status ? { status } : {}) },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setRequests(result.items);
        setRequestsTotal(result.total);
        setRequestsLimit(result.limit || PAGE_SIZE);
        const lastPage = Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE)));
        if (page > lastPage) setPage(lastPage);
      } catch (cause: unknown) {
        if (!controller.signal.aborted) {
          setRequests([]);
          setRequestsTotal(0);
          setError(cause instanceof Error ? cause.message : t('ordersSupport.loadError'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadRequestsPage();
    return () => controller.abort();
  }, [page, status, revision, t]);

  const filteredRequests = useMemo(
    () => filterStaffAfterSalesPage(requests, kind, search, locale),
    [requests, kind, search, locale],
  );

  const loadOrder = useCallback(
    async (orderId: string, sync = false): Promise<void> => {
      const normalizedId = orderId.trim();
      if (!normalizedId) return;
      setSelectedOrderId(normalizedId);
      setOrderIdInput(normalizedId);
      setDetailLoading(true);
      setDetailError('');
      setTrackingError('');
      setActionError('');
      setOrder(null);
      setTracking(null);
      if (sync) setSyncingTracking(true);
      try {
        const [orderResult, trackingResult] = await Promise.all([
          getStaffAdminOrderDetail(normalizedId),
          getStaffOrderTracking(normalizedId, sync).catch((cause: unknown) => {
            setTrackingError(
              cause instanceof Error ? cause.message : t('ordersSupport.trackingError'),
            );
            return null;
          }),
        ]);
        setOrder(orderResult);
        setTracking(trackingResult);
        setReturnReason(orderResult.afterSales?.decisionReason ?? '');
        setReturnWaybill(orderResult.afterSales?.returnWaybillCode ?? '');
        setRestock(Boolean(orderResult.afterSales?.restockedAt));
      } catch (cause: unknown) {
        setDetailError(cause instanceof Error ? cause.message : t('ordersSupport.detailError'));
      } finally {
        setDetailLoading(false);
        setSyncingTracking(false);
      }
    },
    [t],
  );

  function submitLookup(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const search = orderIdInput.trim();
    if (!search) return;
    setOrderSearchLoading(true);
    setOrderSearchError('');
    setOrderSearchPage(1);
    void getStaffOrders({ search, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        setOrderMatches(result.items);
        setOrderSearchTotal(result.total);
        setOrderSearchPages(result.totalPages);
        if (result.items.length === 1) void loadOrder(result.items[0].id);
      })
      .catch((cause: unknown) => {
        setOrderMatches([]);
        setOrderSearchTotal(0);
        setOrderSearchPages(1);
        setOrderSearchError(cause instanceof Error ? cause.message : t('ordersSupport.loadError'));
      })
      .finally(() => setOrderSearchLoading(false));
  }

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId || handledNotificationOrderRef.current === orderId) return;
    handledNotificationOrderRef.current = orderId;
    setOrderIdInput(orderId);
    void loadOrder(orderId);
  }, [loadOrder, searchParams]);

  function changeOrderSearchPage(nextPage: number): void {
    const search = orderIdInput.trim();
    if (!search || nextPage < 1 || nextPage > orderSearchPages) return;
    setOrderSearchPage(nextPage);
    setOrderSearchLoading(true);
    setOrderSearchError('');
    void getStaffOrders({ search, page: nextPage, limit: PAGE_SIZE })
      .then((result) => {
        setOrderMatches(result.items);
        setOrderSearchTotal(result.total);
        setOrderSearchPages(result.totalPages);
      })
      .catch((cause: unknown) => {
        setOrderSearchError(cause instanceof Error ? cause.message : t('ordersSupport.loadError'));
      })
      .finally(() => setOrderSearchLoading(false));
  }

  async function runReturnAction(action: StaffReturnAction): Promise<void> {
    if (!order || processing) return;
    setProcessing(true);
    setActionError('');
    try {
      await processStaffReturn(order.id, action);
      await loadOrder(order.id);
      setRevision((value) => value + 1);
    } catch (cause: unknown) {
      setActionError(cause instanceof Error ? cause.message : t('ordersSupport.actionError'));
    } finally {
      setProcessing(false);
    }
  }

  const totalPages = getAfterSalesPageCount(requestsTotal, requestsLimit);
  return (
    <section className="mt-4 space-y-5" aria-label={t('ordersSupport.sectionAria')}>
      <Panel
        title={t('ordersSupport.lookupTitle')}
        subtitle={t('ordersSupport.lookupDescription')}
        icon={<PackageSearch size={19} />}
      >
        <form onSubmit={submitLookup} className="flex flex-wrap gap-3">
          <label className="min-w-56 flex-1">
            <span className="sr-only">{t('ordersSupport.lookupTitle')}</span>
            <input
              value={orderIdInput}
              onChange={(event) => setOrderIdInput(event.target.value)}
              placeholder={t('ordersSupport.orderIdPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            />
          </label>
          <Button type="submit" disabled={detailLoading || !orderIdInput.trim()}>
            <Search size={15} /> {t('ordersSupport.lookupBtn')}
          </Button>
        </form>
        {orderSearchError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {orderSearchError}
          </p>
        )}
        {orderSearchLoading ? (
          <p role="status" className="mt-4 text-sm text-slate-500">
            {t('ordersSupport.loading')}
          </p>
        ) : orderMatches.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-blue-50 text-slate-500">
                <tr>
                  <th className="p-3">{t('ordersSupport.orderIdLabel')}</th>
                  <th className="p-3">{t('ordersSupport.waybillLabel')}</th>
                  <th className="p-3">{t('ordersSupport.orderStatus')}</th>
                  <th className="p-3">{t('ordersSupport.orderTotal')}</th>
                  <th className="p-3">{t('ordersSupport.createdAt')}</th>
                  <th className="p-3">{t('ordersSupport.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderMatches.map((match) => (
                  <tr key={match.id} className="align-top hover:bg-slate-50">
                    <td className="max-w-52 break-all p-3 font-medium">{match.id}</td>
                    <td className="max-w-40 break-all p-3">{match.shipment?.waybillCode ?? '—'}</td>
                    <td className="p-3">
                      {t(`ordersSupport.orderStatuses.${match.status}`, {
                        defaultValue: match.status,
                      })}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {amount(match.totalAmount, i18n.language)}
                    </td>
                    <td className="whitespace-nowrap p-3">{formatDate(match.createdAt, locale)}</td>
                    <td className="p-3">
                      <Button variant="secondary" onClick={() => void loadOrder(match.id)}>
                        {t('ordersSupport.openDetails')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orderSearchPages > 1 && (
              <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500">
                <span>
                  {t('ordersSupport.pagination', {
                    page: orderSearchPage,
                    totalPages: orderSearchPages,
                    total: orderSearchTotal,
                  })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={orderSearchPage <= 1}
                    onClick={() => changeOrderSearchPage(orderSearchPage - 1)}
                  >
                    {t('ordersSupport.previous')}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={orderSearchPage >= orderSearchPages}
                    onClick={() => changeOrderSearchPage(orderSearchPage + 1)}
                  >
                    {t('ordersSupport.next')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : orderIdInput.trim() ? (
          <p className="mt-4 text-sm text-slate-500">{t('ordersSupport.noSearchResults')}</p>
        ) : null}
        {detailLoading && (
          <p role="status" className="mt-4 text-sm text-slate-500">
            {t('ordersSupport.detailLoading')}
          </p>
        )}
        {detailError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {detailError}
          </p>
        )}
        {order && !detailLoading && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="min-w-0">
              <p className="break-all text-sm font-semibold text-slate-900">
                {t('ordersSupport.orderIdLabel')}: {order.id}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t(`ordersSupport.orderStatuses.${order.status}`, { defaultValue: order.status })}
                {' · '}
                {formatDate(order.createdAt, locale)}
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={syncingTracking}
              onClick={() => void loadOrder(order.id, true)}
            >
              <RefreshCw size={14} className={syncingTracking ? 'animate-spin' : ''} />
              {syncingTracking ? t('ordersSupport.syncing') : t('ordersSupport.syncTracking')}
            </Button>
          </div>
        )}
      </Panel>

      <Panel
        title={t('ordersSupport.afterSalesTitle')}
        subtitle={t('ordersSupport.afterSalesDescription')}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={14} /> {t('ordersSupport.refresh')}
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="min-w-52 flex-1">
            <span className="sr-only">{t('ordersSupport.searchAria')}</span>
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder={t('ordersSupport.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <select
            aria-label={t('ordersSupport.kindAria')}
            value={kind}
            onChange={(event) => {
              setPage(1);
              setKind(event.target.value as typeof kind);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">{t('ordersSupport.allKinds')}</option>
            <option value="CANCEL">{t('ordersSupport.cancelKind')}</option>
            <option value="RETURN">{t('ordersSupport.returnKind')}</option>
          </select>
          <select
            aria-label={t('ordersSupport.statusAria')}
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as StaffAfterSalesStatus | '');
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">{t('ordersSupport.allStatuses')}</option>
            {AFTER_SALES_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`ordersSupport.statuses.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-3 text-xs text-slate-500">{t('ordersSupport.searchScope')}</p>
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            {t('ordersSupport.loading')}
          </p>
        ) : filteredRequests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-blue-50 text-slate-500">
                <tr>
                  <th className="p-3">{t('ordersSupport.orderIdLabel')}</th>
                  <th className="p-3">{t('ordersSupport.kindLabel')}</th>
                  <th className="p-3">{t('ordersSupport.reasonLabel')}</th>
                  <th className="p-3">{t('ordersSupport.waybillLabel')}</th>
                  <th className="p-3">{t('ordersSupport.statusAria')}</th>
                  <th className="p-3">{t('ordersSupport.updatedAt')}</th>
                  <th className="p-3">{t('ordersSupport.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-slate-50">
                    <td className="max-w-48 break-all p-3 font-medium">{request.orderId}</td>
                    <td className="p-3">
                      {t(`ordersSupport.kinds.${request.kind}`, { defaultValue: request.kind })}
                    </td>
                    <td className="max-w-64 p-3">
                      <p className="line-clamp-2 whitespace-pre-wrap">{request.reason}</p>
                    </td>
                    <td className="max-w-40 break-all p-3">{request.returnWaybillCode || '—'}</td>
                    <td className="p-3">
                      {t(`ordersSupport.statuses.${request.status}`, {
                        defaultValue: request.status,
                      })}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {formatDate(request.updatedAt, locale)}
                    </td>
                    <td className="p-3">
                      <Button variant="secondary" onClick={() => void loadOrder(request.orderId)}>
                        {t('ordersSupport.openDetails')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            text={
              search || kind !== 'ALL' || status
                ? t('ordersSupport.noSearchResults')
                : t('ordersSupport.empty')
            }
          />
        )}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
            <span>
              {t('ordersSupport.pagination', {
                page,
                totalPages,
                total: requestsTotal,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t('ordersSupport.previous')}
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                {t('ordersSupport.next')}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <StaffOrderDetailDialog
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId('')}
        t={t}
        locale={locale}
        language={i18n.language}
        order={order}
        tracking={tracking}
        detailLoading={detailLoading}
        detailError={detailError}
        trackingError={trackingError}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        returnWaybill={returnWaybill}
        setReturnWaybill={setReturnWaybill}
        restock={restock}
        setRestock={setRestock}
        processing={processing}
        actionError={actionError}
        runReturnAction={runReturnAction}
        formatDate={formatDate}
        amount={amount}
      />
    </section>
  );
}
