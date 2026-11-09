import { useState } from 'react';
import { resolveAdminDispute } from '../../../services/admin';
import { Button } from '../shared/AdminUI';

export default function DisputeResolution({
  orderId,
  onResolved,
  onBusyChange,
}: {
  orderId: string;
  onResolved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [verdict, setVerdict] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (saving || !confirmed || !reason.trim()) return;
    setSaving(true);
    onBusyChange(true);
    setError('');
    try {
      await resolveAdminDispute(orderId, verdict, reason.trim());
      onResolved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể phân xử khiếu nại.');
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  return (
    <form
      className="space-y-3 border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 className="text-sm font-semibold">Phân xử khiếu nại</h3>
      <label className="block text-sm">
        Kết luận
        <select
          disabled={saving}
          value={verdict}
          onChange={(event) => {
            setVerdict(event.target.value as 'BUYER' | 'SELLER');
            setConfirmed(false);
          }}
          className="mt-1 block w-full rounded-lg border p-2"
        >
          <option value="BUYER">Bên mua thắng — hoàn tiền cho bên mua</option>
          <option value="SELLER">Bên bán thắng — giải ngân cho bên bán</option>
        </select>
      </label>
      <label className="block text-sm">
        Lý do phân xử
        <textarea
          required
          maxLength={2000}
          disabled={saving}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 block min-h-24 w-full rounded-lg border p-2"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={saving}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        Tôi xác nhận kết luận và thao tác{' '}
        {verdict === 'BUYER' ? 'hoàn tiền cho bên mua' : 'giải ngân cho bên bán'}.
      </label>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving || !confirmed || !reason.trim()}>
        {saving ? 'Đang xử lý…' : 'Xác nhận phân xử'}
      </Button>
    </form>
  );
}
