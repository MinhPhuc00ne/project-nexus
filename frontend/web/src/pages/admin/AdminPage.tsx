import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Sidebar, { adminNavigation } from '../../components/adminDashboard/Sidebar';
import AdminHeader from '../../components/adminDashboard/AdminHeader';
import OverviewTab from '../../components/adminDashboard/OverviewTab';
import AuctionsTab from '../../components/adminDashboard/AuctionsTab';
import StudioTab from '../../components/adminDashboard/StudioTab';
import UsersTab from '../../components/adminDashboard/UsersTab';
import SellersTab from '../../components/adminDashboard/SellersTab';
import RefundsTab from '../../components/adminDashboard/RefundsTab';
import FinanceTab from '../../components/adminDashboard/FinanceTab';
import SystemTab from '../../components/adminDashboard/SystemTab';
import SettingsTab from '../../components/adminDashboard/SettingsTab';
import { DetailDialog } from '../../components/adminDashboard/AdminUI';
import { initialAdminData } from '../../components/adminDashboard/adminData';
import type { AdminActions, AdminData, AdminTab } from '../../components/adminDashboard/adminTypes';

/*
 * Trang cha của toàn bộ khu vực admin.
 * Luồng đọc code: URL → chọn tab → truyền data/actions → tab gọi action → cập nhật UI.
 * Ví dụ /admin/sellers hiển thị SellersTab; Sidebar và Header vẫn nằm bên ngoài tab.
 * Component này phải được render bên trong Router vì có dùng useNavigate/useParams.
 */
// Bảng ánh xạ tên tab trên URL sang component. Thêm tab mới cần cập nhật cả Sidebar và AdminTab.
const tabs = {
  overview: OverviewTab,
  auctions: AuctionsTab,
  studio: StudioTab,
  users: UsersTab,
  sellers: SellersTab,
  refunds: RefundsTab,
  finance: FinanceTab,
  system: SystemTab,
  settings: SettingsTab,
};

export default function AdminPage() {
  // :tab lấy từ route /admin/:tab; giá trị mặc định dùng khi không có tham số.
  const { tab = 'overview' } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  // Dữ liệu dùng chung đặt ở trang cha để thao tác trong tab và số đếm sidebar đồng bộ.
  // State chỉ nằm trong bộ nhớ: chuyển tab vẫn giữ dữ liệu, reload/rời trang admin sẽ reset.
  // Khi nối backend, thay initialAdminData bằng kết quả API và xử lý loading/error tại đây.
  const [data, setData] = useState<AdminData>(initialAdminData);
  // Các state bên dưới quản lý giao diện: menu mobile, thông báo và hai loại hộp thoại.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [detail, setDetail] = useState<{ title: string; content: string } | null>(null);
  // execute giữ thao tác cần chạy, chỉ được gọi khi người dùng bấm "Xác nhận".
  const [confirmation, setConfirmation] = useState<{
    title: string;
    content: string;
    execute: () => void;
  } | null>(null);
  // useRef giữ ID của timer qua các lần render mà không gây render thêm như useState.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hàm cleanup chạy khi rời trang admin, tránh timer cũ tiếp tục cập nhật toast.
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  // Đổi tab thì cuộn lên đầu và đóng hộp thoại của tab trước đó.
  useEffect(() => {
    window.scrollTo(0, 0);
    setDetail(null);
    setConfirmation(null);
  }, [tab]);
  const notify = (message: string) => {
    setToast(message);
    // Hủy timer trước để toast mới không bị timer của toast cũ đóng sớm.
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  };
  // Các tab nhận một bộ callback chung thay vì tự sửa dữ liệu riêng.
  // Khi nối API: gửi yêu cầu tại các action, chỉ cập nhật state sau khi server thành công.
  const actions: AdminActions = {
    navigate: (target) => navigate(`/admin/${target}`),
    notify,
    showDetail: (title, content) => setDetail({ title, content }),
    // Phê duyệt/từ chối Seller mở hộp thoại trước, chưa cập nhật ngay lúc bấm nút.
    reviewSeller: (id, status) =>
      setConfirmation({
        title: status === 'approved' ? 'Phê duyệt gian hàng?' : 'Từ chối hồ sơ Seller?',
        content: 'Thao tác này cập nhật hồ sơ trong bản demo tại giao diện.',
        execute: () => {
          // current là state mới nhất. Spread giữ các danh sách khác; map tạo mảng mới,
          // chỉ thay hồ sơ có id phù hợp, không sửa trực tiếp dữ liệu cũ của React.
          setData((current) => ({
            ...current,
            sellers: current.sellers.map((item) => (item.id === id ? { ...item, status } : item)),
          }));
          notify('Đã cập nhật hồ sơ Seller trong bản demo.');
        },
      }),
    // Quyết định hoàn tiền ở đây chỉ đổi trạng thái demo, chưa gọi cổng thanh toán.
    reviewRefund: (id, status) =>
      setConfirmation({
        title: status === 'approved' ? 'Chấp thuận hoàn tiền?' : 'Bác bỏ khiếu nại?',
        content: `Đơn #${id}. Đây là thao tác demo, không thực hiện chuyển tiền.`,
        execute: () => {
          setData((current) => ({
            ...current,
            refunds: current.refunds.map((item) => (item.id === id ? { ...item, status } : item)),
          }));
          notify('Đã cập nhật quyết định trong bản demo.');
        },
      }),
    // Chờ duyệt → đã lên lịch. Phiên được duyệt sẽ xuất hiện trong lựa chọn của Studio.
    approveAuction: (id) => {
      setData((current) => ({
        ...current,
        auctions: current.auctions.map((item) =>
          item.id === id ? { ...item, status: 'scheduled' } : item,
        ),
      }));
      notify('Đã duyệt lịch đấu giá trong bản demo.');
    },
    // Một action dùng cho cả khóa và mở khóa bằng cách đảo giá trị banned.
    toggleBan: (id) => {
      const user = data.users.find((item) => item.id === id);
      if (!user) return;
      setConfirmation({
        title: user.banned ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?',
        content: `${user.email}\nThao tác chỉ áp dụng trong bản demo.`,
        execute: () => {
          setData((current) => ({
            ...current,
            users: current.users.map((item) =>
              item.id === id ? { ...item, banned: !item.banned } : item,
            ),
          }));
          notify('Đã cập nhật trạng thái tài khoản trong bản demo.');
        },
      });
    },
    addStaff: (name, email, department) => {
      if (!name || !email) return;
      // So sánh email không phân biệt chữ hoa/thường để tránh thêm trùng tài khoản.
      if (data.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        notify('Email này đã có trong danh sách.');
        return;
      }
      setData((current) => ({
        ...current,
        users: [
          ...current.users,
          {
            // ID tạm cho demo; khi tích hợp backend sử dụng ID do server trả về.
            id: `STAFF-${Date.now()}`,
            name,
            email,
            role: 'Staff',
            banned: false,
            note: department,
          },
        ],
      }));
      notify('Đã thêm Staff trong bản demo. Chưa gửi email kích hoạt.');
    },
  };
  // URL có tab không hợp lệ thì đưa về Tổng quan. replace không thêm URL lỗi vào lịch sử.
  // hasOwnProperty kiểm tra key của bảng tabs, không nhận nhầm thuộc tính có sẵn của object.
  if (!Object.prototype.hasOwnProperty.call(tabs, tab))
    return <Navigate to="/admin/overview" replace />;
  // Đã kiểm tra tab hợp lệ ở trên, nên có thể lấy component bằng key kiểu AdminTab.
  const ActiveTab = tabs[tab as AdminTab];
  // Dùng cùng nhãn với sidebar cho breadcrumb, tránh phải khai báo tên ở hai nơi.
  const title = adminNavigation
    .flatMap((group) => group.items)
    .find((item) => item.id === tab)?.label;
  // Tính số đếm từ dữ liệu hiện tại; duyệt hồ sơ xong badge sẽ tự giảm sau lần render tiếp.
  const sellerCount = data.sellers.filter((item) => item.status === 'pending').length;
  const refundCount = data.refunds.filter((item) => item.status === 'pending').length;
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 selection:bg-blue-100">
      {/* Sidebar cố định bên trái; open/onClose chỉ điều khiển đóng mở menu trên mobile. */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sellerCount={sellerCount}
        refundCount={refundCount}
      />
      {/* lg:ml-64 chừa 256px cho sidebar trên desktop. min-w-0 giúp bảng cuộn trong khung. */}
      <div className="min-w-0 lg:ml-64">
        <AdminHeader
          onMenu={() => setSidebarOpen(true)}
          pendingCount={
            sellerCount +
            refundCount +
            data.auctions.filter((item) => item.status === 'pending').length
          }
        />
        <main className="mx-auto max-w-[1720px] px-4 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Quản trị</span>
              <ChevronRight size={12} />
              <span className="font-medium text-slate-600">{title}</span>
            </div>
            <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] text-primary">
              Dữ liệu demo • Chưa kết nối API
            </span>
          </div>
          {tab !== 'overview' && (
            <h1 className="mb-5 text-2xl font-bold tracking-tight text-primary">{title}</h1>
          )}
          {/* key đổi theo URL để reset bộ lọc/form của tab. data chung ở trang cha vẫn được giữ. */}
          <ActiveTab key={tab} data={data} actions={actions} />
          <footer className="mt-7 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
            <span>© 2026 NEXUS • Admin Operations</span>
            <span>3D Auction & Commerce Platform</span>
          </footer>
        </main>
      </div>
      {/* Render có điều kiện: chuỗi toast rỗng thì không hiển thị thông báo. */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-primary px-4 py-3 text-xs text-white shadow-xl sm:right-7"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{toast}</span>
          <button aria-label="Đóng thông báo" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {/* Hộp thoại thông tin chỉ để xem; hộp thoại confirmation bên dưới dành cho thao tác. */}
      {detail && <DetailDialog {...detail} onClose={() => setDetail(null)} />}
      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setConfirmation(null)}
        >
          {/* Click trong hộp thoại được chặn lan ra lớp nền; click nền sẽ đóng hộp thoại. */}
          <section
            role="dialog"
            aria-modal="true"
            aria-label={confirmation.title}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setConfirmation(null);
            }}
          >
            <h2 className="text-lg font-bold text-primary">{confirmation.title}</h2>
            <p className="my-4 whitespace-pre-line text-sm leading-6 text-slate-500">
              {confirmation.content}
            </p>
            <div className="flex justify-end gap-2">
              <button
                autoFocus
                onClick={() => setConfirmation(null)}
                className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  confirmation.execute();
                  setConfirmation(null);
                }}
                className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white"
              >
                Xác nhận
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
