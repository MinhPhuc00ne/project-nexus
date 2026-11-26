import type { Dispatch, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import Popup from '../../components/Popup';
import { Button } from '../../components/adminDashboard/shared/AdminUI';
import type {
  StaffOrderSupportDetail,
  StaffOrderTracking,
  StaffReturnAction,
} from '@/features/staff/services/staff';
import { canReceiveStaffReturn } from './afterSales.helpers';

type StaffOrderDetailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  t: TFunction<'staff'>;
  locale: string;
  language: string;
  order: StaffOrderSupportDetail | null;
  tracking: StaffOrderTracking | null;
  detailLoading: boolean;
  detailError: string;
  trackingError: string;
  returnReason: string;
  setReturnReason: Dispatch<SetStateAction<string>>;
  returnWaybill: string;
  setReturnWaybill: Dispatch<SetStateAction<string>>;
  restock: boolean;
  setRestock: Dispatch<SetStateAction<boolean>>;
  processing: boolean;
  actionError: string;
  runReturnAction: (action: StaffReturnAction) => Promise<void>;
  formatDate: (value: string | null | undefined, locale: string) => string;
  amount: (value: number | string | null | undefined, language: string) => string;
};

export default function StaffOrderDetailDialog({
  isOpen,
  onClose,
  t,
  locale,
  language,
  order,
  tracking,
  detailLoading,
  detailError,
  trackingError,
  returnReason,
  setReturnReason,
  returnWaybill,
  setReturnWaybill,
  restock,
  setRestock,
  processing,
  actionError,
  runReturnAction,
  formatDate,
  amount,
}: StaffOrderDetailDialogProps) {
  const afterSales = order?.afterSales;
  const canReviewReturn = afterSales?.kind === 'RETURN' && afterSales.status === 'REQUESTED';
  const canAttachReturnWaybill = afterSales?.kind === 'RETURN' && afterSales.status === 'APPROVED';
  const canReceiveReturn = afterSales
    ? canReceiveStaffReturn(afterSales.kind, afterSales.status)
    : false;

  return (
    <Popup isOpen={isOpen} title={t('ordersSupport.detailTitle')} size="xl" onClose={onClose}>
      {detailLoading && (
        <p role="status" className="text-sm text-slate-500">
          {t('ordersSupport.detailLoading')}
        </p>
      )}
      {detailError && (
        <p role="alert" className="text-sm text-red-700">
          {detailError}
        </p>
      )}
      {order && !detailLoading && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              [t('ordersSupport.orderIdLabel'), order.id],
              [
                t('ordersSupport.orderStatus'),
                t(`ordersSupport.orderStatuses.${order.status}`, { defaultValue: order.status }),
              ],
              [t('ordersSupport.orderTotal'), amount(order.totalAmount, language)],
              [t('ordersSupport.subtotal'), amount(order.subtotal, language)],
              [t('ordersSupport.shippingFee'), amount(order.shippingFee, language)],
              [t('ordersSupport.createdAt'), formatDate(order.createdAt, locale)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
              </div>
            ))}
          </section>
          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold">{t('ordersSupport.shippingTitle')}</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p>
                {t('ordersSupport.shippingStatus')}:{' '}
                {tracking?.shipment?.status ?? order.shipment?.status ?? '—'}
              </p>
              <p className="break-all">
                {t('ordersSupport.waybillLabel')}: {order.shipment?.waybillCode ?? '—'}
              </p>
              {tracking?.carrierStatus && (
                <p>
                  {t('ordersSupport.carrierStatus')}: {tracking.carrierStatus}
                </p>
              )}
              {order.shipment?.updatedAt && (
                <p>
                  {t('ordersSupport.updatedAt')}: {formatDate(order.shipment.updatedAt, locale)}
                </p>
              )}
            </div>
            {trackingError && (
              <p role="alert" className="mt-2 text-xs text-amber-700">
                {trackingError}
              </p>
            )}
          </section>
          {order.escrowRecord && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold">{t('ordersSupport.escrowTitle')}</h3>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  {t('ordersSupport.escrowStatus')}: {order.escrowRecord.status}
                </p>
                <p>
                  {t('ordersSupport.escrowTotal')}:{' '}
                  {amount(order.escrowRecord.totalAmount, language)}
                </p>
                <p>
                  {t('ordersSupport.platformFee')}:{' '}
                  {amount(order.escrowRecord.platformFee, language)}
                </p>
                <p>
                  {t('ordersSupport.sellerPayout')}:{' '}
                  {amount(order.escrowRecord.sellerPayout, language)}
                </p>
              </div>
            </section>
          )}
          {!order.escrowRecord && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold">{t('ordersSupport.escrowTitle')}</h3>
              <p className="mt-2 text-sm text-slate-500">{t('ordersSupport.noEscrow')}</p>
            </section>
          )}
          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold">{t('ordersSupport.paymentTitle')}</h3>
            {order.payments?.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="rounded-lg bg-slate-50 p-3">
                    <p>
                      {payment.provider} · {payment.status} · {amount(payment.amount, language)}
                    </p>
                    {payment.transactionCode && (
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {payment.transactionCode}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(payment.createdAt, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{t('ordersSupport.noPayments')}</p>
            )}
          </section>
          {afterSales && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold">{t('ordersSupport.afterSalesTitle')}</h3>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  {t('ordersSupport.kindLabel')}:{' '}
                  {t(`ordersSupport.kinds.${afterSales.kind}`, { defaultValue: afterSales.kind })}
                </p>
                <p>
                  {t('ordersSupport.statusAria')}:{' '}
                  {t(`ordersSupport.statuses.${afterSales.status}`, {
                    defaultValue: afterSales.status,
                  })}
                </p>
                <p>
                  {t('ordersSupport.createdAt')}: {formatDate(afterSales.createdAt, locale)}
                </p>
                <p>
                  {t('ordersSupport.updatedAt')}: {formatDate(afterSales.updatedAt, locale)}
                </p>
                {afterSales.receivedAt && (
                  <p>
                    {t('ordersSupport.receivedAt')}: {formatDate(afterSales.receivedAt, locale)}
                  </p>
                )}
                {afterSales.restockedAt && (
                  <p>
                    {t('ordersSupport.restockedAt')}: {formatDate(afterSales.restockedAt, locale)}
                  </p>
                )}
                {afterSales.decisionReason && (
                  <p className="sm:col-span-2">
                    {t('ordersSupport.decisionReason')}: {afterSales.decisionReason}
                  </p>
                )}
                <p className="sm:col-span-2">
                  {t('ordersSupport.reasonLabel')}: {afterSales.reason}
                </p>
              </div>
              {afterSales.kind === 'CANCEL' && afterSales.status !== 'REJECTED' && (
                <p className="mt-3 text-xs text-amber-800">{t('ordersSupport.cancelAdminOnly')}</p>
              )}
              {canReviewReturn && (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <label className="block text-sm">
                    {t('ordersSupport.reviewReason')}
                    <textarea
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3"
                      rows={3}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={processing || returnReason.trim().length < 5}
                      onClick={() =>
                        void runReturnAction({
                          type: 'review',
                          decision: 'APPROVE',
                          reason: returnReason.trim(),
                        })
                      }
                    >
                      {t('ordersSupport.approveReturn')}
                    </Button>
                    <Button
                      variant="danger"
                      disabled={processing || returnReason.trim().length < 5}
                      onClick={() =>
                        void runReturnAction({
                          type: 'review',
                          decision: 'REJECT',
                          reason: returnReason.trim(),
                        })
                      }
                    >
                      {t('ordersSupport.rejectReturn')}
                    </Button>
                  </div>
                </div>
              )}
              {canAttachReturnWaybill && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <input
                    value={returnWaybill}
                    onChange={(event) => setReturnWaybill(event.target.value)}
                    placeholder={t('ordersSupport.returnWaybillPlaceholder')}
                    className="min-w-52 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <Button
                    disabled={processing || !returnWaybill.trim()}
                    onClick={() =>
                      void runReturnAction({ type: 'waybill', waybillCode: returnWaybill.trim() })
                    }
                  >
                    {t('ordersSupport.saveWaybill')}
                  </Button>
                </div>
              )}
              {canReceiveReturn && (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={(event) => setRestock(event.target.checked)}
                    />
                    {t('ordersSupport.restockLabel')}
                  </label>
                  <Button
                    disabled={processing}
                    onClick={() =>
                      void runReturnAction({
                        type: 'receive',
                        reason: returnReason.trim() || t('ordersSupport.receiveDefaultReason'),
                        restock,
                      })
                    }
                  >
                    {t('ordersSupport.confirmReceived')}
                  </Button>
                </div>
              )}
              {actionError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {actionError}
                </p>
              )}
            </section>
          )}
          {order.dispute && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold">{t('ordersSupport.disputeTitle')}</h3>
              <p className="mt-2 text-sm">
                {order.dispute.status} · {order.dispute.reason ?? ''}
              </p>
              {order.dispute.resolutionNotes && (
                <p className="mt-1 text-sm text-slate-600">{order.dispute.resolutionNotes}</p>
              )}
            </section>
          )}
          {order.refunds.length > 0 && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold">{t('ordersSupport.refundsTitle')}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {order.refunds.map((refund) => (
                  <li key={refund.id} className="rounded-lg bg-slate-50 p-3">
                    {amount(refund.amount, language)} · {refund.destination} · {refund.status}
                    {refund.externalReference && (
                      <span className="block break-all text-xs text-slate-500">
                        {refund.externalReference}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {order.history && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold">{t('ordersSupport.historyTitle')}</h3>
              {order.history.length ? (
                <ol className="mt-3 space-y-3">
                  {order.history.map((entry, index) => (
                    <li
                      key={`${entry.source}:${entry.action}:${entry.timestamp}:${index}`}
                      className="border-l-2 border-blue-200 pl-3"
                    >
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(entry.timestamp, locale)}
                        {entry.actor?.fullName ? ` · ${entry.actor.fullName}` : ''}
                      </p>
                      {entry.note && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                          {entry.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-slate-500">{t('ordersSupport.noHistory')}</p>
              )}
            </section>
          )}
        </div>
      )}
    </Popup>
  );
}
