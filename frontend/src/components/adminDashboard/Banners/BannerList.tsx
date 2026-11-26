import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Image, Pencil, Plus, Power, RefreshCw, Search } from 'lucide-react';
import { useCategoryDragScroll } from '../Categories/useCategoryDragScroll';
import { bannerLink, bannerStatus, type Banner } from '@/features/catalog/services/banners';
import { getIntlLocale } from '../../../i18n/config';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { Input } from '../../ui/input';

interface BannerListProps {
  banners: Banner[];
  loading: boolean;
  error: string;
  saving: boolean;
  editing: boolean;
  search: string;
  setSearch: (value: string) => void;
  onRefresh: () => void;
  onEdit: (banner?: Banner) => void;
  onToggle: (banner: Banner) => Promise<void>;
  onReorder: (sourceId: string, targetId: string) => Promise<void>;
}

export default function BannerList({
  banners,
  loading,
  error,
  saving,
  editing,
  search,
  setSearch,
  onRefresh,
  onEdit,
  onToggle,
  onReorder,
}: BannerListProps) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const displayDate = (value: string | null) =>
    value ? new Date(value).toLocaleString(locale) : t('banners.unlimited');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useCategoryDragScroll(!!draggedId, containerRef);
  const canReorder = !loading && !saving && !editing && !search.trim() && banners.length > 1;
  const filteredBanners = banners.filter((banner) =>
    banner.title.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)),
  );

  return (
    <Panel
      title={t('banners.title')}
      icon={<Image size={19} />}
      subtitle={t('banners.subtitle')}
      className="[&>div:first-child]:flex-wrap"
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={loading || saving || editing} onClick={onRefresh}>
            <RefreshCw size={14} /> {t('banners.refresh')}
          </Button>
          <Button disabled={saving || editing} onClick={() => onEdit()}>
            <Plus size={14} /> {t('banners.addBtn')}
          </Button>
        </div>
      }
    >
      <label className="mb-5 flex max-w-sm items-center gap-2">
        <Search size={16} className="text-slate-400" />
        <Input
          aria-label={t('banners.searchAria')}
          placeholder={t('banners.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p className="mb-4 text-xs text-slate-500" role="status">
        {saving
          ? t('banners.saving')
          : search.trim()
            ? t('banners.clearSearchHint')
            : t('banners.dragHint')}
      </p>
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          {t('banners.loading')}
        </p>
      ) : error ? (
        <p role="alert" className="py-6 text-sm text-rose-600">
          {error}
        </p>
      ) : filteredBanners.length === 0 ? (
        <EmptyState text={search ? t('banners.emptySearch') : t('banners.emptyAll')} />
      ) : (
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="w-12 p-3">
                  <span className="sr-only">{t('banners.cols.sort')}</span>
                </th>
                <th className="p-3">{t('banners.cols.banner')}</th>
                <th className="p-3">{t('banners.cols.schedule')}</th>
                <th className="p-3">{t('banners.cols.priority')}</th>
                <th className="p-3">{t('banners.cols.status')}</th>
                <th className="p-3">{t('banners.cols.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanners.map((banner) => {
                const status = bannerStatus(banner);
                return (
                  <tr
                    key={banner.id}
                    onDragOver={(event) => {
                      if (!canReorder || !draggedId || draggedId === banner.id) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDropId(banner.id);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDropId((current) => (current === banner.id ? null : current));
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = draggedId;
                      setDraggedId(null);
                      setDropId(null);
                      if (canReorder && sourceId) void onReorder(sourceId, banner.id);
                    }}
                    className={`border-b border-slate-100 align-top ${draggedId === banner.id ? 'opacity-50' : ''} ${dropId === banner.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
                  >
                    <td className="p-3">
                      <Button
                        type="button"
                        variant="secondary"
                        draggable={canReorder}
                        disabled={!canReorder}
                        aria-label={t('banners.dragAria', { title: banner.title })}
                        title={t('banners.dragTitle')}
                        className="cursor-grab active:cursor-grabbing"
                        onDragStart={(event) => {
                          if (!canReorder) {
                            event.preventDefault();
                            return;
                          }
                          event.dataTransfer.setData('text/plain', banner.id);
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggedId(banner.id);
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDropId(null);
                        }}
                      >
                        <GripVertical size={16} aria-hidden="true" />
                      </Button>
                    </td>
                    <td className="p-3">
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="mb-2 aspect-[3/1] w-40 rounded-lg bg-slate-100 object-contain"
                      />
                      <p className="max-w-60 break-words font-semibold">{banner.title}</p>
                      {bannerLink(banner.targetUrl) && (
                        <a
                          href={bannerLink(banner.targetUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-blue-600 underline"
                        >
                          {t('banners.openTargetLink')}
                        </a>
                      )}
                    </td>
                    <td className="space-y-2 p-3">
                      <p>{t('banners.fromDate', { date: displayDate(banner.startsAt) })}</p>
                      <p>{t('banners.toDate', { date: displayDate(banner.endsAt) })}</p>
                    </td>
                    <td className="p-3">{banner.priority}</td>
                    <td className="p-3">
                      <Badge
                        tone={
                          status === 'Đang hiển thị'
                            ? 'green'
                            : status === 'Đã lên lịch'
                              ? 'amber'
                              : 'gray'
                        }
                      >
                        {t(`banners.statuses.${status}`, { defaultValue: status })}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          disabled={saving || editing}
                          onClick={() => onEdit(banner)}
                        >
                          <Pencil size={13} /> {t('banners.editBtn')}
                        </Button>
                        <Button
                          variant={banner.isActive ? 'danger' : 'secondary'}
                          disabled={saving || loading || editing}
                          onClick={() => void onToggle(banner)}
                        >
                          <Power size={13} />
                          {banner.isActive ? t('banners.disableBtn') : t('banners.enableBtn')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
