import { useEffect, useState, type FormEvent } from 'react';
import { Image, Pencil, Plus, Power, RefreshCw, Search } from 'lucide-react';
import { Badge, Button, EmptyState, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ToastNotification';
import {
  bannerLink,
  bannerStatus,
  listBanners,
  saveBanner,
  type Banner,
  type BannerInput,
} from '../../services/banners';

const blank: BannerInput = {
  title: '',
  imageUrl: '',
  targetUrl: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  priority: 0,
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Không thể cập nhật banner.';
const localDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const displayDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : 'Không giới hạn';

export default function AdminBannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ id?: string; value: BannerInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listBanners()
      .then((items) => {
        if (active) setBanners(items);
      })
      .catch((cause) => {
        if (active) setError(message(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const openEditor = (banner?: Banner) => {
    setFormError('');
    setPreviewFailed(false);
    setEditor({ id: banner?.id, value: banner ? { ...banner } : { ...blank } });
  };
  const update = (patch: Partial<BannerInput>) => {
    setEditor((current) =>
      current ? { ...current, value: { ...current.value, ...patch } } : null,
    );
    if ('imageUrl' in patch) setPreviewFailed(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || saving) return;
    const value = editor.value;
    if (value.startsAt && value.endsAt && Date.parse(value.startsAt) >= Date.parse(value.endsAt)) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await saveBanner(
        {
          title: value.title.trim(),
          imageUrl: value.imageUrl.trim(),
          targetUrl: value.targetUrl?.trim() || null,
          startsAt: value.startsAt,
          endsAt: value.endsAt,
          isActive: value.isActive,
          priority: value.priority,
        },
        editor.id,
      );
      toast.success(editor.id ? 'Đã cập nhật banner.' : 'Đã thêm banner.');
      setEditor(null);
      setRevision((current) => current + 1);
    } catch (cause) {
      setFormError(message(cause));
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (banner: Banner) => {
    setSaving(true);
    try {
      await saveBanner(
        {
          title: banner.title,
          imageUrl: banner.imageUrl,
          targetUrl: banner.targetUrl,
          startsAt: banner.startsAt,
          endsAt: banner.endsAt,
          priority: banner.priority,
          isActive: !banner.isActive,
        },
        banner.id,
      );
      toast.success(banner.isActive ? 'Đã tắt banner.' : 'Đã bật banner.');
      setRevision((current) => current + 1);
    } catch (cause) {
      toast.error(message(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {editor && (
        <Panel
          title={editor.id ? 'Chỉnh sửa banner' : 'Thêm banner'}
          subtitle="Dùng ảnh có sẵn qua URL HTTPS. Gợi ý ảnh ngang tỉ lệ 3:1, nội dung nằm trong ảnh."
        >
          <form onSubmit={(event) => void submit(event)}>
            <fieldset disabled={saving} className="grid min-w-0 gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="block space-y-2 text-xs font-semibold">
                  Tiêu đề
                  <Input
                    required
                    minLength={2}
                    maxLength={150}
                    value={editor.value.title}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                <label className="block space-y-2 text-xs font-semibold">
                  URL ảnh
                  <Input
                    required
                    type="url"
                    pattern="https?://.+"
                    placeholder="https://example.com/banner.jpg"
                    value={editor.value.imageUrl}
                    onChange={(event) => update({ imageUrl: event.target.value })}
                  />
                </label>
                <label className="block space-y-2 text-xs font-semibold">
                  Link khi bấm (không bắt buộc)
                  <Input
                    type="url"
                    pattern="https?://.+"
                    placeholder="https://..."
                    value={editor.value.targetUrl ?? ''}
                    onChange={(event) => update({ targetUrl: event.target.value || null })}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-xs font-semibold">
                    Bắt đầu
                    <Input
                      type="datetime-local"
                      value={localDate(editor.value.startsAt)}
                      onChange={(event) =>
                        update({
                          startsAt: event.target.value
                            ? new Date(event.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </label>
                  <label className="block space-y-2 text-xs font-semibold">
                    Kết thúc
                    <Input
                      type="datetime-local"
                      value={localDate(editor.value.endsAt)}
                      onChange={(event) =>
                        update({
                          endsAt: event.target.value
                            ? new Date(event.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Thời gian theo múi giờ thiết bị. Bỏ trống để không giới hạn.
                </p>
                <label className="block space-y-2 text-xs font-semibold">
                  Độ ưu tiên (số lớn hiển thị trước)
                  <Input
                    required
                    type="number"
                    min={-1000}
                    max={1000}
                    step={1}
                    value={editor.value.priority}
                    onChange={(event) => update({ priority: event.target.valueAsNumber })}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editor.value.isActive}
                    onChange={(event) => update({ isActive: event.target.checked })}
                  />{' '}
                  Bật banner
                </label>
              </div>
              <div className="min-w-0">
                <p className="mb-3 text-xs font-semibold">Xem trước ảnh banner</p>
                <div className="flex aspect-[3/1] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {bannerLink(editor.value.imageUrl) && !previewFailed ? (
                    <img
                      src={editor.value.imageUrl}
                      alt={editor.value.title || 'Xem trước banner'}
                      className="h-full w-full object-contain"
                      onError={() => setPreviewFailed(true)}
                    />
                  ) : (
                    <p className="p-4 text-center text-xs text-slate-500">
                      {previewFailed
                        ? 'Không tải được ảnh. Kiểm tra URL ảnh.'
                        : 'Nhập URL ảnh để xem trước.'}
                    </p>
                  )}
                </div>
              </div>
              {formError && (
                <p role="alert" className="text-sm text-rose-600 lg:col-span-2">
                  {formError}
                </p>
              )}
              <div className="flex gap-2 lg:col-span-2">
                <Button type="submit">{saving ? 'Đang lưu…' : 'Lưu banner'}</Button>
                <Button type="button" variant="secondary" onClick={() => setEditor(null)}>
                  Hủy
                </Button>
              </div>
            </fieldset>
          </form>
        </Panel>
      )}
      <Panel
        title="Banner trang chủ"
        icon={<Image size={19} />}
        subtitle="Quản lý ảnh quảng bá trên homepage. Banner bật chỉ hiển thị trong khoảng thời gian đã đặt."
        className="[&>div:first-child]:flex-wrap"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={loading || saving || !!editor}
              onClick={() => setRevision((value) => value + 1)}
            >
              <RefreshCw size={14} /> Làm mới
            </Button>
            <Button disabled={saving || !!editor} onClick={() => openEditor()}>
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
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-slate-500">
            Đang tải banner…
          </p>
        ) : error ? (
          <p role="alert" className="py-6 text-sm text-rose-600">
            {error}
          </p>
        ) : banners.filter((banner) =>
            banner.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
          ).length === 0 ? (
          <EmptyState
            text={
              search
                ? 'Không tìm thấy banner phù hợp.'
                : 'Chưa có banner. Thêm banner đầu tiên cho trang chủ.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="p-3">Banner</th>
                  <th className="p-3">Lịch hiển thị</th>
                  <th className="p-3">Ưu tiên</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {banners
                  .filter((banner) =>
                    banner.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
                  )
                  .map((banner) => {
                    const status = bannerStatus(banner);
                    return (
                      <tr key={banner.id} className="border-b border-slate-100 align-top">
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
                              disabled={saving || !!editor}
                              onClick={() => openEditor(banner)}
                            >
                              <Pencil size={13} /> Sửa
                            </Button>
                            <Button
                              variant={banner.isActive ? 'danger' : 'secondary'}
                              disabled={saving || loading || !!editor}
                              onClick={() => void toggle(banner)}
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
    </div>
  );
}
