import { useRef, useState } from 'react';
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
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  return (
    <Popup
      isOpen
      onClose={onClose}
      title="Hủy đơn hàng"
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
            setError('Vui lòng nhập lý do hủy đơn.');
            return;
          }
          submitting.current = true;
          setPending(true);
          setError('');
          try {
            await cancelAdminOrder(order.id, reason.trim());
            onSuccess();
          } catch (cause) {
            setError(
              `${message(cause)} Nếu mất kết nối, hãy đóng cửa sổ và tải lại đơn để kiểm tra kết quả trước khi thử lại.`,
            );
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        <p className="mb-4 break-words text-sm text-slate-600">
          Đơn {order.id}. Chỉ hủy trước khi đơn vị vận chuyển nhận hàng. Với đơn đã thanh toán, hãy
          kiểm tra trạng thái hoàn tiền sau khi hủy.
        </p>
        <label className="block text-sm font-semibold">
          Lý do hủy đơn *
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
            Đóng
          </Button>
          <Button variant="danger" type="submit" disabled={pending}>
            {pending ? 'Đang hủy…' : 'Xác nhận hủy'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
