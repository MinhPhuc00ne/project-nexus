import { useState, type FormEvent, type ReactElement } from 'react';
import { Landmark as BankOutlined } from 'lucide-react';
import { ShieldCheck as SafetyCertificateOutlined } from 'lucide-react';
import Popup from '../Popup';
import { useToast } from '../ToastNotification';
import { createSellerWithdrawal } from '../../services/sellerFinance';
import { SellerButton } from './SellerUI';
import { financeMoney } from './financeFormat';
import useSellerAction from './useSellerAction';
import { sellerInputClass, sellerLabelClass } from './SellerResourceState';

export default function SellerWithdrawalModal({
  balance,
  suspended,
  onClose,
  onSaved,
}: {
  balance: number;
  suspended: boolean;
  onClose: () => void;
  onSaved: () => void;
}): ReactElement {
  const [form, setForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    note: '',
  });
  const action = useSellerAction();
  const toast = useToast();
  const close = (): void => {
    if (!action.pending) onClose();
  };
  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      async () => {
        if (suspended)
          throw new Error('Gian hàng đang bị đình chỉ, không thể gửi yêu cầu rút tiền.');
        const amount = Number(form.amount);
        if (!Number.isSafeInteger(amount) || amount < 50000)
          throw new Error('Số tiền rút phải là số nguyên, tối thiểu 50.000đ.');
        if (amount > balance) throw new Error('Số tiền yêu cầu vượt quá số dư có thể rút.');
        const bankName = form.bankName.trim();
        const accountNumber = form.accountNumber.trim();
        const accountHolderName = form.accountHolderName.trim().toUpperCase();
        if (!bankName || !accountNumber || !accountHolderName)
          throw new Error('Vui lòng nhập đầy đủ thông tin ngân hàng.');
        return createSellerWithdrawal({
          amount,
          bankName,
          accountNumber,
          accountHolderName,
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
        });
      },
      (result) => {
        toast.success(result.message);
        onSaved();
        onClose();
      },
    );
  }
  return (
    <Popup
      isOpen
      onClose={close}
      closeOnEsc={!action.pending}
      closeOnOverlay={!action.pending}
      showCloseButton={!action.pending}
      title={
        <span className="flex items-center gap-2">
          <BankOutlined className="text-blue-600" /> Yêu cầu rút tiền
        </span>
      }
      size="md"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs text-blue-600">Số dư có thể rút</p>
          <strong className="mt-1 block text-2xl text-blue-800">{financeMoney(balance)}</strong>
        </div>
        <fieldset disabled={action.pending || suspended} className="space-y-4 disabled:opacity-70">
          <label className={sellerLabelClass}>
            Số tiền muốn rút (VND)
            <input
              className={sellerInputClass}
              type="number"
              min={50000}
              max={balance}
              step={1}
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Tối thiểu 50.000"
            />
          </label>
          <label className={sellerLabelClass}>
            Ngân hàng thụ hưởng
            <input
              className={sellerInputClass}
              required
              maxLength={120}
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="Nhập tên ngân hàng"
            />
          </label>
          <label className={sellerLabelClass}>
            Số tài khoản
            <input
              className={sellerInputClass}
              required
              maxLength={50}
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
            />
          </label>
          <label className={sellerLabelClass}>
            Tên chủ tài khoản
            <input
              className={`${sellerInputClass} uppercase`}
              required
              maxLength={150}
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              placeholder="HỌ TÊN VIẾT HOA KHÔNG DẤU"
            />
          </label>
          <label className={sellerLabelClass}>
            Ghi chú (không bắt buộc)
            <textarea
              className={sellerInputClass}
              rows={2}
              maxLength={500}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </fieldset>
        <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-500">
          <SafetyCertificateOutlined className="mt-1 text-blue-600" />
          Số tiền được chuyển sang số dư đang khóa khi gửi yêu cầu. Quản trị viên sẽ kiểm tra và xử
          lý chuyển khoản.
        </p>
        {(action.error || suspended) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {action.error || 'Gian hàng đang bị đình chỉ.'}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <SellerButton secondary onClick={close} disabled={action.pending}>
            Hủy
          </SellerButton>
          <SellerButton type="submit" disabled={action.pending || suspended || balance < 50000}>
            {action.pending ? 'Đang gửi…' : 'Gửi yêu cầu rút tiền'}
          </SellerButton>
        </div>
      </form>
    </Popup>
  );
}
