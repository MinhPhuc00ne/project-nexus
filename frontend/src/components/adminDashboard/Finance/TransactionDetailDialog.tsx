import { Link } from 'react-router-dom';
import Popup from '../../Popup';
import { DetailFields } from '../shared/CommerceUI';
import { formatMoney } from '../shared/adminData';
import type { AdminWalletTransaction } from '../../../types/admin-wallet.types';
import { typeLabels, statusLabels, date } from './transactionPresentation';

export default function TransactionDetailDialog({
  detail,
  onClose,
}: {
  detail: AdminWalletTransaction | null;
  onClose: () => void;
}) {
  return (
    <Popup isOpen={!!detail} onClose={onClose} title="Chi tiết giao dịch" size="lg">
      {detail && (
        <div className="space-y-5">
          <DetailFields
            fields={[
              ['Mã giao dịch', detail.id],
              ['Mã ví', detail.walletId],
              ['Mã tham chiếu', detail.referenceId],
              ['Loại giao dịch', typeLabels[detail.type] ?? detail.type],
              ['Số tiền', formatMoney(detail.amount)],
              ['Trạng thái giao dịch', statusLabels[detail.status] ?? detail.status],
              ['Thời gian', date(detail.createdAt)],
              ['Mô tả', detail.description],
            ]}
          />
          {detail.orderDetails && (
            <>
              <DetailFields
                fields={[
                  ['Mã đơn hàng', detail.orderDetails.orderId],
                  [
                    'Người mua',
                    [detail.orderDetails.buyerName, detail.orderDetails.buyerEmail]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                  [
                    'Người bán',
                    [detail.orderDetails.shopName, detail.orderDetails.sellerEmail]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                  ['Tiền hàng', formatMoney(detail.orderDetails.subtotal)],
                  ['Phí vận chuyển', formatMoney(detail.orderDetails.shippingFee)],
                  ['Tổng tiền đơn', formatMoney(detail.orderDetails.totalAmount)],
                  ['Phí sàn của đơn', formatMoney(detail.orderDetails.platformFee)],
                  ['Tiền giải ngân người bán', formatMoney(detail.orderDetails.sellerPayout)],
                  ['Đơn vị vận chuyển', detail.orderDetails.carrier],
                  ['Mã vận đơn', detail.orderDetails.waybillCode],
                ]}
              />
              <Link
                className="text-sm font-semibold text-primary underline"
                to={`/admin/orders?order=${encodeURIComponent(detail.orderDetails.orderId)}`}
              >
                Xem đơn hàng liên quan
              </Link>
            </>
          )}
        </div>
      )}
    </Popup>
  );
}
