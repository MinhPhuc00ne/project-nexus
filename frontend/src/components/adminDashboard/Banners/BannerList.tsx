import { useRef, useState } from 'react';
import { GripVertical, Image, Pencil, Plus, Power, RefreshCw, Search } from 'lucide-react';
import { useCategoryDragScroll } from '../Categories/useCategoryDragScroll';
import { bannerLink, bannerStatus, type Banner } from '../../../services/banners';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { Input } from '../../ui/input';

const displayDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : 'Không giới hạn';

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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useCategoryDragScroll(!!draggedId, containerRef);
  const canReorder = !loading && !saving && !editing && !search.trim() && banners.length > 1;
  const filteredBanners = banners.filter((banner) =>
    banner.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );

  return (
    <Panel
      title="Banner trang chủ"
      icon={<Image size={19} />}
      subtitle="Quản lý ảnh quảng bá trên homepage. Banner bật chỉ hiển thị trong khoảng thời gian đã đặt."
      className="[&>div:first-child]:flex-wrap"
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={loading || saving || editing} onClick={onRefresh}>
            <RefreshCw size={14} /> Làm mới
          </Button>
          <Button disabled={saving || editing} onClick={() => onEdit()}>
            <Plus size={14} /> Thêm banner
          </Button>
        </div>
      }
    >
      <label className="mb-5 flex max-w-sm items-center gap-2">
        <Search size={16} className="text-slate-400" />
        <Input
          aria-label="Tìm banner"
          placeholder="Tìm theo tiêu đề..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p className="mb-4 text-xs text-slate-500" role="status">
        {saving
          ? 'Đang lưu thay đổi…'
          : search.trim()
            ? 'Xóa từ khóa tìm kiếm để kéo thả sắp xếp banner.'
            : 'Kéo biểu tượng ⋮⋮ để đổi thứ tự banner. Thứ tự được tự động lưu; banner trên cùng hiển thị trước.'}
      </p>
      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải banner…
        </p>
      ) : error ? (
        <p role="alert" className="py-6 text-sm text-rose-600">
          {error}
        </p>
      ) : filteredBanners.length === 0 ? (
        <EmptyState
          text={
            search
              ? 'Không tìm thấy banner phù hợp.'
              : 'Chưa có banner. Thêm banner đầu tiên cho trang chủ.'
          }
        />
      ) : (
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="w-12 p-3">
                  <span className="sr-only">Sắp xếp</span>
                </th>
                <th className="p-3">Banner</th>
                <th className="p-3">Lịch hiển thị</th>
                <th className="p-3">Ưu tiên</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Thao tác</th>
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
                        aria-label={`Kéo để sắp xếp banner ${banner.title}`}
                        title="Kéo để đổi thứ tự banner"
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
                          Mở link đích ↗
                        </a>
                      )}
                    </td>
                    <td className="space-y-2 p-3">
                      <p>Từ: {displayDate(banner.startsAt)}</p>
                      <p>Đến: {displayDate(banner.endsAt)}</p>
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
                        {status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          disabled={saving || editing}
                          onClick={() => onEdit(banner)}
                        >
                          <Pencil size={13} /> Sửa
                        </Button>
                        <Button
                          variant={banner.isActive ? 'danger' : 'secondary'}
                          disabled={saving || loading || editing}
                          onClick={() => void onToggle(banner)}
                        >
                          <Power size={13} />
                          {banner.isActive ? 'Tắt' : 'Bật'}
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
