import { useCallback, useEffect, useState, useMemo, type FormEvent, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  History,
  Image as ImageIcon,
  Link2,
  Plus,
  RotateCcw,
  Sparkles,
  X,
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
import { minEndDateTime } from '../../utils/date-time';
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
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;
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
      closeModal();
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
      {isModalOpen && (
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

                {/* Field: URL Hình ảnh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('banners.imageUrlLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <ImageIcon size={15} className="absolute left-3 text-slate-400" />
                    <input
                      required
                      type="url"
                      value={imageUrl}
                      onChange={(event) => {
                        setImageUrl(event.target.value);
                        setImageError(false);
                      }}
                      placeholder="https://domain.com/banner-image.jpg"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                    />
                  </div>
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
                      <Clock
                        size={14}
                        className="absolute left-3 text-slate-400 pointer-events-none"
                      />
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
                      <span className="text-[10.5px] text-slate-500">
                        {t('banners.priorityHint')}
                      </span>
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
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('banners.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={saving}
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
      )}
    </section>
  );
}
