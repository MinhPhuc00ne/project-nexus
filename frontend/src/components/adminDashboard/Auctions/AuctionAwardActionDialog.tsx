import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import {
  canConfirmAwardAction,
  type AdminAuctionAward,
  type AwardAction,
} from '../../../types/admin-auction-operations.types';

type Props = {
  award: AdminAuctionAward;
  action: AwardAction;
  pending: boolean;
  blocked: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
};

export default function AuctionAwardActionDialog({
  award,
  action,
  pending,
  blocked,
  error,
  onClose,
  onConfirm,
}: Props) {
  const paymentDefault = action === 'payment-default';
  const eligible = canConfirmAwardAction(award, action);
  return (
    <Popup
      isOpen
      size="lg"
      title={paymentDefault ? 'Xử phạt quá hạn thanh toán' : 'Xác nhận khách thứ hai không mua nữa'}
      onClose={() => {
        if (!pending) onClose();
      }}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || blocked || !eligible) return;
          onConfirm(String(new FormData(event.currentTarget).get('note') ?? ''));
        }}
      >
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold">
            {award.auctionItem?.lotNumber ? `Lô ${award.auctionItem.lotNumber} · ` : ''}
            {award.auctionItem?.title ?? 'Vật phẩm đấu giá'}
          </p>
          <p className="mt-1">Người mua: {award.buyer?.fullName ?? '—'}</p>
          <p className="mt-1">Tiền cọc: {Number(award.depositAmount).toLocaleString('vi-VN')} ₫</p>
          <p className="mt-1">Hạn xử lý: {new Date(award.expiresAt).toLocaleString('vi-VN')}</p>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {paymentDefault
            ? 'Người mua sẽ mất 30% cọc và bị trừ 10 điểm uy tín. Với người thắng đầu tiên, hệ thống sẽ mời người mua thứ hai nếu đủ điều kiện.'
            : 'Hệ thống hoàn 30% cọc nếu đã đóng và đóng lô hàng. Thao tác chỉ áp dụng cho người mua thứ hai.'}
        </p>
        <label className="block text-sm font-medium">
          Ghi chú xử lý
          <textarea
            name="note"
            maxLength={1000}
            rows={3}
            disabled={pending}
            placeholder="Nhập ghi chú (không bắt buộc)"
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required disabled={pending} className="mt-1" />
          Tôi đã kiểm tra thông tin và xác nhận thực hiện thao tác này.
        </label>
        {!eligible && (
          <p role="alert" className="text-sm text-red-700">
            Máy chủ không cho phép thao tác này ở trạng thái hiện tại. Hãy làm mới để cập nhật.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" disabled={pending || blocked || !eligible}>
            {pending
              ? 'Đang xử lý…'
              : paymentDefault
                ? 'Xử phạt quá hạn thanh toán'
                : 'Xác nhận không mua nữa'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
