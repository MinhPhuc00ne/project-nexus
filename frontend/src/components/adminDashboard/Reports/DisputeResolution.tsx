import { useRef, useState } from 'react';
import { resolveAdminDispute } from '../../../services/admin';
import { Button } from '../shared/AdminUI';

export default function DisputeResolution({
  orderId,
  decision,
  onDecisionChange,
  onResolved,
  onBusyChange,
}: {
  orderId: string;
  decision: 'BUYER' | 'SELLER' | null;
  onDecisionChange: (decision: 'BUYER' | 'SELLER' | null) => void;
  onResolved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const validReason = reason.trim().length >= 5;

  async function submit() {
    if (submitting.current || !decision || !validReason) return;
    submitting.current = true;
    setSaving(true);
    onBusyChange(true);
    setError('');
    try {
      await resolveAdminDispute(orderId, decision, reason.trim());
      onResolved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể phân xử khiếu nại.');
    } finally {
      submitting.current = false;
      setSaving(false);
      onBusyChange(false);
    }
  }

  const choose = (value: 'BUYER' | 'SELLER' | null) => {
    setError('');
    onDecisionChange(value);
  };

  if (decision)
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Bạn có chắc muốn <strong>{decision === 'BUYER' ? 'xác nhận' : 'bác bỏ'}</strong> khiếu nại
          của đơn hàng <strong className="break-all">{orderId}</strong>?
        </p>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="mb-1 font-semibold">Lý do xử lý</p>
          <p className="whitespace-pre-wrap break-words">{reason.trim()}</p>
        </div>
        <p className="text-sm text-amber-700">
          {decision === 'BUYER'
            ? 'Bên mua thắng. Hệ thống sẽ xử lý hoàn tiền theo phương thức thanh toán của đơn hàng.'
            : 'Bên bán thắng. Hệ thống sẽ giải ngân tiền ký quỹ cho người bán.'}
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={() => choose(null)}>
            Quay lại
          </Button>
          <Button
            type="button"
            variant={decision === 'SELLER' ? 'danger' : 'primary'}
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? 'Đang xử lý…' : decision === 'BUYER' ? 'Đồng ý xác nhận' : 'Đồng ý bác bỏ'}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <label className="block text-sm text-slate-700">
        Lý do xử lý
        <textarea
          required
          minLength={5}
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 block min-h-24 w-full rounded-lg border border-slate-200 p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <p className="text-xs text-slate-500">
        Nhập lý do ít nhất 5 ký tự, sau đó chọn xác nhận hoặc bác bỏ khiếu nại.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!validReason} onClick={() => choose('BUYER')}>
          Xác nhận hoàn tiền
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={!validReason}
          onClick={() => choose('SELLER')}
        >
          Bác bỏ khiếu nại
        </Button>
      </div>
    </div>
  );
}
