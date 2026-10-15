import { Bell, ChevronDown, Languages, Menu, ShieldCheck, Radio } from 'lucide-react';
import { useState } from 'react';

// Thanh đầu trang dùng chung cho mọi tab. Thông tin Admin và máy chủ hiện là dữ liệu mẫu.
// onMenu mở sidebar mobile; pendingCount do trang cha tính từ các hồ sơ đang chờ.
export default function AdminHeader({
  onMenu,
  pendingCount,
}: {
  onMenu: () => void;
  pendingCount: number;
}) {
  // State cục bộ chỉ để mở/đóng danh sách thông báo, không sửa dữ liệu nghiệp vụ.
  const [showNotifications, setShowNotifications] = useState(false);
  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="Mở menu"
          className="rounded-lg p-2 text-primary hover:bg-blue-50 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <span className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-[10px] font-bold text-primary">
          <ShieldCheck size={13} />
          NEXUS ADMIN PANEL
        </span>
        <span className="hidden items-center gap-2 text-[11px] text-slate-500 xl:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Cụm máy chủ: 99.98%
        </span>
        <span className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-primary 2xl:flex">
          <Radio size={13} />
          PHÁT SÓNG 3D: SẴN SÀNG
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <Languages size={16} />
          VIE
        </span>
        <div className="relative">
          <button
            aria-label="Thông báo"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-blue-50"
          >
            <Bell size={19} />
            <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
              <p className="text-sm font-bold text-primary">Thông báo quản trị</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Có {pendingCount} yêu cầu đang chờ quyết định. Mở các tab phê duyệt để xem chi tiết.
              </p>
            </div>
          )}
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-slate-900">Alex Tran</p>
          <p className="mt-0.5 text-[9px] font-bold tracking-wider text-primary">SUPER ADMIN</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          AT
        </div>
        <ChevronDown size={13} className="hidden text-slate-400 sm:block" />
      </div>
    </header>
  );
}
