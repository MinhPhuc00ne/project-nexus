import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminCreateAuctionApi, type AdminAuctionEntity } from '../../../services/auction.service';
import { getStoredToken } from '../../../services/auth';
import { useToast } from '../../ToastNotification';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';

export default function CreateAuctionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (auction: AdminAuctionEntity) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [buyerScore, setBuyerScore] = useState('100');
  const [sellerScore, setSellerScore] = useState('80');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!title.trim()) {
      setError('Vui lòng nhập tên phiên đấu giá.');
      return;
    }
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    if (
      ![buyerScore, sellerScore].every(
        (value) => value.trim() && Number.isSafeInteger(Number(value)) && Number(value) >= 0,
      )
    ) {
      setError('Điểm uy tín phải là số nguyên không âm.');
      return;
    }
    lock.current = true;
    setSaving(true);
    const token = getStoredToken();
    try {
      const auction = await adminCreateAuctionApi({
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        minBuyerReputation: Number(buyerScore),
        minSellerReputation: Number(sellerScore),
      });
      if (active.current && token === getStoredToken()) {
        toast.success('Đã tạo phiên đấu giá.');
        onCreated(auction);
      }
    } catch (cause) {
      if (active.current && token === getStoredToken())
        setError(cause instanceof Error ? cause.message : 'Không thể tạo phiên đấu giá.');
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';
  return (
    <Popup
      isOpen
      title="Tạo phiên đấu giá"
      size="lg"
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <label className="block text-xs font-medium">
            Tên phiên đấu giá <span className="text-red-600">*</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="Ví dụ: Phiên đấu giá đồng hồ tháng 11"
            />
          </label>
          <label className="block text-xs font-medium">
            Mô tả / thể lệ
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              Bắt đầu <span className="text-red-600">*</span>
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium">
              Kết thúc <span className="text-red-600">*</span>
              <input
                required
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Thời gian theo múi giờ thiết bị. Phiên bắt đầu ngay nếu giờ bắt đầu đã tới.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              Điểm uy tín Buyer tối thiểu
              <input
                required
                type="number"
                min="0"
                step="1"
                value={buyerScore}
                onChange={(event) => setBuyerScore(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium">
              Điểm uy tín Seller tối thiểu
              <input
                required
                type="number"
                min="0"
                step="1"
                value={sellerScore}
                onChange={(event) => setSellerScore(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Đang tạo…' : 'Tạo phiên & thêm sản phẩm'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
