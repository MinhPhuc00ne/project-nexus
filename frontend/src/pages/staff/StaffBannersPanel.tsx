import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertCircle,
  Calendar,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  History,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  deactivateStaffBanner,
  getStaffBannerDisableHistory,
  getStaffBanners,
  saveStaffBanner,
  type StaffBannerDisableHistoryItem,
  type StaffBanner,
} from '../../services/staff';
import { getAuctionsApi, type AuctionEntity } from '../../services/auction.service';
import { uploadBannerImage } from '../../services/banners.service';
import StaffBannerEditorDialog from './StaffBannerEditorDialog';
import { getIntlLocale } from '../../i18n/config';

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function formatBannerSchedule(
  t: TFunction<'staff'>,
  locale: string,
  startsAt?: string | null,
  endsAt?: string | null,
): string {
  if (!startsAt && !endsAt) return t('banners.continuous');
  const startStr = startsAt
    ? new Date(startsAt).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('banners.now');
  const endStr = endsAt
    ? new Date(endsAt).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t('banners.indefinite');
  return `${startStr} → ${endStr}`;
}

export default function StaffBannersPanel(): JSX.Element {
  const { t, i18n } = useTranslation('staff');
  const locale = getIntlLocale(i18n.language);
  const [items, setItems] = useState<StaffBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auctionOptions, setAuctionOptions] = useState<AuctionEntity[]>([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<StaffBannerDisableHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getStaffBanners());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banners.loadErr'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getAuctionsApi({ limit: 100 })
      .then((response) => setAuctionOptions(response.items))
      .catch(() => setAuctionOptions([]));
  }, []);

  async function loadHistory(): Promise<void> {
    setHistoryLoading(true);
    try {
      const response = await getStaffBannerDisableHistory({ limit: 20 });
      setHistoryItems(response.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banners.loadHistoryErr'));
    } finally {
      setHistoryLoading(false);
    }
  }

  function openCreateModal(): void {
    setError('');
    setEditingId(null);
    setTitle('');
    setImageUrl('');
    setImageUploadError('');
    setUploadedFileName('');
    setTargetUrl('');
    setStartsAt('');
    setEndsAt('');
    setPriority(0);
    setIsActive(true);
    setImageError(false);
    setSelectedAuctionId('');
    setIsModalOpen(true);
  }

  function editBanner(item: StaffBanner): void {
    setError('');
    setEditingId(item.id);
    setTitle(item.title);
    setImageUrl(item.imageUrl);
    setImageUploadError('');
    setUploadedFileName('');
    setTargetUrl(item.targetUrl || '');
    setStartsAt(toLocalDateTime(item.startsAt));
    setEndsAt(toLocalDateTime(item.endsAt));
    setPriority(item.priority);
    setIsActive(item.isActive);
    setImageError(false);
    setSelectedAuctionId(item.auctionId ?? '');
    setIsModalOpen(true);
  }

  function closeModal(): void {
    if (uploadingImage) return;
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function uploadImage(file: File): Promise<void> {
    setUploadingImage(true);
    setImageUploadError('');
    setUploadedFileName('');
    try {
      const uploadedUrl = await uploadBannerImage(file);
      setImageUrl(uploadedUrl);
      setImageError(false);
      setUploadedFileName(file.name);
    } catch (cause) {
      setImageUploadError(cause instanceof Error ? cause.message : t('banners.imageUploadErr'));
    } finally {
      setUploadingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving || uploadingImage || imageUploadError || !imageUrl.trim()) return;
    setSaving(true);
    setError('');
    try {
      await saveStaffBanner(
        {
          title: title.trim(),
          imageUrl: imageUrl.trim(),
          targetUrl: selectedAuctionId ? null : targetUrl.trim() || null,
          auctionId: selectedAuctionId || null,
          startsAt: toIsoDateTime(startsAt),
          endsAt: toIsoDateTime(endsAt),
          isActive,
          priority,
        },
        editingId || undefined,
      );
      setIsModalOpen(false);
      setEditingId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banners.saveErr'));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(item: StaffBanner): Promise<void> {
    if (!window.confirm(t('banners.confirmDeactivate', { title: item.title }))) return;
    setError('');
    try {
      await deactivateStaffBanner(item.id);
      await load();
      if (showHistory) await loadHistory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('banners.deactivateErr'));
    }
  }

  const filteredItems = useMemo(() => {
    if (filterTab === 'active') return items.filter((i) => i.isActive);
    if (filterTab === 'inactive') return items.filter((i) => !i.isActive);
    return items;
  }, [items, filterTab]);

  const activeCount = useMemo(() => items.filter((i) => i.isActive).length, [items]);

  return (
    <section className="mt-2 space-y-4" aria-label={t('banners.sectionAria')}>
      {/* Top Error Alert */}
      {error && !isModalOpen && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 shadow-xs"
        >
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {/* Main Command Header: Status Filter Tabs & Create Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('banners.filterAll', { count: items.length })}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                filterTab === 'active'
                  ? 'bg-white text-emerald-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('banners.filterActive', { count: activeCount })}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('inactive')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                filterTab === 'inactive'
                  ? 'bg-white text-slate-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('banners.filterInactive', { count: items.length - activeCount })}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !showHistory;
              setShowHistory(next);
              if (next) void loadHistory();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <History size={16} />
            <span>{t('banners.historyBtn')}</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('banners.createBtn')}</span>
          </button>
        </div>
      </div>
      {showHistory && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="m-0 text-sm font-bold text-slate-800">{t('banners.historyTitle')}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{t('banners.historySubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={historyLoading}
              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              aria-label={t('banners.reloadHistoryAria')}
            >
              <RotateCcw size={15} className={historyLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {historyLoading ? (
            <p className="p-5 text-center text-xs text-slate-500">{t('banners.loadingHistory')}</p>
          ) : historyItems.length === 0 ? (
            <p className="p-5 text-center text-xs text-slate-500">{t('banners.emptyHistory')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 p-0">
              {historyItems.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 text-xs"
                >
                  <div>
                    <p className="m-0 font-semibold text-slate-800">{entry.bannerTitle}</p>
                    <p className="mt-1 text-slate-500">
                      {entry.actorName} ({entry.actorRole}) · {entry.source}
                    </p>
                  </div>
                  <time className="shrink-0 text-slate-400">
                    {new Date(entry.createdAt).toLocaleString(locale)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {/* Banner Gallery Grid / Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center shadow-xs">
          <RotateCcw size={26} className="animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold text-slate-700">{t('banners.loading')}</span>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all hover:shadow-md hover:border-slate-300"
            >
              {/* Banner Image Thumbnail with 21:9 ratio */}
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-slate-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                />

                {/* Overlaid Badges */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[9.5px] font-bold text-white shadow-xs">
                    <Flame size={10} className="text-amber-400" />{' '}
                    {t('banners.priorityBadge', { priority: item.priority })}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold shadow-xs backdrop-blur-xs ${
                      item.isActive
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-700/80 text-slate-200'
                    }`}
                  >
                    {item.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                    {item.isActive ? t('banners.activeBadge') : t('banners.inactiveBadge')}
                  </span>
                </div>
              </div>

              {/* Banner Details Body */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[13.5px] text-slate-900 line-clamp-1 m-0">
                    {item.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Calendar size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {formatBannerSchedule(t, locale, item.startsAt, item.endsAt)}
                    </span>
                  </div>

                  {item.targetUrl ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600">
                      <ExternalLink size={12} className="shrink-0" />
                      <a
                        href={item.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate hover:underline"
                      >
                        {item.targetUrl}
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      {t('banners.noTargetUrl')}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => editBanner(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} className="text-slate-500" />
                    <span>{t('banners.editBtn')}</span>
                  </button>

                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => void deactivate(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50/50 py-1.5 px-3 text-xs font-semibold text-red-600 hover:bg-red-100/60 transition-colors cursor-pointer"
                    >
                      <EyeOff size={13} />
                      <span>{t('banners.disableBtn')}</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
            <Sparkles size={28} />
          </div>
          <h4 className="text-base font-bold text-slate-800 m-0">{t('banners.emptyTitle')}</h4>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500">
            {filterTab !== 'all' ? t('banners.emptyFilteredDesc') : t('banners.emptyAllDesc')}
          </p>
          {filterTab === 'all' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>{t('banners.createFirstBtn')}</span>
            </button>
          )}
        </div>
      )}
      {/* ================= MODAL DIALOG: TẠO / SỬA BANNER ================= */}
      <StaffBannerEditorDialog
        isOpen={isModalOpen}
        t={t}
        editingId={editingId}
        saving={saving}
        error={error}
        closeModal={closeModal}
        submit={submit}
        title={title}
        setTitle={setTitle}
        imageUrl={imageUrl}
        imageInputRef={imageInputRef}
        uploadImage={uploadImage}
        uploadingImage={uploadingImage}
        uploadedFileName={uploadedFileName}
        imageUploadError={imageUploadError}
        imageError={imageError}
        setImageError={setImageError}
        auctionOptions={auctionOptions}
        selectedAuctionId={selectedAuctionId}
        setSelectedAuctionId={setSelectedAuctionId}
        targetUrl={targetUrl}
        setTargetUrl={setTargetUrl}
        startsAt={startsAt}
        setStartsAt={setStartsAt}
        endsAt={endsAt}
        setEndsAt={setEndsAt}
        priority={priority}
        setPriority={setPriority}
        isActive={isActive}
        setIsActive={setIsActive}
      />{' '}
    </section>
  );
}
