import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import {
  createAdminShopViolation,
  getAdminShopActionLogs,
  getAdminShopById,
  getAdminShopViolations,
  resolveAdminShopAppeal,
} from '@/features/admin/services/admin';
import type { AdminShopDetail } from '@/features/admin/types/admin.types';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import Popup from '../../Popup';
import { Badge, Button } from '../shared/AdminUI';
import { useToast } from '../../ToastNotification';
import ShopOrdersPanel from './ShopOrdersPanel';

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  emptyLabel,
}: {
  label: string;
  children: ReactNode;
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children || emptyLabel}</dd>
    </div>
  );
}

function evidenceLink(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function evidenceUrls(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export default function ShopDetail({
  shopId,
  onClose,
  onMutation,
}: {
  shopId: string;
  onClose: () => void;
  onMutation?: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const emptyInfo = t('stores.detail.noInfo');
  const formatDate = (value: string) => new Date(value).toLocaleString(locale);
  const translateLabel = (key: string) => t(`stores.detail.labels.${key}`, { defaultValue: key });
  const { token } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<AdminShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [violationOpen, setViolationOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setDetail(null);
    void Promise.all([
      getAdminShopById(shopId, controller.signal),
      getAdminShopViolations(shopId, controller.signal),
      getAdminShopActionLogs(shopId, controller.signal),
    ])
      .then(([result, violations, actionLogs]) => {
        if (controller.signal.aborted) return;
        const pending = violations.items.filter(
          (item) => item.status === 'PENDING' || item.status === 'INVESTIGATING',
        ).length;
        const confirmed = violations.items.filter((item) => item.status === 'CONFIRMED').length;
        setDetail({
          ...result,
          violations: {
            summary: { total: violations.total, pending, confirmed },
            items: violations.items,
          },
          moderationHistory: actionLogs.items,
        });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : t('stores.detail.loadErr'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [shopId, token, revision, t]);

  const shop = detail?.shop;
  const address = shop?.contact.address;
  const handleMutationSuccess = (message: string) => {
    toast.success(message);
    setRevision((value) => value + 1);
    onMutation?.();
  };

  return (
    <Popup
      isOpen
      onClose={onClose}
      title={t('stores.detail.title')}
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('stores.detail.close')}
        </Button>
      }
    >
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('stores.detail.loading')}
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            {t('stores.detail.retry')}
          </Button>
        </div>
      ) : (
        detail &&
        shop && (
          <div className="space-y-6">
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="break-words text-lg font-bold">{shop.storeName}</h3>
                <Badge
                  tone={
                    shop.status.currentStatus === 'ACTIVE'
                      ? 'green'
                      : shop.status.currentStatus === 'SUSPENDED'
                        ? 'red'
                        : 'gray'
                  }
                >
                  {translateLabel(shop.status.currentStatus)}
                </Badge>
                {shop.status.isShopSuspended && (
                  <Button variant="primary" onClick={() => setAppealOpen(true)}>
                    {t('stores.detail.restoreByAppeal')}
                  </Button>
                )}
              </div>
              {shop.storeDescription && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {shop.storeDescription}
                </p>
              )}
              {shop.status.suspensionReason && (
                <p className="mt-2 break-words text-sm text-red-700">
                  {t('stores.detail.suspensionReason', { reason: shop.status.suspensionReason })}
                </p>
              )}
            </div>
            <Section title={t('stores.detail.infoSection')}>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label={t('stores.detail.ownerName')} emptyLabel={emptyInfo}>
                  {shop.owner.fullName}
                </Field>
                <Field label={t('stores.detail.ownerEmail')} emptyLabel={emptyInfo}>
                  {shop.owner.email}
                </Field>
                <Field label={t('stores.detail.contactPhone')} emptyLabel={emptyInfo}>
                  {shop.contact.phone}
                </Field>
                <Field label={t('stores.detail.businessEmail')} emptyLabel={emptyInfo}>
                  {shop.contact.businessEmail}
                </Field>
                <Field label={t('stores.detail.openedAt')} emptyLabel={emptyInfo}>
                  {formatDate(shop.openedAt)}
                </Field>
                <Field label={t('stores.detail.identityDoc')} emptyLabel={emptyInfo}>
                  {shop.contact.identityCardNumber}
                </Field>
                <Field label={t('stores.detail.address')} emptyLabel={emptyInfo}>
                  {address &&
                    (address.formattedAddress ||
                      [address.street, address.ward, address.district, address.city]
                        .filter(Boolean)
                        .join(', '))}
                </Field>
                <Field label={t('stores.detail.reputationTrust')} emptyLabel={emptyInfo}>
                  {shop.status.reputationScore} / {translateLabel(shop.status.trustLevel)}
                </Field>
              </dl>
            </Section>
            <Section title={t('stores.detail.productsSection')}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(
                  [
                    [t('stores.detail.totalProducts'), detail.products.breakdown.total],
                    [t('stores.detail.activeProducts'), detail.products.breakdown.active],
                    [t('stores.detail.outOfStock'), detail.products.breakdown.outOfStock],
                    [t('stores.detail.hiddenProducts'), detail.products.breakdown.inactive],
                    [t('stores.detail.draftProducts'), detail.products.breakdown.draft],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
              {detail.products.sampleList.length ? (
                <>
                  <p className="text-xs text-slate-500">
                    {t('stores.detail.sampleCount', {
                      shown: detail.products.sampleList.length,
                      total: detail.products.breakdown.total,
                    })}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {[
                            t('stores.detail.productCols.product'),
                            t('stores.detail.productCols.category'),
                            t('stores.detail.productCols.price'),
                            t('stores.detail.productCols.stock'),
                            t('stores.detail.productCols.status'),
                          ].map((title) => (
                            <th key={title} scope="col" className="p-3">
                              {title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.products.sampleList.map((product) => (
                          <tr key={product.id}>
                            <td className="max-w-64 p-3">
                              <div className="flex items-center gap-2">
                                {product.thumbnail && (
                                  <img
                                    src={product.thumbnail}
                                    alt=""
                                    className="size-10 rounded object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <span className="break-words font-medium">{product.title}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {product.category?.name || t('stores.detail.uncategorized')}
                            </td>
                            <td className="p-3">{formatCurrency(product.basePrice)}</td>
                            <td className="p-3">
                              {product.availableQty} / {product.totalQty}
                            </td>
                            <td className="p-3">
                              <Badge
                                tone={
                                  product.status === 'ACTIVE'
                                    ? product.isOutOfStock
                                      ? 'amber'
                                      : 'green'
                                    : 'gray'
                                }
                              >
                                {product.status === 'ACTIVE'
                                  ? product.isOutOfStock
                                    ? t('stores.detail.outOfStock')
                                    : t('stores.detail.activeProducts')
                                  : product.status === 'INACTIVE'
                                    ? t('stores.detail.hiddenProducts')
                                    : translateLabel(product.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">{t('stores.detail.noProducts')}</p>
              )}
            </Section>
            <ShopOrdersPanel shopId={shopId} />
            <Section
              title={t('stores.detail.violationsSection')}
              action={
                <Button variant="secondary" onClick={() => setViolationOpen(true)}>
                  {t('stores.detail.recordViolationBtn')}
                </Button>
              }
            >
              <p className="text-xs text-slate-500">
                {t('stores.detail.violationsSummary', {
                  total: detail.violations.summary.total,
                  pending: detail.violations.summary.pending,
                  confirmed: detail.violations.summary.confirmed,
                })}
              </p>
              {detail.violations.items.length ? (
                detail.violations.items.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="break-words font-semibold">{item.title}</h4>
                      <Badge
                        tone={
                          item.status === 'CONFIRMED'
                            ? 'red'
                            : item.status === 'DISMISSED'
                              ? 'gray'
                              : 'amber'
                        }
                      >
                        {translateLabel(item.status)}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{item.description}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(item.createdAt)} ·{' '}
                      {t('stores.detail.reportedBy', {
                        name: item.reporter?.fullName || emptyInfo,
                      })}
                    </p>
                    {item.penaltyLevel && (
                      <p>{t('stores.detail.penaltyLevel', { level: item.penaltyLevel })}</p>
                    )}
                    {item.resolutionNotes && (
                      <p className="whitespace-pre-wrap break-words">
                        {t('stores.detail.resolutionNotes', { notes: item.resolutionNotes })}
                      </p>
                    )}
                    {item.handledBy && (
                      <p className="text-xs text-slate-500">
                        {t('stores.detail.handledBy', { name: item.handledBy.fullName })}
                        {item.handledAt && ` · ${formatDate(item.handledAt)}`}
                      </p>
                    )}
                    {!!evidenceUrls(item.evidenceUrls).length && (
                      <div className="flex flex-wrap gap-3">
                        {evidenceUrls(item.evidenceUrls).map((url, index) => {
                          const href = evidenceLink(url);
                          return href ? (
                            <a
                              key={`${url}-${index}`}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-700 underline"
                            >
                              {t('stores.detail.evidenceIndex', { index: index + 1 })}
                            </a>
                          ) : null;
                        })}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t('stores.detail.noViolations')}</p>
              )}
            </Section>
            <Section title={t('stores.detail.moderationSection')}>
              {detail.moderationHistory.length ? (
                <ul className="space-y-3">
                  {detail.moderationHistory.map((log) => (
                    <li key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            log.action === 'SUSPEND'
                              ? 'red'
                              : log.action === 'RESTORE'
                                ? 'green'
                                : 'amber'
                          }
                        >
                          {translateLabel(log.action)}
                        </Badge>
                        <span>{log.admin.fullName}</span>
                        <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">
                        {log.reason || t('stores.detail.noNote')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">{t('stores.detail.noModeration')}</p>
              )}
            </Section>
            {violationOpen && (
              <CreateShopViolationDialog
                shopName={shop.storeName}
                shopId={shop.id}
                onClose={() => setViolationOpen(false)}
                onSuccess={(message) => {
                  setViolationOpen(false);
                  handleMutationSuccess(message);
                }}
              />
            )}
            {appealOpen && (
              <ResolveShopAppealDialog
                shopName={shop.storeName}
                shopId={shop.id}
                onClose={() => setAppealOpen(false)}
                onSuccess={(message) => {
                  setAppealOpen(false);
                  handleMutationSuccess(message);
                }}
              />
            )}
          </div>
        )
      )}
    </Popup>
  );
}

function CreateShopViolationDialog({
  shopId,
  shopName,
  onClose,
  onSuccess,
}: {
  shopId: string;
  shopName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { t } = useTranslation('admin');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [penaltyLevel, setPenaltyLevel] = useState('WARNING');
  const [status, setStatus] = useState<'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED'>(
    'CONFIRMED',
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const close = () => {
    if (!inFlightRef.current) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPending(true);
    setError('');

    try {
      const result = await createAdminShopViolation(shopId, {
        title: title.trim(),
        description: description.trim(),
        evidenceUrls: evidenceText
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter(Boolean),
        penaltyLevel,
        status,
        ...(resolutionNotes.trim() ? { resolutionNotes: resolutionNotes.trim() } : {}),
      });
      onSuccess(result.message);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('stores.detail.violationModal.saveErr'));
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title={t('stores.detail.violationModal.title')}
      onClose={close}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          {t('stores.detail.violationModal.subtitlePrefix')}
          <strong>{shopName}</strong>.
        </p>
        <label className="block text-sm font-medium">
          {t('stores.detail.violationModal.titleLabel')}
          <input
            required
            maxLength={200}
            value={title}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('stores.detail.violationModal.descLabel')}
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={description}
            disabled={pending}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('stores.detail.violationModal.evidenceLabel')}
          <textarea
            rows={2}
            value={evidenceText}
            disabled={pending}
            onChange={(event) => setEvidenceText(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
            placeholder="https://..."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t('stores.detail.violationModal.penaltyLabel')}
            <select
              value={penaltyLevel}
              disabled={pending}
              onChange={(event) => setPenaltyLevel(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
            >
              <option value="WARNING">{t('stores.detail.violationModal.penalties.WARNING')}</option>
              <option value="PENALTY_POINTS">
                {t('stores.detail.violationModal.penalties.PENALTY_POINTS')}
              </option>
              <option value="TEMPORARY_SUSPENSION">
                {t('stores.detail.violationModal.penalties.TEMPORARY_SUSPENSION')}
              </option>
              <option value="PERMANENT_BAN">
                {t('stores.detail.violationModal.penalties.PERMANENT_BAN')}
              </option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t('stores.detail.violationModal.statusLabel')}
            <select
              value={status}
              disabled={pending}
              onChange={(event) =>
                setStatus(
                  event.target.value as 'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED',
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
            >
              <option value="PENDING">{t('stores.detail.labels.PENDING')}</option>
              <option value="INVESTIGATING">{t('stores.detail.labels.INVESTIGATING')}</option>
              <option value="CONFIRMED">{t('stores.detail.labels.CONFIRMED')}</option>
              <option value="DISMISSED">{t('stores.detail.labels.DISMISSED')}</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          {t('stores.detail.violationModal.notesLabel')}
          <textarea
            rows={2}
            value={resolutionNotes}
            disabled={pending}
            onChange={(event) => setResolutionNotes(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={pending}>
            {t('stores.detail.violationModal.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending
              ? t('stores.detail.violationModal.saving')
              : t('stores.detail.violationModal.submit')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

function ResolveShopAppealDialog({
  shopId,
  shopName,
  onClose,
  onSuccess,
}: {
  shopId: string;
  shopName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [restoredScore, setRestoredScore] = useState('100');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const close = () => {
    if (!inFlightRef.current) onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current) return;
    const score = Number(restoredScore);
    if (!Number.isInteger(score) || score < 50 || score > 2147483647) {
      setError(t('stores.detail.appealModal.invalidScoreErr'));
      return;
    }

    inFlightRef.current = true;
    setPending(true);
    setError('');
    try {
      const result = await resolveAdminShopAppeal(shopId, {
        reason: reason.trim(),
        restoredScore: score,
      });
      onSuccess(result.message);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('stores.detail.appealModal.resolveErr'));
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title={t('stores.detail.appealModal.title')}
      onClose={close}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          {t('stores.detail.appealModal.subtitlePrefix')}
          <strong>{shopName}</strong>.
        </p>
        <label className="block text-sm font-medium">
          {t('stores.detail.appealModal.reasonLabel')}
          <textarea
            required
            maxLength={1000}
            rows={4}
            value={reason}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('stores.detail.appealModal.scoreLabel')}
          <input
            required
            type="number"
            min={50}
            max={2147483647}
            step={1}
            value={restoredScore}
            disabled={pending}
            onChange={(event) => setRestoredScore(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={pending}>
            {t('stores.detail.appealModal.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending
              ? t('stores.detail.appealModal.restoring')
              : t('stores.detail.appealModal.submit')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
