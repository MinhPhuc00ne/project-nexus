import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { MapPin, RefreshCw, Save } from 'lucide-react';
import { useToast } from '../ToastNotification';
import {
  getSellerPickupPoint,
  saveSellerPickupPoint,
  type SellerPickupPoint,
} from '../../services/sellerPickup';
import { Panel, SellerButton } from './SellerUI';

const emptyPoint: SellerPickupPoint = {
  name: '',
  phone: '',
  city: '',
  district: '',
  ward: '',
  street: '',
};

/**
 * Panel component allowing sellers to inspect and configure their synchronized GHN pickup point.
 *
 * @returns Rendered pickup point configuration panel.
 */
export default function SellerPickupPointPanel(): ReactElement {
  const toast = useToast();
  const [point, setPoint] = useState<SellerPickupPoint>(emptyPoint);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setPoint((await getSellerPickupPoint()) ?? emptyPoint);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải điểm lấy hàng GHN.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const update = (key: keyof SellerPickupPoint, value: string): void =>
    setPoint((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSellerPickupPoint(point);
      setPoint(saved);
      toast.success('Đã gửi đồng bộ điểm lấy hàng GHN.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể lưu điểm lấy hàng.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Panel
      title="Điểm lấy hàng GHN"
      subtitle="Thông tin này được dùng khi tạo vận đơn và bàn giao hàng."
    >
      {loading ? (
        <p className="text-sm text-slate-500">Đang tải điểm lấy hàng…</p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            <MapPin className="mr-1 inline size-4" />
            {point.status
              ? `Trạng thái đồng bộ: ${point.status}`
              : 'Chưa có điểm lấy hàng GHN được đồng bộ.'}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ['name', 'Tên điểm lấy hàng'],
                ['phone', 'Số điện thoại'],
                ['street', 'Số nhà, tên đường'],
                ['city', 'Tỉnh / thành phố'],
                ['district', 'Quận / huyện'],
                ['ward', 'Phường / xã'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm font-medium text-slate-700">
                {label}
                <input
                  required
                  value={point[key] ?? ''}
                  onChange={(event) => update(key, event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <SellerButton type="button" secondary disabled={saving} onClick={() => void load()}>
              <RefreshCw />
              Tải lại
            </SellerButton>
            <SellerButton type="submit" disabled={saving}>
              <Save />
              {saving ? 'Đang đồng bộ…' : 'Lưu điểm lấy hàng'}
            </SellerButton>
          </div>
        </form>
      )}
    </Panel>
  );
}
