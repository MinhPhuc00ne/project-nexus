import { useCallback, useState, type FormEvent, type ReactElement } from 'react';
import { Send as SendOutlined } from 'lucide-react';
import { ShieldCheck as SafetyCertificateOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Popup from '../Popup';
import useProductResource from '../productDetail/useProductResource';
import { useToast } from '../ToastNotification';
import {
  dispatchSellerOrder,
  getGhnDiagnostic,
  getSellerOrderDetail,
  GhnDispatchUnverifiedError,
} from '../../services/sellerOrders';
import type { GhnDiagnostic, SellerOrderDetail } from '../../types/order.types';
import { useSellerSession } from './SellerSession';
import { SellerButton } from './SellerUI';
import SellerResourceState, { sellerInputClass, sellerLabelClass } from './SellerResourceState';
import useSellerAction from './useSellerAction';

export default function SellerDispatchModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const load = useCallback(async () => {
    const [order, diagnostic] = await Promise.all([
      getSellerOrderDetail(id, user.id),
      getGhnDiagnostic(),
    ]);
    return { order, diagnostic };
  }, [id, user.id]);
  const resource = useProductResource(load);
  return (
    <Popup
      isOpen
      onClose={onClose}
      title={t('orders.dispatch.modalTitle')}
      size="lg"
      showCloseButton={false}
      closeOnEsc={false}
      closeOnOverlay={false}
    >
      <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
        {resource.data && (
          <DispatchForm {...resource.data} onClose={onClose} onChanged={onChanged} />
        )}
      </SellerResourceState>
      {!resource.data && (
        <div className="mt-4 flex justify-end">
          <SellerButton secondary onClick={onClose}>
            {t('orders.dispatch.close')}
          </SellerButton>
        </div>
      )}
    </Popup>
  );
}

function DispatchForm({
  order,
  diagnostic,
  onClose,
  onChanged,
}: {
  order: SellerOrderDetail;
  diagnostic: GhnDiagnostic;
  onClose: () => void;
  onChanged: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const action = useSellerAction();
  const toast = useToast();
  const [uncertain, setUncertain] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    weightGrams: String(
      order.items.reduce((sum, item) => sum + (item.weightGrams ?? 0) * item.quantity, 0) || '',
    ),
    lengthCm: String(
      Math.max(0, ...order.items.map((item) => item.dimensions?.lengthCm ?? 0)) || '',
    ),
    widthCm: String(Math.max(0, ...order.items.map((item) => item.dimensions?.widthCm ?? 0)) || ''),
    heightCm: String(
      Math.max(0, ...order.items.map((item) => item.dimensions?.heightCm ?? 0)) || '',
    ),
    note: '',
  });
  const ready =
    diagnostic.tokenConfigured &&
    diagnostic.shopIdConfigured &&
    diagnostic.ping.status === 'CONNECTED';
  const address = order.shippingAddress;
  const recipientReady = !!(
    (address?.street || address?.formattedAddress) &&
    (address?.phone || order.buyer.phoneNumber) &&
    address?.city
  );
  const eligible = ['PAID', 'PREPARING'].includes(order.status);
  function close(): void {
    if (action.pending) return;
    if (uncertain) onChanged();
    onClose();
  }
  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      async () => {
        if (uncertain || !ready || !recipientReady || !eligible || !consent)
          throw new Error(t('orders.dispatch.validationErr'));
        const values = {
          weightGrams: Number(form.weightGrams),
          lengthCm: Number(form.lengthCm),
          widthCm: Number(form.widthCm),
          heightCm: Number(form.heightCm),
        };
        for (const [key, value] of Object.entries(values)) {
          if (
            !Number.isSafeInteger(value) ||
            value < (key === 'weightGrams' ? 50 : 1) ||
            value > 2147483647
          )
            throw new Error(t('orders.dispatch.dimensionsErr'));
        }
        try {
          return await dispatchSellerOrder(order.id, user.id, {
            ...values,
            ...(form.note.trim() ? { note: form.note.trim() } : {}),
          });
        } catch (cause) {
          if (cause instanceof GhnDispatchUnverifiedError) setUncertain(true);
          throw cause;
        }
      },
      (result) => {
        toast.success(
          t('orders.dispatch.ghnSuccess', { code: result.shipment?.waybillCode ?? '' }),
        );
        onChanged();
        onClose();
      },
    );
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-slate-600">
        <strong className="block break-all text-blue-800">
          {t('orders.dispatch.orderId', { id: order.id })}
        </strong>
        <p>
          {address?.recipientName || order.buyer.fullName} ·{' '}
          {address?.phone || order.buyer.phoneNumber || t('orders.dispatch.missingPhone')}
        </p>
        <p>
          {[address?.street, address?.ward, address?.district, address?.city]
            .filter(Boolean)
            .join(', ') || t('orders.dispatch.missingAddress')}
        </p>
      </div>
      <p
        role={ready && recipientReady && eligible ? 'status' : 'alert'}
        className={`rounded-lg p-3 text-xs leading-6 ${ready && recipientReady && eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
      >
        {!eligible
          ? t('orders.dispatch.notEligible')
          : !recipientReady
            ? t('orders.dispatch.missingRecipient')
            : ready
              ? t('orders.dispatch.ghnReady')
              : t('orders.dispatch.ghnNotReady')}
      </p>
      <fieldset disabled={action.pending || uncertain} className="space-y-4 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['weightGrams', t('orders.dispatch.weightGrams'), 50],
              ['lengthCm', t('orders.dispatch.lengthCm'), 1],
              ['widthCm', t('orders.dispatch.widthCm'), 1],
              ['heightCm', t('orders.dispatch.heightCm'), 1],
            ] as const
          ).map(([key, label, min]) => (
            <label className={sellerLabelClass} key={key}>
              {label}
              <input
                className={sellerInputClass}
                type="number"
                min={min}
                max={2147483647}
                step={1}
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <label className={sellerLabelClass}>
          {t('orders.dispatch.note')}
          <textarea
            className={sellerInputClass}
            rows={2}
            maxLength={1000}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-blue-100 p-3 text-xs leading-6 text-slate-600">
          <input
            className="mt-1.5 accent-blue-600"
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            <SafetyCertificateOutlined className="mr-1 text-blue-600" />
            {t('orders.dispatch.consent')}
          </span>
        </label>
      </fieldset>
      {action.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {action.error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <SellerButton secondary disabled={action.pending} onClick={close}>
          {uncertain ? t('orders.dispatch.closeAndReload') : t('orders.dispatch.cancel')}
        </SellerButton>
        <SellerButton
          type="submit"
          disabled={
            action.pending || uncertain || !ready || !recipientReady || !eligible || !consent
          }
        >
          <SendOutlined />
          {action.pending ? t('orders.dispatch.submitting') : t('orders.dispatch.submit')}
        </SellerButton>
      </div>
    </form>
  );
}
