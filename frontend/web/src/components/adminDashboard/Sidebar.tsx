import {
  Activity,
  ChartNoAxesCombined,
  ChevronLeft,
  Gavel,
  Layers,
  LayoutDashboard,
  Radio,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { AdminTab } from './adminTypes';

// Cấu hình menu: id phải trùng đường dẫn con trong AppRouter và union AdminTab.
// label là nhãn tiếng Việt, icon là component của thư viện lucide-react.
// Muốn đổi thứ tự hoặc nhóm mục sidebar thì sửa mảng này, không cần sửa từng nút JSX.
export const adminNavigation: {
  label: string;
  items: { id: AdminTab; label: string; icon: typeof Gavel }[];
}[] = [
  {
    label: 'ĐIỀU HÀNH TRỰC TIẾP',
    items: [
      { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'auctions', label: 'Quản lý đấu giá 3D', icon: Gavel },
      // Mở trang quản lý danh mục tại /admin/categories.
      { id: 'categories', label: 'Quản lý danh mục', icon: Layers },
      { id: 'studio', label: 'Studio phát trực tiếp', icon: Radio },
    ],
  },
  {
    label: 'THÀNH VIÊN & PHÊ DUYỆT',
    items: [
      { id: 'users', label: 'Quản trị người dùng', icon: Users },
      { id: 'sellers', label: 'Phê duyệt nâng cấp Seller', icon: Store },
      { id: 'refunds', label: 'Phê duyệt hoàn tiền', icon: ShieldCheck },
    ],
  },
  {
    label: 'TÀI CHÍNH & KỸ THUẬT',
    items: [
      { id: 'finance', label: 'Tài chính & phí sàn', icon: Wallet },
      { id: 'system', label: 'Hệ thống & nhật ký', icon: Activity },
      { id: 'settings', label: 'Cài đặt & kiểm duyệt', icon: Settings2 },
    ],
  },
];

// Sidebar nhận số hồ sơ chờ từ trang cha; không tự giữ một bản dữ liệu riêng.
export default function Sidebar({
  open,
  onClose,
  sellerCount,
  refundCount,
}: {
  open: boolean;
  onClose: () => void;
  sellerCount: number;
  refundCount: number;
}) {
  return (
    <>
      {/* Lớp nền tối chỉ xuất hiện khi mở menu mobile; bấm nền sẽ đóng menu. */}
      {open && (
        <button
          aria-label="Đóng menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}
      {/* lg:translate-x-0 luôn hiện sidebar trên desktop; mobile dùng open để trượt vào/ra. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <NavLink
            to="/admin/overview"
            onClick={onClose}
            aria-label="NEXUS Admin - Tổng quan"
            className="flex flex-1 items-center"
          >
            {/* Vite phục vụ public từ gốc URL, nên đường dẫn không có chữ /public. */}
            <img src="/images/logo.png" alt="NEXUS" className="h-16 w-44 object-contain" />
          </NavLink>
          <button
            aria-label="Đóng menu"
            onClick={onClose}
            className="ml-auto p-1 text-slate-500 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav
          aria-label="Điều hướng quản trị"
          className="flex-1 space-y-6 overflow-y-auto px-3 py-6"
        >
          {adminNavigation.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => (
                  // NavLink tự xác định isActive từ URL để tô màu mục đang chọn.
                  // onClose đóng menu mobile sau khi chọn; không điều khiển URL.
                  <NavLink
                    key={id}
                    to={`/admin/${id}`}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${isActive ? 'bg-primary text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:bg-blue-50 hover:text-primary'}`
                    }
                  >
                    <Icon size={17} />
                    <span className="flex-1">{label}</span>
                    {(id === 'sellers' || id === 'refunds') && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {id === 'sellers' ? sellerCount : refundCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-[10px] font-medium text-primary">
            <ChartNoAxesCombined size={15} />
            <span>Engine 3D WebGL</span>
            <span className="ml-auto flex items-center gap-1 text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              DEMO
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
