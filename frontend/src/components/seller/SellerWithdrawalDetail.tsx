import type { ReactElement } from 'react';
import Popup from '../Popup';
import type { SellerWithdrawal } from '../../types/seller-finance.types';
import { financeDate, financeMoney, withdrawalLabels } from './financeFormat';

export default function SellerWithdrawalDetail({
  item,
  onClose,
}: {
  item: SellerWithdrawal;
  onClose: () => void;
}): ReactElement {
  return (
    <Popup isOpen onClose={onClose} title="Chi tiết yêu cầu rút tiền">
      <dl className="divide-y divide-slate-100 text-sm">
        {[
          ['Mã yêu cầu', item.id],
          ['Số tiền', financeMoney(item.amount)],
          ['Trạng thái', withdrawalLabels[item.status] || item.status],
          ['Ngân hàng', item.bankName],
          ['Số tài khoản', item.accountNumber],
          ['Chủ tài khoản', item.accountHolderName],
          ['Ngày tạo', financeDate(item.createdAt)],
          ['Ngày xét duyệt', item.reviewedAt ? financeDate(item.reviewedAt) : 'Chưa xét duyệt'],
          ['Người xét duyệt', item.reviewedBy?.fullName || '—'],
          ['Ghi chú', item.adminNote || '—'],
          ['Lý do từ chối', item.rejectionReason || '—'],
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
