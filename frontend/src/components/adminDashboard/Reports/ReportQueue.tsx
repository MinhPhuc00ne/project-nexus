import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../../i18n/config';
import Popup from '../../Popup';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { listAdminReports, reviewAdminReport } from '../../../services/admin';
import type {
  AdminReport,
  AdminReportPage,
  AdminReportStatus,
} from '../../../types/admin-report.types';

const REPORT_STATUSES: AdminReportStatus[] = ['PENDING', 'INVESTIGATING', 'CONFIRMED', 'DISMISSED'];

function ReportIdentity({
  name,
  id,
  idLabel,
}: {
  name: string;
  id: string | null;
  idLabel: string;
}) {
  return (
    <div>
      <p className="font-medium">{name}</p>
      {id && <p className="mt-1 break-all text-xs text-slate-500">{idLabel}</p>}
    </div>
  );
}

export default function ReportQueue() {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const shopName = (report: AdminReport) =>
    report.shopName || report.shop?.storeName || report.shop?.fullName || t('reports.noShopName');
  const productName = (report: AdminReport) =>
    report.productTitle ||
    report.productName ||
    report.product?.title ||
    t('reports.noProductName');
  const [status, setStatus] = useState<AdminReportStatus | ''>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminReportPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<AdminReport | null>(null);
  const [decision, setDecision] = useState<'CONFIRMED' | 'DISMISSED' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listAdminReports({ page, limit: 10, status: status || undefined }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
        if (page > lastPage) setPage(lastPage);
        else setResult(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : t('reports.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, refresh, t]);

  async function submitReview() {
    if (!detail || !decision || saving || reason.trim().length < 5) return;
    setSaving(true);
    setSaveError('');
    try {
      await reviewAdminReport(detail.id, { status: decision, reason: reason.trim() });
      setDecision(null);
      setDetail(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t('reports.processErr'));
    } finally {
      setSaving(false);
    }
  }

  const canReview = detail?.status === 'PENDING' || detail?.status === 'INVESTIGATING';
  const evidence = Array.isArray(detail?.evidenceUrls)
    ? detail.evidenceUrls.filter((url): url is string => typeof url === 'string')
    : [];

  return (
    <Panel
      title={t('reports.title')}
      subtitle={t('reports.subtitle')}
      action={
        <Button variant="secondary" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
          {t('reports.reload')}
        </Button>
      }
    >
      <select
        aria-label={t('reports.statusAria')}
        className="mb-4 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as AdminReportStatus | '');
          setPage(1);
        }}
      >
        <option value="">{t('reports.allStatuses')}</option>
        {REPORT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {t(`reports.statuses.${value}`)}
          </option>
        ))}
      </select>
      {loading ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          {t('reports.loading')}
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 text-sm text-rose-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRefresh((v) => v + 1)}>
            {t('reports.retry')}
          </Button>
        </div>
      ) : !result?.items.length ? (
        <EmptyState text={t('reports.empty')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-slate-500">
                <tr>
                  {[
                    t('reports.cols.report'),
                    t('reports.cols.target'),
                    t('reports.cols.status'),
                    t('reports.cols.actions'),
                  ].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="max-w-xs break-words p-3">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString(locale)}
                      </p>
                    </td>
                    <td className="max-w-56 break-words p-3">
                      <p className="mb-1 text-xs text-slate-500">
                        {item.productId ? t('reports.targetProduct') : t('reports.targetShop')}
                      </p>
                      <ReportIdentity
                        name={item.productId ? productName(item) : shopName(item)}
                        id={item.productId || item.shopId}
                        idLabel={t('reports.codePrefix', {
                          id: item.productId || item.shopId || '',
                        })}
                      />
                      {item.productId && (
                        <p className="mt-2 text-xs text-slate-500">
                          {t('reports.shopPrefix', { name: shopName(item) })}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        tone={
                          item.status === 'PENDING'
                            ? 'amber'
                            : item.status === 'CONFIRMED'
                              ? 'red'
                              : item.status === 'DISMISSED'
                                ? 'gray'
                                : 'blue'
                        }
                      >
                        {t(`reports.statuses.${item.status}`)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDetail(item);
                          setDecision(null);
                          setReason('');
                          setSaveError('');
                        }}
                      >
                        {t('reports.viewDetails')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              {t('reports.pagination', {
                total: result.total,
                page,
                totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((v) => v - 1)}
              >
                {t('reports.prev')}
              </Button>
              <Button
                variant="secondary"
                disabled={page * result.limit >= result.total}
                onClick={() => setPage((v) => v + 1)}
              >
                {t('reports.next')}
              </Button>
            </div>
          </div>
        </>
      )}
      <Popup
        isOpen={!!detail}
        onClose={() => {
          if (saving) return;
          if (decision) setDecision(null);
          else setDetail(null);
        }}
        title={
          decision
            ? decision === 'CONFIRMED'
              ? t('reports.modalConfirmTitle')
              : t('reports.modalDismissTitle')
            : t('reports.modalDetailTitle')
        }
        size="lg"
      >
        {detail && !decision && (
          <div className="space-y-4">
            <DetailFields
              fields={[
                [t('reports.fields.id'), detail.id],
                [t('reports.fields.title'), detail.title],
                [t('reports.fields.content'), detail.description],
                [
                  t('reports.fields.type'),
                  detail.productId ? t('reports.typeProduct') : t('reports.typeShop'),
                ],
                [
                  t('reports.fields.shop'),
                  <ReportIdentity
                    name={shopName(detail)}
                    id={detail.shopId}
                    idLabel={t('reports.codePrefix', { id: detail.shopId ?? '' })}
                  />,
                ],
                ...(detail.productId
                  ? [
                      [
                        t('reports.fields.product'),
                        <ReportIdentity
                          name={productName(detail)}
                          id={detail.productId}
                          idLabel={t('reports.codePrefix', { id: detail.productId })}
                        />,
                      ] satisfies [string, React.ReactNode],
                    ]
                  : []),
                [
                  t('reports.fields.reporter'),
                  <ReportIdentity
                    name={
                      detail.reporterName ||
                      detail.reporter?.fullName ||
                      t('reports.noReporterName')
                    }
                    id={detail.reporterId}
                    idLabel={t('reports.codePrefix', { id: detail.reporterId ?? '' })}
                  />,
                ],
                [t('reports.fields.status'), t(`reports.statuses.${detail.status}`)],
                [t('reports.fields.resolution'), detail.resolutionNotes],
                [t('reports.fields.handledBy'), detail.handledByAdminId],
                [
                  t('reports.fields.handledAt'),
                  detail.handledAt ? new Date(detail.handledAt).toLocaleString(locale) : '—',
                ],
              ]}
            />
            <section>
              <h3 className="mb-2 text-sm font-semibold">{t('reports.evidenceTitle')}</h3>
              {evidence.length ? (
                evidence.map((url, index) =>
                  /^https?:\/\//i.test(url) ? (
                    <a
                      key={`${index}-${url}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 block break-all text-sm text-primary underline"
                    >
                      {t('reports.evidenceIndex', { index: index + 1 })}
                    </a>
                  ) : (
                    <p key={`${index}-${url}`} className="break-all text-sm">
                      {url}
                    </p>
                  ),
                )
              ) : (
                <p className="text-sm text-slate-500">{t('reports.noEvidence')}</p>
              )}
            </section>
            {canReview && (
              <div className="space-y-3 border-t pt-4">
                <label className="block text-sm">
                  {t('reports.reasonLabel')}
                  <textarea
                    required
                    minLength={5}
                    maxLength={2000}
                    disabled={saving}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1 block min-h-24 w-full rounded-lg border p-2"
                  />
                </label>
                <p className="text-xs text-slate-500">{t('reports.reasonHint')}</p>
                {saveError && (
                  <p role="alert" className="text-sm text-rose-700">
                    {saveError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={reason.trim().length < 5}
                    onClick={() => {
                      setSaveError('');
                      setDecision('CONFIRMED');
                    }}
                  >
                    {t('reports.confirmBtn')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={reason.trim().length < 5}
                    onClick={() => {
                      setSaveError('');
                      setDecision('DISMISSED');
                    }}
                  >
                    {t('reports.dismissBtn')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {detail && decision && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              {t('reports.confirmPromptPrefix')}
              <strong>
                {decision === 'CONFIRMED' ? t('reports.confirmVerb') : t('reports.dismissVerb')}
              </strong>
              {t('reports.confirmPromptMid')}
              <strong>{detail.title}</strong>?
            </p>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="mb-1 font-semibold">{t('reports.reasonLabel')}</p>
              <p className="whitespace-pre-wrap break-words">{reason.trim()}</p>
            </div>
            <p className="text-sm text-amber-700">{t('reports.finalWarning')}</p>
            {saveError && (
              <p role="alert" className="text-sm text-rose-700">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setDecision(null);
                  setSaveError('');
                }}
              >
                {t('reports.backBtn')}
              </Button>
              <Button
                type="button"
                variant={decision === 'DISMISSED' ? 'danger' : 'primary'}
                disabled={saving}
                onClick={() => void submitReview()}
              >
                {saving
                  ? t('reports.processing')
                  : decision === 'CONFIRMED'
                    ? t('reports.agreeConfirm')
                    : t('reports.agreeDismiss')}
              </Button>
            </div>
          </div>
        )}
      </Popup>
    </Panel>
  );
}
