import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import type { JSX } from 'react';
import type { TFunction } from 'i18next';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Image as ImageIcon,
  Link2,
  Plus,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type { AuctionEntity } from '../../services/auction.service';
import { minEndDateTime } from '../../utils/date-time';

type StaffBannerEditorDialogProps = {
  isOpen: boolean;
  t: TFunction<'staff'>;
  editingId: string | null;
  saving: boolean;
  error: string;
  closeModal: () => void;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  imageUrl: string;
  imageInputRef: RefObject<HTMLInputElement | null>;
  uploadImage: (file: File) => Promise<void>;
  uploadingImage: boolean;
  uploadedFileName: string;
  imageUploadError: string;
  imageError: boolean;
  setImageError: Dispatch<SetStateAction<boolean>>;
  auctionOptions: AuctionEntity[];
  selectedAuctionId: string;
  setSelectedAuctionId: Dispatch<SetStateAction<string>>;
  targetUrl: string;
  setTargetUrl: Dispatch<SetStateAction<string>>;
  startsAt: string;
  setStartsAt: Dispatch<SetStateAction<string>>;
  endsAt: string;
  setEndsAt: Dispatch<SetStateAction<string>>;
  priority: number;
  setPriority: Dispatch<SetStateAction<number>>;
  isActive: boolean;
  setIsActive: Dispatch<SetStateAction<boolean>>;
};

export default function StaffBannerEditorDialog({
  isOpen,
  t,
  editingId,
  saving,
  error,
  closeModal,
  submit,
  title,
  setTitle,
  imageUrl,
  imageInputRef,
  uploadImage,
  uploadingImage,
  uploadedFileName,
  imageUploadError,
  imageError,
  setImageError,
  auctionOptions,
  selectedAuctionId,
  setSelectedAuctionId,
  targetUrl,
  setTargetUrl,
  startsAt,
  setStartsAt,
  endsAt,
  setEndsAt,
  priority,
  setPriority,
  isActive,
  setIsActive,
}: StaffBannerEditorDialogProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                editingId ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                {editingId ? t('banners.modalEditTitle') : t('banners.modalCreateTitle')}
              </h3>
              <p className="text-xs text-slate-500 m-0">
                {editingId ? t('banners.modalEditSubtitle') : t('banners.modalCreateSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={saving || uploadingImage}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                {error}
              </p>
            )}
            {/* Field: Tiêu đề */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('banners.titleLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                required
                minLength={2}
                maxLength={150}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('banners.titlePlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            {/* Banner image upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('banners.imageLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                aria-label={t('banners.chooseImage')}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void uploadImage(file);
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving || uploadingImage}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload size={15} aria-hidden="true" />
                  {uploadingImage
                    ? t('banners.uploadingImage')
                    : imageUrl
                      ? t('banners.changeImage')
                      : t('banners.uploadImage')}
                </button>
                <span className="text-[10.5px] text-slate-500">{t('banners.imageUploadHint')}</span>
              </div>
              {uploadingImage && (
                <p role="status" className="mt-2 text-xs text-slate-500">
                  {t('banners.uploadingImage')}
                </p>
              )}
              {uploadedFileName && !uploadingImage && (
                <p className="mt-2 break-all text-xs text-slate-500">
                  {t('banners.uploadedImage', { name: uploadedFileName })}
                </p>
              )}
              {imageUploadError && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {imageUploadError}
                </p>
              )}
            </div>

            {/* LIVE IMAGE PREVIEW (Embedded inside Modal) */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
                <span className="flex items-center gap-1">
                  <Eye size={13} className="text-blue-600" /> {t('banners.previewTitle')}
                </span>
                <span className="text-[10.5px] text-slate-400 font-normal">
                  {t('banners.previewRatio')}
                </span>
              </div>

              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                {imageUrl.trim() ? (
                  imageError ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-red-500">
                      <AlertCircle size={22} className="mb-1" />
                      <span className="text-xs font-medium">{t('banners.imageLoadErr')}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {t('banners.imageLoadHint')}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={imageUrl.trim()}
                      alt={t('banners.previewAlt')}
                      className="h-full w-full object-cover transition-opacity duration-200"
                      onError={() => setImageError(true)}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                    <ImageIcon size={26} className="mb-1.5 text-slate-300" />
                    <span className="text-xs font-medium text-slate-600">
                      {t('banners.previewPlaceholderTitle')}
                    </span>
                    <span className="text-[10.5px] text-slate-400 mt-0.5">
                      {t('banners.previewPlaceholderHint')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('banners.auctionLinkLabel')}
              </label>
              <select
                value={selectedAuctionId}
                onChange={(event) => setSelectedAuctionId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              >
                <option value="">{t('banners.noAuctionLink')}</option>
                {auctionOptions.map((auction) => (
                  <option key={auction.id} value={auction.id}>
                    {auction.title} · {auction.status}
                  </option>
                ))}
              </select>
              <p className="mb-0 mt-1 text-[10.5px] text-slate-500">
                {t('banners.auctionLinkHint')}
              </p>
            </div>

            {/* Field: Link đích (Target URL) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('banners.targetUrlLabel')}
              </label>
              <div className="relative flex items-center">
                <Link2 size={15} className="absolute left-3 text-slate-400" />
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  disabled={Boolean(selectedAuctionId)}
                  placeholder={t('banners.targetUrlPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* Field: Schedule (Start & End Date/Time) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('banners.startsAtLabel')}
                </label>
                <div className="relative flex items-center">
                  <Calendar
                    size={14}
                    className="absolute left-3 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => {
                      const start = event.target.value;
                      setStartsAt(start);
                      if (start && endsAt && new Date(endsAt) <= new Date(start)) setEndsAt('');
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('banners.endsAtLabel')}
                </label>
                <div className="relative flex items-center">
                  <Clock size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={endsAt}
                    min={minEndDateTime(startsAt)}
                    onChange={(event) => setEndsAt(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>
            </div>

            {/* Field: Độ ưu tiên & Switch Kích hoạt */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-800">
                    {t('banners.priorityTitle')}
                  </span>
                  <span className="text-[10.5px] text-slate-500">{t('banners.priorityHint')}</span>
                </div>
                <input
                  type="number"
                  min={-1000}
                  max={1000}
                  value={priority}
                  onChange={(event) => setPriority(Number(event.target.value))}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-center font-bold text-xs text-blue-600 outline-none"
                />
              </div>

              {/* Priority Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {t('banners.quickSelect')}
                </span>
                {[
                  { label: t('banners.priorityPresets.high'), val: 100 },
                  { label: t('banners.priorityPresets.medium'), val: 50 },
                  { label: t('banners.priorityPresets.normal'), val: 0 },
                ].map(({ label, val }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPriority(val)}
                    className={`rounded-lg border px-2.5 py-1 text-[10.5px] font-medium transition-colors cursor-pointer ${
                      priority === val
                        ? 'border-blue-300 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 mt-1">
                <div>
                  <span className="block text-xs font-semibold text-slate-800">
                    {t('banners.activateNowTitle')}
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    {t('banners.activateNowHint')}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-3.5 bg-slate-50/50">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving || uploadingImage}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {t('banners.cancel')}
            </button>

            <button
              type="submit"
              disabled={saving || uploadingImage || !!imageUploadError || !imageUrl.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RotateCcw size={14} className="animate-spin" />
                  <span>{t('banners.saving')}</span>
                </>
              ) : editingId ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>{t('banners.saveChanges')}</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>{t('banners.createAndActivate')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
