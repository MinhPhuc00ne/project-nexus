import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getStoredToken } from '@/features/auth/services/auth';
import { removeAdminProductFromTrending } from '@/features/admin/services/admin';
import type { AdminProduct } from '../../../types/admin-product.types';
import Popup from '../../Popup';
import { useToast } from '../../ToastNotification';
import { Button } from '../shared/AdminUI';

export default function ProductTrendingDialog({
  product,
  purchaseCount,
  onClose,
  onRemoved,
}: {
  product: AdminProduct;
  purchaseCount: number;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function close() {
    if (!inFlight.current) onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !token || token !== getStoredToken()) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    const isCurrentSession = () => mounted.current && getStoredToken() === token;
    try {
      const result = await removeAdminProductFromTrending(product.id, reason);
      if (!isCurrentSession()) return;
      if (!result.success || result.product?.id !== product.id || !result.product.trendingExcluded)
        throw new Error(t('products.trending.removeError'));
      toast.success(t('products.trending.removed', { title: product.title }));
      onRemoved();
    } catch (cause) {
      if (isCurrentSession()) {
        const message = cause instanceof Error ? cause.message : t('products.trending.removeError');
        setError(message);
        toast.error(message);
      }
    } finally {
      inFlight.current = false;
      if (isCurrentSession()) setPending(false);
    }
  }

  return (
    <Popup
      isOpen
      title={t('products.trending.dialogTitle')}
      onClose={close}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
          <Flame size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-slate-900">{product.title}</p>
            <p className="mt-1 text-xs text-slate-600">
              {t('products.trending.purchaseCount', { count: purchaseCount })}
            </p>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">{t('products.trending.removeHint')}</p>
        <label className="block text-sm font-medium text-slate-700">
          {t('products.trending.reasonLabel')}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            disabled={pending}
            placeholder={t('products.trending.reasonPlaceholder')}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" disabled={pending} onClick={close}>
            {t('auctions.common.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? t('products.trending.removing') : t('products.trending.removeButton')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
