import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
import { promoteAuctionBanner } from './auctionBannerPromotion';

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
  const { t } = useTranslation('admin');
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
  const [promoteOnCreate, setPromoteOnCreate] = useState(false);
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

  function validateSchedule(): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return t('auctions.create.errSchedule');
    if (!consignmentDeadline) return '';
    const deadline = new Date(consignmentDeadline).getTime();
    if (!Number.isFinite(deadline) || deadline <= start || deadline >= end)
      return t('auctions.create.errDeadline');
    return '';
  }

  function validateForm(): string {
    if (auction) {
      const reason = auctionEditReason(auction);
      if (reason) return reason;
    }
    if (!auction && promoteOnCreate && !imageFile && !imageUrl.trim())
      return t('management.bannerImageRequired');
    if (!title.trim()) return t('auctions.create.errTitle');
    const scheduleError = validateSchedule();
    if (scheduleError) return scheduleError;
    const validScores = [buyerScore, sellerScore].every(
      (value) => value.trim() && Number.isSafeInteger(Number(value)) && Number(value) >= 0,
    );
    return validScores ? '' : t('auctions.create.errReputation');
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return imageUrl.trim() || null;
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
      return result.url;
    } catch (cause) {
      throw new Error(
        cause instanceof Error
          ? t('auctions.create.errUploadWithDetail', { message: cause.message })
          : t('auctions.create.errUpload'),
      );
    }
  }

  function datePayload(value: string, original?: string | null): string {
    if (original && value === localDateTime(original)) return original;
    return new Date(value).toISOString();
  }

  async function saveAuction() {
    const payload = {
      title: title.trim(),
      description: description.trim(),
      imageUrl: await uploadImage(),
      startTime: datePayload(startTime, auction?.startTime),
      endTime: datePayload(endTime, auction?.endTime),
      consignmentDeadline: consignmentDeadline
        ? datePayload(consignmentDeadline, auction?.consignmentDeadline)
        : null,
      minBuyerReputation: Number(buyerScore),
      minSellerReputation: Number(sellerScore),
    };
    if (auction) return adminUpdateAuctionApi(auction.id, payload);
    return adminCreateAuctionApi({
      ...payload,
      consignmentDeadline: payload.consignmentDeadline ?? undefined,
    });
  }

  async function promoteCreatedAuction(saved: AdminAuctionEntity): Promise<string> {
    if (auction || !promoteOnCreate) return '';
    try {
      await promoteAuctionBanner(saved);
      return '';
    } catch (cause) {
      return cause instanceof Error ? cause.message : t('management.promoteError');
    }
  }

  function successMessage(bannerError: string): string {
    if (auction) return t('management.auctionUpdated');
    if (promoteOnCreate && !bannerError) return t('management.auctionCreatedPromoted');
    return t('management.auctionCreated');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const validationError = validateForm();
    setError(validationError);
    if (validationError) return;
    lock.current = true;
    setSaving(true);
    const token = getStoredToken();
    const currentSession = () => active.current && token === getStoredToken();
    try {
      const saved = await saveAuction();
      if (!currentSession()) return;
      const bannerError = await promoteCreatedAuction(saved);
      if (!currentSession()) return;
      toast.success(successMessage(bannerError));
      if (bannerError)
        toast.error(t('management.auctionBannerWarning', { value1: bannerError }), {
          duration: 10000,
        });
      onCreated(saved);
    } catch (cause) {
      if (currentSession())
        setError(cause instanceof Error ? cause.message : t('management.saveAuctionError'));
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }

  const inputClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';

  function getSubmitLabel() {
    if (saving) {
      return t('management.saving');
    }
    if (auction) {
      return t('management.saveChanges');
    }
    return t('management.createAuctionTitle');
  }
  return (
    <Popup
      isOpen
      title={auction ? t('management.editAuctionTitle') : t('management.createAuctionTitle')}
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
          {!auction && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {t('management.promoteLabel')}
                </p>
                <p id="auction-banner-hint" className="mt-1 text-xs leading-5 text-slate-600">
                  {t('management.promoteHint')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label={t('management.promoteLabel')}
                aria-describedby="auction-banner-hint"
                aria-checked={promoteOnCreate}
                disabled={saving}
                onClick={() => setPromoteOnCreate((current) => !current)}
                title={t('management.promoteAfterCreate')}
                className={`relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${promoteOnCreate ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${promoteOnCreate ? 'translate-x-5 left-0.5' : 'left-0.5'}`}
                />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {auction ? t('management.editTimezoneHint') : t('management.createTimezoneHint')}
          </p>
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
            {getSubmitLabel()}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
