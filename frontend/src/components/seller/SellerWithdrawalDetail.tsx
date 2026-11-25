import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import Popup from '../Popup';
import type { SellerWithdrawal } from '../../types/seller-finance.types';
import { financeDate, financeMoney, getWithdrawalLabel } from './financeFormat';

export default function SellerWithdrawalDetail({
  item,
  onClose,
}: {
  item: SellerWithdrawal;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  return (
    <Popup isOpen onClose={onClose} title={t('finance.withdrawalDetail.title')}>
      <dl className="divide-y divide-slate-100 text-sm">
        {[
          [t('finance.withdrawalDetail.requestId'), item.id],
          [t('finance.withdrawalDetail.amount'), financeMoney(item.amount)],
          [t('finance.withdrawalDetail.status'), getWithdrawalLabel(item.status)],
          [t('finance.withdrawalDetail.bank'), item.bankName],
          [t('finance.withdrawalDetail.accountNumber'), item.accountNumber],
          [t('finance.withdrawalDetail.accountHolder'), item.accountHolderName],
          [t('finance.withdrawalDetail.createdAt'), financeDate(item.createdAt)],
          [
            t('finance.withdrawalDetail.reviewedAt'),
            item.reviewedAt
              ? financeDate(item.reviewedAt)
              : t('finance.withdrawalDetail.notReviewed'),
          ],
          [t('finance.withdrawalDetail.reviewedBy'), item.reviewedBy?.fullName || '—'],
          [t('finance.withdrawalDetail.note'), item.adminNote || '—'],
          [t('finance.withdrawalDetail.rejectionReason'), item.rejectionReason || '—'],
        ].map(([label, value]) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]" key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="m-0 break-words font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </Popup>
  );
}
