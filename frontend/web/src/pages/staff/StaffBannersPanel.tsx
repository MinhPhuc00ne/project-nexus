import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  deactivateStaffBanner,
  getStaffBanners,
  saveStaffBanner,
  type StaffBanner,
} from '../../services/staff';

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default function StaffBannersPanel() {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getStaffBanners());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được banner.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setImageUrl('');
    setTargetUrl('');
    setStartsAt('');
    setEndsAt('');
    setPriority(0);
    setIsActive(true);
  }

  function editBanner(item: StaffBanner) {
    setEditingId(item.id);
    setTitle(item.title);
    setImageUrl(item.imageUrl);
    setTargetUrl(item.targetUrl || '');
    setStartsAt(toLocalDateTime(item.startsAt));
    setEndsAt(toLocalDateTime(item.endsAt));
    setPriority(item.priority);
    setIsActive(item.isActive);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await saveStaffBanner(
        {
          title: title.trim(),
          imageUrl: imageUrl.trim(),
          targetUrl: targetUrl.trim() || null,
          startsAt: toIsoDateTime(startsAt),
          endsAt: toIsoDateTime(endsAt),
          isActive,
          priority,
        },
        editingId || undefined,
      );
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được banner.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(item: StaffBanner) {
    if (!window.confirm(`Ngừng hiển thị banner “${item.title}”?`)) return;
    setError('');
    try {
      await deactivateStaffBanner(item.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể ngừng hiển thị banner.');
    }
  }

  return (
    <section className="mt-5 space-y-4" aria-label="Quản lý banner sự kiện">
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="font-bold text-slate-900">
            {editingId ? 'Cập nhật banner' : 'Tạo banner'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Banner có thể đặt lịch hiển thị và độ ưu tiên.
          </p>
        </div>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Tiêu đề
          <input
            required
            minLength={2}
            maxLength={150}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          URL hình ảnh
          <input
            required
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
          Link khi bấm (không bắt buộc)
          <input
            type="url"
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Bắt đầu
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Kết thúc
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          Độ ưu tiên (-1000 đến 1000)
          <input
            type="number"
            min={-1000}
            max={1000}
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Đang hoạt động
        </label>
        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Tạo banner'}
          </button>
          {editingId && (
            <button
              type="button"
              disabled={saving}
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
        >
          Đang tải banner từ hệ thống…
        </p>
      ) : items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover" />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {item.isActive ? 'Đang bật' : 'Đã tắt'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Ưu tiên {item.priority} ·{' '}
                  {item.startsAt
                    ? new Date(item.startsAt).toLocaleString('vi-VN')
                    : 'Không hẹn giờ'}{' '}
                  →{' '}
                  {item.endsAt
                    ? new Date(item.endsAt).toLocaleString('vi-VN')
                    : 'Không đặt ngày kết thúc'}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => editBanner(item)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    Sửa
                  </button>
                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => void deactivate(item)}
                      className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Ngừng hiển thị
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có banner.
        </p>
      )}
    </section>
  );
}
