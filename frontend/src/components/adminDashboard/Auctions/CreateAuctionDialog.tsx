import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { apiRequest } from '../../../services/api';
import {
  adminCreateAuctionApi,
  adminUpdateAuctionApi,
  type AdminAuctionEntity,
} from '../../../services/auction.service';
import { getStoredToken } from '../../../services/auth';
import { useToast } from '../../ToastNotification';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { minEndDateTime } from '../../../utils/date-time';
import ConsignmentDeadlineField from './ConsignmentDeadlineField';
import { auctionEditReason } from './auctionManagementAvailability';

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function CreateAuctionDialog({
  onClose,
  onCreated,
  auction,
}: {
  onClose: () => void;
  onCreated: (auction: AdminAuctionEntity) => void;
  auction?: AdminAuctionEntity;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(auction?.title ?? '');
  const [description, setDescription] = useState(auction?.description ?? '');
  const [imageUrl, setImageUrl] = useState(auction?.imageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [startTime, setStartTime] = useState(localDateTime(auction?.startTime));
  const [endTime, setEndTime] = useState(localDateTime(auction?.endTime));
  const [consignmentDeadline, setConsignmentDeadline] = useState(
    localDateTime(auction?.consignmentDeadline),
  );
  const [buyerScore, setBuyerScore] = useState(String(auction?.minBuyerReputation ?? 100));
  const [sellerScore, setSellerScore] = useState(String(auction?.minSellerReputation ?? 80));
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

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    if (auction && auctionEditReason(auction)) {
      setError(auctionEditReason(auction));
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!title.trim()) {
      setError('Vui lòng nhập tên phiên đấu giá.');
      return;
    }
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setError('Vui lòng chọn lịch hợp lệ, thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    if (consignmentDeadline) {
      const deadline = new Date(consignmentDeadline).getTime();
      if (!Number.isFinite(deadline) || deadline <= start.getTime() || deadline >= end.getTime()) {
        setError('Hạn ký gửi phải sau thời gian bắt đầu và trước thời gian kết thúc phiên.');
        return;
      }
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
      let uploadedImageUrl: string | undefined = undefined;
      if (imageFile) {
        try {
          const body = new FormData();
          body.append('file', imageFile);
          const result = await apiRequest<{ url: string }>('/media/upload', {
            method: 'POST',
            body,
            isFormData: true,
            requireAuth: true,
          });
          if (!result?.url) throw new Error('Máy chủ chưa trả về đường dẫn ảnh hợp lệ.');
          uploadedImageUrl = result.url;
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? `Tải ảnh đại diện thất bại: ${uploadError.message}`
              : 'Tải ảnh đại diện thất bại.',
          );
          lock.current = false;
          if (active.current) setSaving(false);
          return;
        }
      } else if (imageUrl.trim()) {
        uploadedImageUrl = imageUrl.trim();
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        imageUrl: uploadedImageUrl ?? null,
        startTime:
          auction && startTime === localDateTime(auction.startTime)
            ? auction.startTime
            : start.toISOString(),
        endTime:
          auction && endTime === localDateTime(auction.endTime)
            ? auction.endTime
            : end.toISOString(),
        consignmentDeadline: consignmentDeadline
          ? auction && consignmentDeadline === localDateTime(auction.consignmentDeadline)
            ? auction.consignmentDeadline
            : new Date(consignmentDeadline).toISOString()
          : null,
        minBuyerReputation: Number(buyerScore),
        minSellerReputation: Number(sellerScore),
      };
      const saved = auction
        ? await adminUpdateAuctionApi(auction.id, payload)
        : await adminCreateAuctionApi({
            ...payload,
            consignmentDeadline: payload.consignmentDeadline ?? undefined,
          });
      if (active.current && token === getStoredToken()) {
        toast.success(auction ? 'Đã cập nhật phiên đấu giá.' : 'Đã tạo phiên đấu giá.');
        onCreated(saved);
      }
    } catch (cause) {
      if (active.current && token === getStoredToken())
        setError(cause instanceof Error ? cause.message : 'Không thể lưu phiên đấu giá.');
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
      title={auction ? 'Sửa phiên đấu giá' : 'Tạo phiên đấu giá'}
      size="lg"
      onClose={() => {
        if (!lock.current) onClose();
      }}
      closeOnOverlay={!saving}
      closeOnEsc={!saving}
      showCloseButton={!saving}
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
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-700">
              Ảnh đại diện / Banner phiên đấu giá
            </span>
            {imagePreview || imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={imagePreview || imageUrl}
                  alt="Ảnh đại diện phiên đấu giá"
                  className="h-36 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImageUrl('');
                    setImagePreview('');
                  }}
                  className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1 text-white shadow-xs transition-colors hover:bg-red-600 cursor-pointer"
                  title="Xóa ảnh"
                  aria-label="Xóa ảnh"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-4 text-center text-xs text-slate-600 hover:bg-blue-50">
                <ImagePlus className="text-blue-600" size={24} aria-hidden="true" />
                <span className="font-medium text-blue-700">
                  Tải ảnh đại diện cho phiên đấu giá
                </span>
                <span className="text-[11px] text-slate-500">PNG, JPG, WEBP · tối đa 5MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    event.target.value = '';
                    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                      setError('Vui lòng chọn ảnh PNG, JPG hoặc WEBP.');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Ảnh đại diện không được vượt quá 5MB.');
                      return;
                    }
                    setError('');
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 shrink-0">hoặc URL ảnh:</span>
              <input
                type="text"
                inputMode="url"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  if (event.target.value.trim()) {
                    setImageFile(null);
                    setImagePreview('');
                  }
                }}
                placeholder="https://... hoặc /uploads/..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              Bắt đầu <span className="text-red-600">*</span>
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(event) => {
                  const start = event.target.value;
                  setStartTime(start);
                  if (start && endTime && new Date(endTime) <= new Date(start)) setEndTime('');
                }}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium">
              Kết thúc <span className="text-red-600">*</span>
              <input
                required
                type="datetime-local"
                value={endTime}
                min={minEndDateTime(startTime)}
                onChange={(event) => setEndTime(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            {auction
              ? 'Thời gian theo múi giờ thiết bị. Lịch của các lô đã duyệt không tự thay đổi theo lịch phiên.'
              : 'Thời gian theo múi giờ thiết bị. Phiên bắt đầu ngay nếu giờ bắt đầu đã tới.'}
          </p>
          <ConsignmentDeadlineField
            value={consignmentDeadline}
            startTime={startTime}
            endTime={endTime}
            onChange={setConsignmentDeadline}
          />
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
            {saving ? 'Đang lưu…' : auction ? 'Lưu thay đổi' : 'Tạo phiên đấu giá'}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
