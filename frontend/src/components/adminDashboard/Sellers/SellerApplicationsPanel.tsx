import { RefreshCw, Store } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Popup from '../../Popup';
import { useToast } from '../../ToastNotification';
import { getIntlLocale } from '../../../i18n/config';
import { API_BASE_URL } from '../../../services/api';
import {
  approveSellerRequest,
  getSellerRequestById,
  rejectSellerRequest,
} from '@/features/admin/services/admin';
import type { SellerUpgradeRequest } from '@/features/account/services/users';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { useAdminSellerRequests, type SellerRequestFilter } from './AdminSellerRequests';
import type { AdminTabProps } from '../shared/adminTypes';

function attachmentLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/`);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/*
 * Component used in two places: AdminSellersPage and AdminDashboardPage.
 * preview=true: show at most 2 applications, hide search/pagination.
 * Flow: read list from context -> render -> choose decision -> confirm -> call API.
 * List API lives in AdminSellerRequests.tsx; this file calls detail and approve/reject APIs.
 */
export default function SellerApplicationsPanel({
  actions,
  preview = false,
}: Pick<AdminTabProps, 'actions'> & { preview?: boolean }) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const state = useAdminSellerRequests();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<SellerUpgradeRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [decision, setDecision] = useState<{
    request: SellerUpgradeRequest;
    approve: boolean;
  } | null>(null);
  // Confirmation form state; rejection requires entering a reason.
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Ref updates immediately to block duplicate submits on rapid clicks before React disables the button.
  const inFlight = useRef(false);
  // Detail view sequence counter: ignore stale responses if another application opened or popup closed.
  const detailRevision = useRef(0);
  // Avoid updating local state if the request finishes after unmounting.
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      detailRevision.current++;
    };
  }, []);
  // Search within currently loaded page items rather than full backend data.
  const visible = state.result.items.filter((item) =>
    `${item.storeName} ${item.user?.fullName ?? ''} ${item.user?.email ?? ''} ${item.businessEmail ?? ''}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  // Only call getSellerRequestById when clicking "View Application" using the selected row ID.
  const openDetail = async (id: string) => {
    const current = ++detailRevision.current;
    setDetailOpen(true);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const request = await getSellerRequestById(id);
      if (current === detailRevision.current) setDetail(request);
    } catch (cause) {
      if (current === detailRevision.current)
        setDetailError(cause instanceof Error ? cause.message : t('sellers.loadDetailErr'));
    } finally {
      if (current === detailRevision.current) setDetailLoading(false);
    }
  };
  // Only the "Confirm" button inside the form submits to the API; inline approve/reject buttons only open confirmation.
  const submit = async (event: FormEvent) => {
    // Prevent browser page reload on form submit.
    event.preventDefault();
    if (!decision || inFlight.current) return;
    if (!decision.approve && !reason.trim()) {
      setActionError(t('sellers.rejectReasonRequired'));
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setActionError('');
    try {
      // Use application ID, not the applicant account ID.
      const result = decision.approve
        ? await approveSellerRequest(decision.request.id)
        : await rejectSellerRequest(decision.request.id, reason.trim());
      // Provider reloads list and pending count, keeping sidebar and overview in sync.
      state.refresh();
      if (!active.current) return;
      toast.success(result.message);
      setDecision(null);
      setDetailOpen(false);
    } catch (cause) {
      if (active.current) {
        const message = cause instanceof Error ? cause.message : t('sellers.processErr');
        setActionError(message);
        toast.error(message);
      }
    } finally {
      inFlight.current = false;
      if (active.current) setSubmitting(false);
    }
  };
  // Open confirmation dialog and clear previous reason/error; no API call yet.
  const chooseDecision = (request: SellerUpgradeRequest, approve: boolean) => {
    setDecision({ request, approve });
    setReason('');
    setActionError('');
  };
  const documentUrl = attachmentLink(detail?.attachmentUrl ?? null);
  return (
    <Panel
      title={t('sellers.title')}
      subtitle={t('sellers.subtitle')}
      icon={<Store size={19} />}
      action={<Badge>{t('sellers.pendingBadge', { count: state.pendingTotal })}</Badge>}
    >
      {/* Changing the filter triggers the provider to re-fetch; ALL omits status parameter. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['PENDING', 'ALL', 'APPROVED', 'REJECTED'] as SellerRequestFilter[]).map((value) => (
          <Button
            key={value}
            variant={state.status === value ? 'primary' : 'secondary'}
            aria-pressed={state.status === value}
            onClick={() => state.changeStatus(value)}
          >
            {value === 'ALL' ? t('sellers.allFilter') : t(`sellers.statuses.${value}`)}
          </Button>
        ))}
        <Button variant="secondary" disabled={state.loading} onClick={state.refresh}>
          <RefreshCw size={14} /> {t('sellers.refresh')}
        </Button>
      </div>
      {!preview && (
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('sellers.searchPlaceholder')}
          />
        </div>
      )}
      {/* Prioritize loading/error state before rendering the application list. */}
      {state.loading ? (
        <p role="status" className="py-8 text-center text-slate-500">
          {t('sellers.loading')}
        </p>
      ) : state.error ? (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{state.error}</p>
          <Button variant="secondary" onClick={state.refresh}>
            {t('sellers.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className={preview ? 'space-y-3' : 'grid gap-4 xl:grid-cols-2'}>
            {/* Each request renders a card; overview preview shows at most 2 cards. */}
            {(preview ? visible.slice(0, 2) : visible).map((request) => (
              <article
                key={request.id}
                className="space-y-3 rounded-xl border border-blue-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-bold">{request.storeName}</h3>
                    <p className="mt-1 break-words text-xs text-slate-600">
                      {t('sellers.applicant', {
                        name: request.user?.fullName || request.user?.email || request.userId,
                      })}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">{request.user?.email}</p>
                  </div>
                  <Badge
                    tone={
                      request.status === 'APPROVED'
                        ? 'green'
                        : request.status === 'REJECTED'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {t(`sellers.statuses.${request.status}`)}
                  </Badge>
                </div>
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">{t('sellers.contact')}</dt>
                    <dd>{request.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('sellers.submittedAt')}</dt>
                    <dd>{new Date(request.createdAt).toLocaleString(locale)}</dd>
                  </div>
                </dl>
                {request.rejectionReason && (
                  <p className="text-xs text-red-700">
                    {t('sellers.rejectionReason', { reason: request.rejectionReason })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void openDetail(request.id)}>
                    {t('sellers.viewApp')}
                  </Button>
                  {/* Only pending applications display approve/reject buttons. */}
                  {request.status === 'PENDING' && (
                    <>
                      <Button
                        variant="danger"
                        disabled={submitting}
                        onClick={() => chooseDecision(request, false)}
                      >
                        {t('sellers.rejectBtn')}
                      </Button>
                      <Button disabled={submitting} onClick={() => chooseDecision(request, true)}>
                        {t('sellers.approveBtn')}
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && <EmptyState text={t('sellers.empty')} />}
          {/* Changing page in context fetches the next page from the backend. */}
          {!preview && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>
                {t('sellers.pagination', {
                  total: state.result.total,
                  page: state.page,
                  totalPages: Math.max(1, state.result.totalPages),
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={state.page <= 1}
                  onClick={() => state.setPage(state.page - 1)}
                >
                  {t('sellers.prevPage')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={state.page >= state.result.totalPages}
                  onClick={() => state.setPage(state.page + 1)}
                >
                  {t('sellers.nextPage')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {preview && (
        <button
          onClick={() => actions.navigate('sellers')}
          className="mt-4 text-xs font-semibold text-primary hover:underline"
        >
          {t('sellers.viewAll')}
        </button>
      )}
      {/* Popup 1: shows application details fetched separately by application ID. */}
      <Popup
        isOpen={detailOpen}
        onClose={() => {
          detailRevision.current++;
          setDetailOpen(false);
        }}
        title={t('sellers.detailTitle')}
        size="lg"
      >
        {detailLoading ? (
          <p role="status">{t('sellers.loadingDetail')}</p>
        ) : detailError ? (
          <p role="alert">{detailError}</p>
        ) : (
          detail && (
            <div className="space-y-4 text-sm">
              <h3 className="font-bold">{detail.storeName}</h3>
              <dl className="grid gap-3 break-words sm:grid-cols-2">
                {[
                  [t('sellers.fields.applicant'), detail.user?.fullName || detail.userId],
                  [t('sellers.fields.accountEmail'), detail.user?.email],
                  [t('sellers.fields.phone'), detail.phone],
                  [t('sellers.fields.businessEmail'), detail.businessEmail],
                  [
                    t('sellers.fields.address'),
                    detail.formattedAddress?.trim() ||
                      [detail.street, detail.ward, detail.district, detail.city]
                        .map((part) => part?.trim())
                        .filter(Boolean)
                        .join(', '),
                  ],
                  [t('sellers.fields.identity'), detail.identityCardNumber],
                  [
                    t('sellers.fields.submittedAt'),
                    new Date(detail.createdAt).toLocaleString(locale),
                  ],
                  [t('sellers.fields.status'), t(`sellers.statuses.${detail.status}`)],
                  [
                    t('sellers.fields.reviewedAt'),
                    detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString(locale) : null,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd>{value || t('sellers.notProvided')}</dd>
                  </div>
                ))}
              </dl>
              <p className="whitespace-pre-wrap">
                {detail.storeDescription || t('sellers.noDescription')}
              </p>
              {documentUrl ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-semibold text-blue-700 underline"
                >
                  {t('sellers.openAttachment')}
                </a>
              ) : (
                <p>{t('sellers.noAttachment')}</p>
              )}
              {detail.rejectionReason && (
                <p className="text-red-700">
                  {t('sellers.rejectionReason', { reason: detail.rejectionReason })}
                </p>
              )}
              {detail.status === 'PENDING' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    disabled={submitting}
                    onClick={() => chooseDecision(detail, false)}
                  >
                    {t('sellers.rejectBtn')}
                  </Button>
                  <Button disabled={submitting} onClick={() => chooseDecision(detail, true)}>
                    {t('sellers.approveBtn')}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </Popup>
      {/* Popup 2: confirms approval or collects rejection reason; submits only on confirmation. */}
      <Popup
        isOpen={Boolean(decision)}
        onClose={() => {
          if (!inFlight.current) setDecision(null);
        }}
        title={
          decision?.approve ? t('sellers.decisionApproveTitle') : t('sellers.decisionRejectTitle')
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <p>
            {decision?.approve
              ? t('sellers.decisionApproveConfirm', {
                  storeName: decision.request.storeName,
                })
              : t('sellers.decisionRejectConfirm', {
                  storeName: decision?.request.storeName ?? '',
                })}
          </p>
          {!decision?.approve && (
            <label className="block text-sm">
              {t('sellers.rejectReasonLabel')}
              <textarea
                required
                disabled={submitting}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border p-3"
              />
            </label>
          )}
          {actionError && (
            <p role="alert" className="text-sm text-red-700">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={submitting} onClick={() => setDecision(null)}>
              {t('sellers.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || (!decision?.approve && !reason.trim())}>
              {submitting ? t('sellers.processing') : t('sellers.confirm')}
            </Button>
          </div>
        </form>
      </Popup>
    </Panel>
  );
}
