import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Popup from '../../Popup';
import { Badge, Button } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { getAdminOrderById } from '@/features/admin/services/admin';
import { getAdminReturnOrder, processAdminReturn } from '@/features/admin/services/admin-returns';
import type { AdminOrderDetail } from '../../../types/admin-order.types';
import {
  returnStatusLabels,
  type AdminReturnOrder,
  type ReturnAction,
  type ReturnStatus,
} from '../../../types/admin-return.types';
import { date, message, money, OrderBadge } from './orderPresentation';

type Action = 'approve' | 'reject' | 'waybill' | 'receive';
const RETURN_ACTIONS: Action[] = ['approve', 'reject', 'waybill', 'receive'];

export default function ReturnDetail({
  orderId,
  onClose,
  onUpdated,
}: {
  orderId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<{ order: AdminOrderDetail; returns: AdminReturnOrder } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      getAdminOrderById(orderId, controller.signal),
      getAdminReturnOrder(orderId, controller.signal),
    ])
      .then(([order, returns]) => {
        if (!controller.signal.aborted) setData({ order, returns });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderId, revision]);

  async function submit(payload: ReturnAction) {
    if (busy.current || loading || error) return;
    busy.current = true;
    setPending(true);
    setActionError('');
    setNotice('');
    try {
      const updated = await processAdminReturn(orderId, payload);
      setData((current) =>
        current ? { ...current, returns: { ...current.returns, afterSales: updated } } : null,
      );
      setNotice(t('orders.returns.detail.processedNotice'));
      setAction(null);
      onUpdated();
    } catch (cause) {
      setActionError(message(cause));
    } finally {
      // A GHN timeout can still change the server state. Always reload before another attempt.
      setRevision((value) => value + 1);
      setPending(false);
      busy.current = false;
    }
  }

  const request = data?.returns.afterSales;
  const evidence = Array.isArray(request?.evidenceUrls)
    ? request.evidenceUrls.filter(
        (url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url),
      )
    : [];
  const blocked = pending || loading || !!error;

  return (
    <Popup
      isOpen
      title={t('orders.returns.detail.title')}
      size="xl"
      onClose={() => {
        if (!pending) onClose();
      }}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <div className="space-y-5">
        {loading && (
          <p role="status" className="text-sm text-slate-500">
            {t('orders.returns.detail.loading')}
          </p>
        )}
        {error && (
          <div role="alert" className="space-y-2 text-sm text-red-700">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              {t('orders.returns.detail.retry')}
            </Button>
          </div>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-700">
            {notice}
          </p>
        )}
        {actionError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
        {data && request?.kind === 'RETURN' && (
          <>
            <DetailFields
              fields={[
                [t('orders.returns.detail.fields.order'), data.order.id],
                [
                  t('orders.returns.detail.fields.source'),
                  data.returns.isAuction
                    ? t('orders.returns.detail.sourceAuction')
                    : t('orders.returns.detail.sourceNormal'),
                ],
                [
                  t('orders.returns.detail.fields.orderStatus'),
                  <OrderBadge status={data.order.status} />,
                ],
                [
                  t('orders.returns.detail.fields.buyer'),
                  `${data.order.buyer.fullName}\n${data.order.buyer.email}`,
                ],
                [
                  t('orders.returns.detail.fields.seller'),
                  `${data.order.seller.fullName}\n${data.order.seller.email}`,
                ],
                [t('orders.returns.detail.fields.orderTotal'), money(data.order.totalAmount)],
                [t('orders.returns.detail.fields.requestedAt'), date(request.createdAt)],
                [
                  t('orders.returns.detail.fields.returnStatus'),
                  <Badge>
                    {t(`orders.returns.statuses.${request.status as ReturnStatus}`, {
                      defaultValue:
                        returnStatusLabels[request.status as ReturnStatus] ?? request.status,
                    })}
                  </Badge>,
                ],
                [t('orders.returns.detail.fields.reason'), request.reason],
                [t('orders.returns.detail.fields.decisionNote'), request.decisionReason],
                [
                  t('orders.returns.detail.fields.originalWaybill'),
                  data.returns.shipment?.waybillCode,
                ],
                [
                  t('orders.returns.detail.fields.shipping'),
                  data.returns.shipment
                    ? t(`orders.shipmentStatuses.${data.returns.shipment.status}`, {
                        defaultValue: data.returns.shipment.status,
                      })
                    : null,
                ],
                [t('orders.returns.detail.fields.returnWaybill'), request.returnWaybillCode],
                [
                  t('orders.returns.detail.fields.receivedAt'),
                  request.receivedAt ? date(request.receivedAt) : null,
                ],
                [
                  t('orders.returns.detail.fields.restockedAt'),
                  request.restockedAt ? date(request.restockedAt) : null,
                ],
                [t('orders.returns.detail.fields.escrow'), data.returns.escrowRecord?.status],
              ]}
            />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t('orders.returns.detail.itemsTitle')}</h3>
              {data.order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">
                    {item.titleSnapshot ??
                      item.product?.title ??
                      t('orders.returns.detail.defaultItem')}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {item.quantity} × {money(item.unitPrice)}
                  </p>
                </div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t('orders.returns.detail.evidenceTitle')}</h3>
              {evidence.length ? (
                <div className="flex flex-wrap gap-3">
                  {evidence.map((url, index) => (
                    <a
                      key={`${index}:${url}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 underline"
                    >
                      {t('orders.returns.detail.evidenceIndex', { index: index + 1 })}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t('orders.returns.detail.noEvidence')}</p>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{t('orders.returns.detail.refundsTitle')}</h3>
              {data.returns.refunds.length ? (
                data.returns.refunds.map((refund) => (
                  <div key={refund.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p>
                      {money(refund.amount)} ·{' '}
                      {refund.destination === 'WALLET'
                        ? t('orders.returns.detail.destWallet')
                        : refund.destination === 'ORIGINAL'
                          ? t('orders.returns.detail.destOriginal')
                          : refund.destination}{' '}
                      ·{' '}
                      {refund.status === 'SUCCESS'
                        ? t('orders.returns.detail.refundSuccess')
                        : refund.status === 'PENDING'
                          ? t('orders.returns.detail.refundPending')
                          : refund.status}
                    </p>
                    {refund.externalReference && (
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {t('orders.returns.detail.reconcileRef', { ref: refund.externalReference })}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t('orders.returns.detail.noRefunds')}</p>
              )}
            </section>
            <div className="flex flex-wrap gap-2">
              {RETURN_ACTIONS.map((value) => (
                <Button
                  key={value}
                  variant={value === 'reject' ? 'danger' : 'secondary'}
                  disabled={blocked}
                  onClick={() => {
                    setAction(value);
                    setActionError('');
                    setNotice('');
                  }}
                >
                  {t(`orders.returns.detail.actions.${value}`)}
                </Button>
              ))}
            </div>
            {action && (
              <form
                key={action}
                className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (blocked) return;
                  const fields = new FormData(event.currentTarget);
                  const reason = String(fields.get('reason') ?? '').trim();
                  const waybillCode = String(fields.get('waybillCode') ?? '').trim();
                  if ((action === 'waybill' && !waybillCode) || (action !== 'waybill' && !reason))
                    return;
                  void submit(
                    action === 'waybill'
                      ? { type: 'waybill', waybillCode }
                      : action === 'receive'
                        ? { type: 'receive', reason, restock: fields.get('restock') === 'true' }
                        : {
                            type: 'review',
                            decision: action === 'approve' ? 'APPROVE' : 'REJECT',
                            reason,
                          },
                  );
                }}
              >
                <h3 className="text-sm font-semibold">
                  {t(`orders.returns.detail.actions.${action}`)}
                </h3>
                {action === 'waybill' ? (
                  <>
                    <p className="text-sm text-slate-600">
                      {t('orders.returns.detail.waybillDesc')}
                    </p>
                    <label className="block text-sm">
                      {t('orders.returns.detail.waybillLabel')}
                      <input
                        name="waybillCode"
                        required
                        maxLength={100}
                        disabled={blocked}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    {action === 'approve' && (
                      <p className="text-sm text-slate-600">
                        {t('orders.returns.detail.approveDesc')}
                      </p>
                    )}
                    {action === 'reject' && (
                      <p className="text-sm text-slate-600">
                        {t('orders.returns.detail.rejectDesc')}
                      </p>
                    )}
                    {action === 'receive' && (
                      <>
                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                          {t('orders.returns.detail.receiveWarn')}
                        </p>
                        <label className="block text-sm">
                          {t('orders.returns.detail.inspectionLabel')}
                          <select
                            name="restock"
                            required
                            defaultValue=""
                            disabled={blocked}
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <option value="" disabled>
                              {t('orders.returns.detail.inspectionPlaceholder')}
                            </option>
                            <option value="true">{t('orders.returns.detail.restockTrue')}</option>
                            <option value="false">{t('orders.returns.detail.restockFalse')}</option>
                          </select>
                        </label>
                      </>
                    )}
                    <label className="block text-sm">
                      {action === 'receive'
                        ? t('orders.returns.detail.inspectionNotesLabel')
                        : t('orders.returns.detail.processReasonLabel')}
                      <textarea
                        name="reason"
                        required
                        maxLength={2000}
                        rows={3}
                        disabled={blocked}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3"
                      />
                    </label>
                  </>
                )}
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" required disabled={blocked} className="mt-1" />
                  {t('orders.returns.detail.confirmCheckbox')}
                </label>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant={action === 'reject' ? 'danger' : 'primary'}
                    disabled={blocked}
                  >
                    {pending
                      ? t('orders.returns.detail.processing')
                      : t('orders.returns.detail.confirmBtn')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setAction(null)}
                  >
                    {t('orders.returns.detail.cancelBtn')}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
        {!loading && !error && request?.kind !== 'RETURN' && (
          <p className="text-sm text-slate-500">{t('orders.returns.detail.noReturnRequest')}</p>
        )}
      </div>
    </Popup>
  );
}
