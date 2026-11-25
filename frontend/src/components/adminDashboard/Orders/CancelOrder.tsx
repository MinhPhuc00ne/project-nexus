import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { cancelAdminOrder } from '../../../services/admin';
import type { AdminOrder } from '../../../types/admin-order.types';
import { message } from './orderPresentation';

export default function CancelOrder({
  order,
  onClose,
  onSuccess,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  return (
    <Popup
      isOpen
      onClose={onClose}
      title={t('orders.cancelDialog.title')}
      size="md"
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          if (!reason.trim()) {
            setError(t('orders.cancelDialog.reasonRequiredErr'));
            return;
          }
          submitting.current = true;
          setPending(true);
          setError('');
          try {
            await cancelAdminOrder(order.id, reason.trim());
            onSuccess();
          } catch (cause) {
            setError(t('orders.cancelDialog.timeoutHint', { message: message(cause) }));
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        <p className="mb-4 break-words text-sm text-slate-600">
          {t('orders.cancelDialog.descPrefix', { id: order.id })}
        </p>
        <label className="block text-sm font-semibold">
          {t('orders.cancelDialog.reasonLabel')}
          <textarea
            autoFocus
            rows={3}
            maxLength={2000}
            disabled={pending}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-normal"
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t('orders.cancelDialog.close')}
          </Button>
          <Button variant="danger" type="submit" disabled={pending}>
            {pending ? t('orders.cancelDialog.cancelling') : t('orders.cancelDialog.confirm')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
