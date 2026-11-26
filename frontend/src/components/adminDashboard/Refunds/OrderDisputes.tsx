import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import Popup from '../../Popup';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { listAdminDisputes } from '@/features/admin/services/admin';
import DisputeResolution from './DisputeResolution';
import type {
  AdminDispute,
  AdminDisputePage,
  AdminDisputeStatus,
} from '@/features/admin/types/admin-dispute.types';

const DISPUTE_STATUSES: AdminDisputeStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_SELLER_FAVOR',
  'RESOLVED_BUYER_FAVOR',
  'CANCELLED',
];

function DisputeBadge({ status }: { status: AdminDisputeStatus }) {
  const { t } = useTranslation('admin');
  return (
    <Badge
      tone={
        status === 'OPEN'
          ? 'amber'
          : status === 'UNDER_REVIEW'
            ? 'blue'
            : status === 'CANCELLED'
              ? 'gray'
              : 'green'
      }
    >
      {t(`refunds.statuses.${status}`)}
    </Badge>
  );
}

export default function OrderDisputes() {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const date = (value: string) => new Date(value).toLocaleString(locale);
  const [params] = useSearchParams();
  const orderId = params.get('order') ?? '';
  const [search, setSearch] = useState(orderId);
  const [term, setTerm] = useState(orderId);
  const [status, setStatus] = useState<AdminDisputeStatus | ''>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminDisputePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<AdminDispute | null>(null);
  const [resolving, setResolving] = useState(false);
  const [decision, setDecision] = useState<'BUYER' | 'SELLER' | null>(null);
  const evidenceUrls = Array.isArray(detail?.evidenceUrls)
    ? detail.evidenceUrls.filter((url): url is string => typeof url === 'string')
    : [];

  useEffect(() => {
    setSearch(orderId);
  }, [orderId]);

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
    listAdminDisputes(
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
          setError(cause instanceof Error ? cause.message : t('refunds.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, term, status, refresh, t]);

  return (
    <div className="space-y-5">
      {result && !loading && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries({
            [t('refunds.summary.all')]: result.counters.all,
            [t('refunds.summary.pending')]: result.counters.pendingReview,
            [t('refunds.summary.resolved')]:
              result.counters.resolvedBuyerFavor + result.counters.resolvedSellerFavor,
          }).map(([label, count]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{count}</p>
            </div>
          ))}
        </div>
      )}
      <Panel
        title={t('refunds.title')}
        subtitle={t('refunds.subtitle')}
        icon={<Flag size={19} />}
        action={
          <Button
            variant="secondary"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
          >
            {t('refunds.reload')}
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('refunds.searchPlaceholder')}
            />
          </div>
          <select
            aria-label={t('refunds.statusAria')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminDisputeStatus | '');
              setPage(1);
            }}
            className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">{t('refunds.allStatuses')}</option>
            {DISPUTE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`refunds.statuses.${value}`)}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            {t('refunds.loading')}
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
              {t('refunds.retry')}
            </Button>
          </div>
        ) : !result?.items.length ? (
          <EmptyState text={t('refunds.empty')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    {[
                      t('refunds.cols.dispute'),
                      t('refunds.cols.parties'),
                      t('refunds.cols.reason'),
                      t('refunds.cols.status'),
                      t('refunds.cols.actions'),
                    ].map((title) => (
                      <th key={title} className="px-3 py-3">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="max-w-56 break-words px-3 py-4">
                        <p className="font-semibold">{item.id}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {t('refunds.orderPrefix', { id: item.orderId })}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{date(item.createdAt)}</p>
                      </td>
                      <td className="px-3 py-4">
                        <p>{item.openedBy.fullName}</p>
                        <p className="text-xs text-slate-500">{item.openedBy.email}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {t('refunds.sellerPrefix', { name: item.order.seller.fullName })}
                        </p>
                      </td>
                      <td className="max-w-xs whitespace-pre-line break-words px-3 py-4">
                        {item.reason}
                      </td>
                      <td className="px-3 py-4">
                        <DisputeBadge status={item.status} />
                      </td>
                      <td className="px-3 py-4">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setDetail(item);
                            setDecision(null);
                          }}
                        >
                          {t('refunds.viewDetails')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                {t('refunds.pagination', {
                  total: result.total,
                  page: result.page,
                  totalPages: Math.max(1, result.totalPages),
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  {t('refunds.prev')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t('refunds.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
      <Popup
        isOpen={!!detail}
        onClose={() => {
          if (resolving) return;
          if (decision) setDecision(null);
          else setDetail(null);
        }}
        title={
          decision
            ? decision === 'BUYER'
              ? t('refunds.modalApproveTitle')
              : t('refunds.modalRejectTitle')
            : t('refunds.modalDetailTitle')
        }
        size="lg"
        closeOnEsc={!resolving}
        closeOnOverlay={!resolving}
        showCloseButton={!resolving}
      >
        {detail && (
          <div className="space-y-5">
            {!decision && (
              <>
                <DetailFields
                  fields={[
                    [t('refunds.fields.id'), detail.id],
                    [t('refunds.fields.orderId'), detail.orderId],
                    [
                      t('refunds.fields.openedBy'),
                      `${detail.openedBy.fullName} (${detail.openedBy.email})`,
                    ],
                    [
                      t('refunds.fields.buyer'),
                      `${detail.order.buyer.fullName} (${detail.order.buyer.email})`,
                    ],
                    [
                      t('refunds.fields.seller'),
                      `${detail.order.seller.fullName} (${detail.order.seller.email})`,
                    ],
                    [t('refunds.fields.status'), t(`refunds.statuses.${detail.status}`)],
                    [t('refunds.fields.openedAt'), date(detail.createdAt)],
                    [t('refunds.fields.orderTotal'), formatCurrency(detail.order.totalAmount)],
                    [
                      t('refunds.fields.escrow'),
                      detail.order.escrowRecord
                        ? formatCurrency(detail.order.escrowRecord.totalAmount)
                        : '—',
                    ],
                    [t('refunds.fields.reason'), detail.reason],
                    [t('refunds.fields.resolution'), detail.resolutionNotes],
                    [t('refunds.fields.resolvedBy'), detail.resolvedBy?.fullName],
                    [
                      t('refunds.fields.resolvedAt'),
                      detail.resolvedAt ? date(detail.resolvedAt) : '—',
                    ],
                  ]}
                />
                <section>
                  <h3 className="mb-2 text-sm font-semibold">{t('refunds.itemsTitle')}</h3>
                  {detail.order.items.map((item) => (
                    <p key={item.id} className="py-1 text-sm text-slate-600">
                      {item.title} × {item.quantity} — {formatCurrency(item.totalPrice)}
                    </p>
                  ))}
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-semibold">{t('refunds.evidenceTitle')}</h3>
                  {evidenceUrls.length ? (
                    evidenceUrls.map((url, index) =>
                      /^https?:\/\//i.test(url) ? (
                        <a
                          key={`${index}-${url}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-2 block break-all text-sm text-primary underline"
                        >
                          {t('refunds.evidenceIndex', { index: index + 1 })}
                        </a>
                      ) : (
                        <p key={`${index}-${url}`} className="break-all text-sm text-slate-500">
                          {url}
                        </p>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-slate-500">{t('refunds.noEvidence')}</p>
                  )}
                </section>
              </>
            )}
            {(detail.status === 'OPEN' || detail.status === 'UNDER_REVIEW') && (
              <DisputeResolution
                key={detail.id}
                orderId={detail.orderId}
                decision={decision}
                onDecisionChange={setDecision}
                onBusyChange={setResolving}
                onResolved={() => {
                  setDetail(null);
                  setDecision(null);
                  setRefresh((value) => value + 1);
                }}
              />
            )}
          </div>
        )}
      </Popup>
    </div>
  );
}
