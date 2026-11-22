import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { apiRequest } from '../../../services/api';
import { adminCreateAuctionApi, type AdminAuctionEntity } from '../../../services/auction.service';
import { getStoredToken } from '../../../services/auth';
import { useToast } from '../../ToastNotification';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { minEndDateTime } from '../../../utils/date-time';
import ConsignmentDeadlineField from './ConsignmentDeadlineField';

export default function CreateAuctionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (auction: AdminAuctionEntity) => void;
}) {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [consignmentDeadline, setConsignmentDeadline] = useState('');
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

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!title.trim()) {
      setError(t('auctions.create.errTitle'));
      return;
    }
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setError(t('auctions.create.errSchedule'));
      return;
    }
    if (consignmentDeadline) {
      const deadline = new Date(consignmentDeadline).getTime();
      if (!Number.isFinite(deadline) || deadline <= start.getTime() || deadline >= end.getTime()) {
        setError(t('auctions.create.errDeadline'));
        return;
      }
    }
    if (
      ![buyerScore, sellerScore].every(
        (value) => value.trim() && Number.isSafeInteger(Number(value)) && Number(value) >= 0,
      )
    ) {
      setError(t('auctions.create.errReputation'));
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
          if (!result?.url) throw new Error(t('auctions.create.errImageUrl'));
          uploadedImageUrl = result.url;
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? t('auctions.create.errUploadWithDetail', { message: uploadError.message })
              : t('auctions.create.errUpload'),
          );
          lock.current = false;
          if (active.current) setSaving(false);
          return;
        }
      } else if (imageUrl.trim()) {
        uploadedImageUrl = imageUrl.trim();
      }

      const auction = await adminCreateAuctionApi({
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: uploadedImageUrl,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        consignmentDeadline: consignmentDeadline
          ? new Date(consignmentDeadline).toISOString()
          : undefined,
        minBuyerReputation: Number(buyerScore),
        minSellerReputation: Number(sellerScore),
      });
      if (active.current && token === getStoredToken()) {
        toast.success(t('auctions.create.toastSuccess'));
        onCreated(auction);
      }
    } catch (cause) {
      if (active.current && token === getStoredToken())
        setError(cause instanceof Error ? cause.message : t('auctions.create.errCreate'));
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
      title={t('auctions.create.title')}
      size="lg"
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <label className="block text-xs font-medium">
            {t('auctions.create.nameLabel')} <span className="text-red-600">*</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder={t('auctions.create.namePlaceholder')}
            />
          </label>
          <label className="block text-xs font-medium">
            {t('auctions.create.descriptionLabel')}
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </label>
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-700">
              {t('auctions.create.bannerLabel')}
            </span>
            {imagePreview || imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={imagePreview || imageUrl}
                  alt={t('auctions.create.bannerAlt')}
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
                  title={t('auctions.create.removeImage')}
                  aria-label={t('auctions.create.removeImage')}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-4 text-center text-xs text-slate-600 hover:bg-blue-50">
                <ImagePlus className="text-blue-600" size={24} aria-hidden="true" />
                <span className="font-medium text-blue-700">
                  {t('auctions.create.uploadPrompt')}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t('auctions.create.uploadHint')}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    event.target.value = '';
                    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                      setError(t('auctions.create.errInvalidFileType'));
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setError(t('auctions.create.errFileSize'));
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
              <span className="text-[11px] text-slate-400 shrink-0">
                {t('auctions.create.orImageUrl')}
              </span>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  if (event.target.value.trim()) {
                    setImageFile(null);
                    setImagePreview('');
                  }
                }}
                placeholder={t('auctions.create.urlPlaceholder')}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              {t('auctions.create.startLabel')} <span className="text-red-600">*</span>
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
              {t('auctions.create.endLabel')} <span className="text-red-600">*</span>
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
          <p className="text-xs text-slate-500">{t('auctions.create.timezoneHint')}</p>
          <ConsignmentDeadlineField
            value={consignmentDeadline}
            startTime={startTime}
            endTime={endTime}
            onChange={setConsignmentDeadline}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              {t('auctions.create.buyerRepLabel')}
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
              {t('auctions.create.sellerRepLabel')}
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
            {t('auctions.common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('auctions.create.creating') : t('auctions.create.title')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
