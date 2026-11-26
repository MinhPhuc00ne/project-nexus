import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Popup from '../../Popup';
import { DetailFields } from '../shared/CommerceUI';
import { formatMoney } from '../shared/adminData';
import type { AdminWalletTransaction } from '@/features/admin/types/admin-wallet.types';
import { date } from './transactionPresentation';

export default function TransactionDetailDialog({
  detail,
  onClose,
}: {
  detail: AdminWalletTransaction | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  return (
    <Popup
      isOpen={!!detail}
      onClose={onClose}
      title={t('finance.transactions.detail.title')}
      size="lg"
    >
      {detail && (
        <div className="space-y-5">
          <DetailFields
            fields={[
              [t('finance.transactions.detail.txId'), detail.id],
              [t('finance.transactions.detail.walletId'), detail.walletId],
              [t('finance.transactions.detail.refId'), detail.referenceId],
              [
                t('finance.transactions.detail.type'),
                t(`finance.types.${detail.type}`, { defaultValue: detail.type }),
              ],
              [t('finance.transactions.detail.amount'), formatMoney(detail.amount)],
              [
                t('finance.transactions.detail.status'),
                t(`finance.statuses.${detail.status}`, { defaultValue: detail.status }),
              ],
              [t('finance.transactions.detail.time'), date(detail.createdAt)],
              [t('finance.transactions.detail.desc'), detail.description],
            ]}
          />
          {detail.orderDetails && (
            <>
              <DetailFields
                fields={[
                  [t('finance.transactions.detail.orderId'), detail.orderDetails.orderId],
                  [
                    t('finance.transactions.detail.buyer'),
                    [detail.orderDetails.buyerName, detail.orderDetails.buyerEmail]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                  [
                    t('finance.transactions.detail.seller'),
                    [detail.orderDetails.shopName, detail.orderDetails.sellerEmail]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                  [
                    t('finance.transactions.detail.subtotal'),
                    formatMoney(detail.orderDetails.subtotal),
                  ],
                  [
                    t('finance.transactions.detail.shippingFee'),
                    formatMoney(detail.orderDetails.shippingFee),
                  ],
                  [
                    t('finance.transactions.detail.orderTotal'),
                    formatMoney(detail.orderDetails.totalAmount),
                  ],
                  [
                    t('finance.transactions.detail.platformFee'),
                    formatMoney(detail.orderDetails.platformFee),
                  ],
                  [
                    t('finance.transactions.detail.sellerPayout'),
                    formatMoney(detail.orderDetails.sellerPayout),
                  ],
                  [t('finance.transactions.detail.carrier'), detail.orderDetails.carrier],
                  [t('finance.transactions.detail.waybill'), detail.orderDetails.waybillCode],
                ]}
              />
              <Link
                className="text-sm font-semibold text-primary underline"
                to={`/admin/orders?order=${encodeURIComponent(detail.orderDetails.orderId)}`}
              >
                {t('finance.transactions.detail.viewRelatedOrder')}
              </Link>
            </>
          )}
        </div>
      )}
    </Popup>
  );
}
