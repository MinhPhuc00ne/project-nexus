import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getStaffDisputes, resolveStaffDispute } from '../../services/staff';
import type { StaffDispute, StaffDisputeStatus, StaffDisputesPage } from '../../services/staff';
import { getIntlLocale } from '../../i18n/config';
import { formatCurrency } from '../../i18n/formatters';

const DISPUTE_STATUSES: StaffDisputeStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_SELLER_FAVOR',
  'RESOLVED_BUYER_FAVOR',
  'CANCELLED',
];

export default function StaffDisputesPanel() {
  const { t, i18n } = useTranslation('staff');
  const locale = getIntlLocale(i18n.language);
  const [result, setResult] = useState<StaffDisputesPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StaffDisputeStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<StaffDispute | null>(null);
  const [verdict, setVerdict] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void getStaffDisputes({
      page,
      limit: 10,
      status: status || undefined,
      search: search || undefined,
    })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : t('disputes.loadErr'));
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, search, reload, t]);

  async function submitResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reason.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await resolveStaffDispute(selected.orderId, verdict, reason.trim());
      setSelected(null);
      setReason('');
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('disputes.saveErr'));
    } finally {
      setSaving(false);
    }
  }

  const counters = result?.counters;
  const summaryCards = [
    { label: t('disputes.summary.all'), value: counters?.all },
    { label: t('disputes.summary.pending'), value: counters?.pendingReview },
    { label: t('disputes.summary.underReview'), value: counters?.underReview },
    {
      label: t('disputes.summary.resolved'),
      value: (counters?.resolvedBuyerFavor ?? 0) + (counters?.resolvedSellerFavor ?? 0),
    },
  ];

  return (
    <section className="mt-5 space-y-4" aria-label={t('disputes.sectionAria')}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          aria-label={t('disputes.searchAria')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('disputes.searchPlaceholder')}
          className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          aria-label={t('disputes.statusAria')}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as StaffDisputeStatus | '');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t('disputes.allStatuses')}</option>
          {DISPUTE_STATUSES.map((key) => (
            <option key={key} value={key}>
              {t(`disputes.statuses.${key}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          {t('disputes.reload')}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
        >
          {t('disputes.loading')}
        </p>
      ) : result?.items.length ? (
        <div className="space-y-3">
          {result.items.map((dispute) => {
            const canResolve = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW';
            const evidenceUrls = Array.isArray(dispute.evidenceUrls)
              ? dispute.evidenceUrls.filter((url): url is string => typeof url === 'string')
              : [];
            return (
              <article
                key={dispute.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {t('disputes.cardTitle', { id: dispute.id.slice(0, 8) })}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {t('disputes.orderAndTime', {
                        orderId: dispute.orderId,
                        time: new Date(dispute.createdAt).toLocaleString(locale),
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {t(`disputes.statuses.${dispute.status}`)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{dispute.reason}</p>
                {evidenceUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {evidenceUrls.map((url, index) => (
                      <a
                        key={`${dispute.id}-evidence-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        {t('disputes.openEvidence', { index: index + 1 })}
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>
                    {t('disputes.openedBy')} <b>{dispute.openedBy.fullName}</b> (
                    {dispute.openedBy.email})
                  </p>
                  <p>
                    {t('disputes.orderTotal')} <b>{formatCurrency(dispute.order.totalAmount)}</b>
                  </p>
                  <p>{t('disputes.buyer', { name: dispute.order.buyer.fullName })}</p>
                  <p>{t('disputes.seller', { name: dispute.order.seller.fullName })}</p>
                </div>
                {dispute.order.items.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    {dispute.order.items.map((item) => (
                      <li key={item.id}>
                        {item.title} × {item.quantity} — {formatCurrency(item.totalPrice)}
                      </li>
                    ))}
                  </ul>
                )}
                {dispute.resolutionNotes && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {t('disputes.resolutionNotes', { notes: dispute.resolutionNotes })}
                  </p>
                )}
                {canResolve && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(dispute);
                      setVerdict('BUYER');
                      setReason('');
                    }}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {t('disputes.resolveBtn')}
                  </button>
                )}
              </article>
            );
          })}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span>
              {t('disputes.pagination', {
                page: result.page,
                totalPages: Math.max(1, result.totalPages),
                total: result.total,
              })}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-md border px-3 py-1.5 disabled:opacity-40"
              >
                {t('disputes.prev')}
              </button>
              <button
                disabled={page >= result.totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-md border px-3 py-1.5 disabled:opacity-40"
              >
                {t('disputes.next')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {t('disputes.empty')}
        </p>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          role="presentation"
        >
          <form
            onSubmit={submitResolution}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-dispute-resolution-title"
          >
            <div>
              <h2 id="staff-dispute-resolution-title" className="text-lg font-bold text-slate-900">
                {t('disputes.modalTitle')}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t('disputes.modalDesc', { orderId: selected.orderId })}
              </p>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              {t('disputes.verdictLabel')}
              <select
                value={verdict}
                onChange={(event) => setVerdict(event.target.value as 'BUYER' | 'SELLER')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value="BUYER">{t('disputes.verdictBuyer')}</option>
                <option value="SELLER">{t('disputes.verdictSeller')}</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              {t('disputes.reasonLabel')}
              <textarea
                required
                minLength={1}
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {t('disputes.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving || !reason.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? t('disputes.saving') : t('disputes.confirmResolve')}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
