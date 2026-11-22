import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, WalletCards } from 'lucide-react';
import {
  listAdminWithdrawals,
  reviewAdminWithdrawal,
  type AdminWithdrawalRequest,
  type AdminWithdrawalStatus,
} from '../../../services/admin';
import { getIntlLocale } from '../../../i18n/config';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';

const WITHDRAWAL_STATUSES: AdminWithdrawalStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
];

export default function WithdrawalManagement() {
  const { t, i18n } = useTranslation('admin');
  const date = (value: string | null) =>
    value ? new Date(value).toLocaleString(getIntlLocale(i18n.language)) : '—';
  const [status, setStatus] = useState<AdminWithdrawalStatus | ''>('PENDING');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    items: AdminWithdrawalRequest[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<AdminWithdrawalRequest | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void listAdminWithdrawals({ page, limit: 10, status: status || undefined }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult(data);
        const lastPage = Math.max(1, data.totalPages);
        if (page > lastPage) setPage(lastPage);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : t('finance.withdrawals.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, revision, t]);

  function openReview(item: AdminWithdrawalRequest, next: 'APPROVED' | 'REJECTED') {
    setTarget(item);
    setDecision(next);
    setRejectionReason('');
    setAdminNote('');
    setActionError('');
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!target || saving || (decision === 'REJECTED' && !rejectionReason.trim())) return;
    setSaving(true);
    setActionError('');
    try {
      const response = await reviewAdminWithdrawal(target.id, {
        status: decision,
        ...(decision === 'REJECTED' ? { rejectionReason: rejectionReason.trim() } : {}),
        ...(adminNote.trim() ? { adminNote: adminNote.trim() } : {}),
      });
      setNotice(response.message);
      setTarget(null);
      setRevision((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t('finance.withdrawals.processErr'));
    } finally {
      setSaving(false);
    }
  }

  const tone = (value: AdminWithdrawalStatus) =>
    value === 'APPROVED' || value === 'COMPLETED'
      ? 'green'
      : value === 'REJECTED'
        ? 'red'
        : 'amber';
  return (
    <Panel
      title={t('finance.withdrawals.title')}
      subtitle={t('finance.withdrawals.subtitle')}
      icon={<WalletCards size={19} />}
      action={
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} /> {t('finance.withdrawals.refresh')}
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs text-slate-500">
          {t('finance.withdrawals.statusLabel')}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminWithdrawalStatus | '');
              setPage(1);
            }}
            className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800"
          >
            <option value="">{t('finance.withdrawals.allStatuses')}</option>
            {WITHDRAWAL_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`finance.withdrawals.statuses.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">
          {t('finance.withdrawals.totalCount', { count: result?.total ?? 0 })}
        </span>
      </div>
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('finance.withdrawals.loading')}
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              {t('finance.withdrawals.retry')}
            </Button>
          </div>
        </div>
      ) : !result?.items.length ? (
        <EmptyState text={t('finance.withdrawals.empty')} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    t('finance.withdrawals.cols.seller'),
                    t('finance.withdrawals.cols.amount'),
                    t('finance.withdrawals.cols.bank'),
                    t('finance.withdrawals.cols.submittedAt'),
                    t('finance.withdrawals.cols.status'),
                    t('finance.withdrawals.cols.actions'),
                  ].map((label) => (
                    <th key={label} scope="col" className="p-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{item.sellerName}</p>
                      <p className="mt-1 text-slate-500">{item.sellerEmail}</p>
                      {item.sellerPhone && (
                        <p className="mt-1 text-slate-500">{item.sellerPhone}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 font-bold text-slate-900">
                      {formatMoney(item.amount)}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{item.bankName}</p>
                      <p className="mt-1">{item.accountNumber}</p>
                      <p className="mt-1 uppercase text-slate-500">{item.accountHolderName}</p>
                    </td>
                    <td className="whitespace-nowrap p-3 text-slate-500">{date(item.createdAt)}</td>
                    <td className="p-3">
                      <Badge tone={tone(item.status)}>
                        {t(`finance.withdrawals.statuses.${item.status}`)}
                      </Badge>
                      {item.rejectionReason && (
                        <p className="mt-2 max-w-48 text-rose-700">
                          {t('finance.withdrawals.reasonPrefix', { reason: item.rejectionReason })}
                        </p>
                      )}
                      {item.adminNote && (
                        <p className="mt-2 max-w-48 text-slate-500">
                          {t('finance.withdrawals.notePrefix', { note: item.adminNote })}
                        </p>
                      )}
                      {item.reviewedBy && (
                        <p className="mt-2 text-slate-400">
                          {t('finance.withdrawals.reviewedBy', {
                            name: item.reviewedBy.fullName,
                            date: date(item.reviewedAt),
                          })}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {item.status === 'PENDING' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => openReview(item, 'APPROVED')}>
                            {t('finance.withdrawals.approveBtn')}
                          </Button>
                          <Button variant="danger" onClick={() => openReview(item, 'REJECTED')}>
                            {t('finance.withdrawals.rejectBtn')}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400">{t('finance.withdrawals.processed')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              {t('finance.withdrawals.pageLabel', {
                page,
                totalPages: Math.max(1, result.totalPages),
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t('finance.withdrawals.prev')}
              </Button>
              <Button
                variant="secondary"
                disabled={page >= result.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('finance.withdrawals.next')}
              </Button>
            </div>
          </div>
        </>
      )}
      {target && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setTarget(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-review-title"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="withdrawal-review-title" className="text-lg font-bold text-slate-900">
              {decision === 'APPROVED'
                ? t('finance.withdrawals.modalApproveTitle')
                : t('finance.withdrawals.modalRejectTitle')}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {target.sellerName} · {formatMoney(target.amount)} · {target.bankName}{' '}
              {target.accountNumber}
            </p>
            <form onSubmit={(event) => void submitReview(event)} className="mt-4 space-y-3">
              {decision === 'REJECTED' && (
                <label className="block text-xs font-medium text-slate-600">
                  {t('finance.withdrawals.rejectReasonLabel')}
                  <textarea
                    required
                    autoFocus
                    maxLength={1000}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"
                  />
                </label>
              )}
              <label className="block text-xs font-medium text-slate-600">
                {t('finance.withdrawals.adminNoteLabel')}
                <textarea
                  maxLength={1000}
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"
                />
              </label>
              {decision === 'APPROVED' && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  {t('finance.withdrawals.approveHint')}
                </p>
              )}
              {actionError && (
                <p role="alert" className="text-sm text-rose-700">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setTarget(null)}
                >
                  {t('finance.withdrawals.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant={decision === 'REJECTED' ? 'danger' : 'primary'}
                  disabled={saving || (decision === 'REJECTED' && !rejectionReason.trim())}
                >
                  {saving
                    ? t('finance.withdrawals.processing')
                    : decision === 'APPROVED'
                      ? t('finance.withdrawals.confirmApprove')
                      : t('finance.withdrawals.confirmReject')}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Panel>
  );
}
