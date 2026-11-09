import { useCallback, useEffect, useState, useMemo, type FormEvent, type JSX } from 'react';
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
  Image as ImageIcon,
  Link2,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
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

function formatBannerSchedule(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt && !endsAt) return 'Hiển thị liên tục (không hẹn giờ)';
  const startStr = startsAt
    ? new Date(startsAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Hiện tại';
  const endStr = endsAt
    ? new Date(endsAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Không thời hạn';
  return `${startStr} → ${endStr}`;
}

export default function StaffBannersPanel(): JSX.Element {
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

  function openCreateModal() {
    setEditingId(null);
    setTitle('');
    setImageUrl('');
    setTargetUrl('');
    setStartsAt('');
    setEndsAt('');
    setPriority(0);
    setIsActive(true);
    setImageError(false);
    setIsModalOpen(true);
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
    setImageError(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
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
      closeModal();
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

  const filteredItems = useMemo(() => {
    if (filterTab === 'active') return items.filter((i) => i.isActive);
    if (filterTab === 'inactive') return items.filter((i) => !i.isActive);
    return items;
  }, [items, filterTab]);

  const activeCount = useMemo(() => items.filter((i) => i.isActive).length, [items]);

  return (
    <section className="mt-2 space-y-4" aria-label="Quản lý banner sự kiện">
      {/* Top Error Alert */}
      {error && (
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
              Tất cả ({items.length})
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
              Đang bật ({activeCount})
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
              Đã tắt ({items.length - activeCount})
            </button>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Tạo banner mới</span>
        </button>
      </div>

      {/* Banner Gallery Grid / Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-16 text-center shadow-xs">
          <RotateCcw size={26} className="animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold text-slate-700">Đang tải danh sách banner...</span>
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
                    <Flame size={10} className="text-amber-400" /> Ưu tiên {item.priority}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold shadow-xs backdrop-blur-xs ${
                      item.isActive
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-700/80 text-slate-200'
                    }`}
                  >
                    {item.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                    {item.isActive ? 'Đang bật' : 'Đã tắt'}
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
                      {formatBannerSchedule(item.startsAt, item.endsAt)}
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
                      Không gắn liên kết điều hướng
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
                    <span>Sửa</span>
                  </button>

                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => void deactivate(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50/50 py-1.5 px-3 text-xs font-semibold text-red-600 hover:bg-red-100/60 transition-colors cursor-pointer"
                    >
                      <EyeOff size={13} />
                      <span>Tắt banner</span>
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
          <h4 className="text-base font-bold text-slate-800 m-0">Chưa có banner nào</h4>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500">
            {filterTab !== 'all'
              ? 'Không tìm thấy banner phù hợp với bộ lọc hiện tại.'
              : 'Hãy bấm nút bên dưới để tạo và phát hành banner sự kiện đầu tiên trên sàn.'}
          </p>
          {filterTab === 'all' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Tạo banner đầu tiên</span>
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
                    {editingId ? 'Cập Nhật Banner Sự Kiện' : 'Tạo Banner Sự Kiện Mới'}
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    {editingId
                      ? 'Điều chỉnh hình ảnh, lịch phát và độ ưu tiên'
                      : 'Thiết lập banner hiển thị quảng bá trên trang chủ và danh mục'}
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
                {/* Field: Tiêu đề */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề banner <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    minLength={2}
                    maxLength={150}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ví dụ: Siêu hội đấu giá 3D tháng 11..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                {/* Field: URL Hình ảnh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đường dẫn hình ảnh (URL) <span className="text-red-500">*</span>
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
                      <Eye size={13} className="text-blue-600" /> Xem trước hiển thị (Live Preview)
                    </span>
                    <span className="text-[10.5px] text-slate-400 font-normal">
                      Tỷ lệ khuyên dùng 21:9
                    </span>
                  </div>

                  <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                    {imageUrl.trim() ? (
                      imageError ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-red-500">
                          <AlertCircle size={22} className="mb-1" />
                          <span className="text-xs font-medium">
                            Không tải được ảnh từ đường dẫn này
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Kiểm tra lại link ảnh trực tiếp (JPG, PNG, WebP)
                          </span>
                        </div>
                      ) : (
                        <img
                          src={imageUrl.trim()}
                          alt="Xem trước banner"
                          className="h-full w-full object-cover transition-opacity duration-200"
                          onError={() => setImageError(true)}
                        />
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                        <ImageIcon size={26} className="mb-1.5 text-slate-300" />
                        <span className="text-xs font-medium text-slate-600">
                          Khung xem trước banner
                        </span>
                        <span className="text-[10.5px] text-slate-400 mt-0.5">
                          Dán link ảnh phía trên để xem trước
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Field: Link đích (Target URL) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Liên kết khi click banner (Tùy chọn)
                  </label>
                  <div className="relative flex items-center">
                    <Link2 size={15} className="absolute left-3 text-slate-400" />
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(event) => setTargetUrl(event.target.value)}
                      placeholder="https://... hoặc đường dẫn sự kiện trên sàn"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                    />
                  </div>
                </div>

                {/* Field: Schedule (Start & End Date/Time) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bắt đầu hiển thị
                    </label>
                    <div className="relative flex items-center">
                      <Calendar
                        size={14}
                        className="absolute left-3 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kết thúc hiển thị
                    </label>
                    <div className="relative flex items-center">
                      <Clock
                        size={14}
                        className="absolute left-3 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="datetime-local"
                        value={endsAt}
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
                        Độ ưu tiên hiển thị
                      </span>
                      <span className="text-[10.5px] text-slate-500">
                        Số càng cao sẽ được ưu tiên hiển thị trước
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
                    <span className="text-[10.5px] text-slate-400 font-medium">Chọn nhanh:</span>
                    {[
                      { label: '🔥 Rất cao (100)', val: 100 },
                      { label: '⭐ Cao (50)', val: 50 },
                      { label: 'Chuẩn (0)', val: 0 },
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
                        Kích hoạt hiển thị ngay
                      </span>
                      <span className="text-[10.5px] text-slate-500">
                        Banner sẽ lập tức xuất hiện trên sàn theo lịch trình
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
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : editingId ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Lưu thay đổi</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Tạo & Kích hoạt</span>
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
