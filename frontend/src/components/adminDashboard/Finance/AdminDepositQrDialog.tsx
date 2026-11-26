import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { CircleCheck } from 'lucide-react';
import Popup from '../../Popup';
import { formatMoney } from '../shared/adminData';
import type { DepositAdminWalletResult } from '@/features/admin/types/admin-wallet.types';

export default function AdminDepositQrDialog({
  payment,
  onClose,
  statusError,
  successful = false,
}: {
  payment: DepositAdminWalletResult;
  onClose: () => void;
  statusError: string;
  successful?: boolean;
}) {
  const { t } = useTranslation('admin');
  const [image, setImage] = useState('');
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let active = true;
    setImage('');
    setQrError(false);
    void QRCode.toDataURL(payment.qrCode, { width: 320, margin: 2 })
      .then((url) => {
        if (active) setImage(url);
      })
      .catch(() => {
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [payment.qrCode]);

  if (successful) {
    return (
      <Popup isOpen onClose={onClose} title={t('finance.wallet.transferSuccess')}>
        <div className="space-y-5 py-6 text-center">
          <div role="status" className="space-y-4">
            <CircleCheck
              aria-hidden="true"
              className="mx-auto size-20 text-emerald-500"
              strokeWidth={1.5}
            />
            <p className="text-xl font-bold text-emerald-700">
              {t('finance.wallet.transferSuccess')}
            </p>
            <p className="text-2xl font-bold text-slate-900">{formatMoney(payment.amount)}</p>
            <p className="text-sm text-slate-600">{t('finance.wallet.paymentSuccess')}</p>
          </div>
          <p className="text-xs text-slate-500">
            {t('finance.wallet.paymentCode', { code: payment.orderCode })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {t('finance.wallet.paymentDone')}
          </button>
        </div>
      </Popup>
    );
  }

  return (
    <Popup isOpen onClose={onClose} title={t('finance.wallet.qrTitle')}>
      <div className="space-y-4 text-center">
        <p className="text-xl font-bold text-primary">{formatMoney(payment.amount)}</p>
        {image && <img src={image} alt={t('finance.wallet.qrTitle')} className="mx-auto size-64" />}
        {qrError && <p role="alert">{t('finance.wallet.qrError')}</p>}
        <p role="status" className="text-sm text-slate-600">
          {t('finance.wallet.awaitingPayment')}
        </p>
        {payment.accountName && <p className="font-medium">{payment.accountName}</p>}
        {payment.accountNumber && <p className="font-mono">{payment.accountNumber}</p>}
        <p className="text-xs text-slate-500">
          {t('finance.wallet.paymentCode', { code: payment.orderCode })}
        </p>
        <a
          href={payment.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          {t('finance.wallet.openPayment')}
        </a>
        {statusError && (
          <p role="alert" className="text-sm text-red-700">
            {statusError}
          </p>
        )}
      </div>
    </Popup>
  );
}
