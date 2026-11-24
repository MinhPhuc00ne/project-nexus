import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import Popup from '../../components/Popup';
import { Button, EmptyState, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { getIntlLocale } from '../../i18n/config';
import {
  deleteStaffModeratedReview,
  getStaffModeratedReviews,
  type StaffModeratedReview,
} from '../../services/staff';
import { validateStaffReviewDeletion } from './reviewModeration.helpers';

const PAGE_SIZE = 20;

function formatReviewDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale);
}

export default function StaffReviewsPanel() {
  const { t, i18n } = useTranslation('staff');
  const locale = getIntlLocale(i18n.language);
  const [type, setType] = useState<'PRODUCT' | 'SHOP'>('PRODUCT');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [items, setItems] = useState<StaffModeratedReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<StaffModeratedReview | null>(null);
  const [reason, setReason] = useState('');
  const [pointsToDeduct, setPointsToDeduct] = useState('1');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void getStaffModeratedReviews({
      page,
      limit: PAGE_SIZE,
      type,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setError(cause instanceof Error ? cause.message : t('reviews.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, type, debouncedSearch, revision, t]);

  function openDelete(review: StaffModeratedReview): void {
    setSelected(review);
    setReason('');
    setPointsToDeduct('1');
    setDeleteError('');
  }

  async function confirmDelete(): Promise<void> {
    if (!selected || deleting) return;
    const points = Number(pointsToDeduct);
    const validation = validateStaffReviewDeletion(
      reason,
      points,
      selected.reviewer.reputationScore,
    );
    if (validation === 'reasonRequired') {
      setDeleteError(t('reviews.reasonRequired'));
      return;
    }
    if (validation === 'pointsInvalid') {
      setDeleteError(t('reviews.pointsInvalid', { max: selected.reviewer.reputationScore }));
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      await deleteStaffModeratedReview(selected, { reason: reason.trim(), pointsToDeduct: points });
      const nextTotal = Math.max(0, total - 1);
      const lastPage = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      setSelected(null);
      setPage((current) => Math.min(current, lastPage));
      setRevision((current) => current + 1);
    } catch (cause: unknown) {
      setDeleteError(cause instanceof Error ? cause.message : t('reviews.deleteError'));
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mt-4 space-y-5" aria-label={t('reviews.sectionAria')}>
      <Panel
        title={t('reviews.title')}
        subtitle={t('reviews.description')}
        icon={<Star size={18} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRevision((current) => current + 1)}
          >
            <RefreshCw size={14} /> {t('reviews.refresh')}
          </Button>
        }
      >
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {t('reviews.editUnavailable')}
        </p>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="min-w-52 flex-1">
            <span className="sr-only">{t('reviews.searchLabel')}</span>
            <span className="relative block">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('reviews.searchPlaceholder')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </span>
          </label>
          <select
            aria-label={t('reviews.typeLabel')}
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value as typeof type);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="PRODUCT">{t('reviews.product')}</option>
            <option value="SHOP">{t('reviews.shop')}</option>
          </select>
        </div>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            {t('reviews.loading')}
          </p>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-blue-50 text-slate-500">
                <tr>
                  <th className="p-3">{t('reviews.target')}</th>
                  <th className="p-3">{t('reviews.reviewer')}</th>
                  <th className="p-3">{t('reviews.rating')}</th>
                  <th className="p-3">{t('reviews.comment')}</th>
                  <th className="p-3">{t('reviews.createdAt')}</th>
                  <th className="p-3">{t('reviews.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((review) => (
                  <tr key={`${review.type}:${review.id}`} className="align-top hover:bg-slate-50">
                    <td className="max-w-48 p-3">
                      <span className="font-semibold text-slate-800">{review.target.name}</span>
                      <span className="mt-1 block text-slate-500">
                        {t(review.type === 'PRODUCT' ? 'reviews.product' : 'reviews.shop')} · #
                        {review.orderId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="max-w-48 p-3">
                      <span className="font-medium text-slate-800">{review.reviewer.fullName}</span>
                      <span className="mt-1 block break-all text-slate-500">
                        {review.reviewer.email}
                      </span>
                      <span className="mt-1 block text-slate-500">
                        {t('reviews.reputation')}: {review.reviewer.reputationScore}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3 font-semibold text-amber-600">
                      ★ {review.rating}/5
                    </td>
                    <td className="max-w-80 p-3">
                      <p className="line-clamp-3 whitespace-pre-wrap">
                        {review.comment || t('reviews.noComment')}
                      </p>
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {formatReviewDate(review.createdAt, locale)}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="danger"
                        disabled={review.reviewer.reputationScore < 1}
                        onClick={() => openDelete(review)}
                      >
                        <Trash2 size={14} /> {t('reviews.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text={search ? t('reviews.noResults') : t('reviews.empty')} />
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
            <span>{t('reviews.pagination', { page, totalPages, total })}</span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t('reviews.previous')}
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('reviews.next')}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <Popup
        isOpen={Boolean(selected)}
        title={t('reviews.deleteTitle')}
        size="md"
        onClose={() => {
          if (!deleting) setSelected(null);
        }}
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {t('reviews.deleteDescription', {
                name: selected.reviewer.fullName,
                target: selected.target.name,
              })}
            </p>
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              {t('reviews.penaltyNotice', { score: selected.reviewer.reputationScore })}
            </p>
            <label className="block text-sm font-medium text-slate-700">
              {t('reviews.reasonLabel')}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                maxLength={1000}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {t('reviews.pointsLabel')}
              <input
                type="number"
                min={1}
                max={selected.reviewer.reputationScore}
                step={1}
                value={pointsToDeduct}
                onChange={(event) => setPointsToDeduct(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </label>
            {deleteError && (
              <p role="alert" className="text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={deleting} onClick={() => setSelected(null)}>
                {t('reviews.cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={deleting || selected.reviewer.reputationScore < 1}
                onClick={() => void confirmDelete()}
              >
                <Trash2 size={14} /> {deleting ? t('reviews.deleting') : t('reviews.confirmDelete')}
              </Button>
            </div>
          </div>
        )}
      </Popup>
    </section>
  );
}
