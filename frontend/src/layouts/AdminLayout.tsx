import { useEffect, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useToast } from '../components/ToastNotification';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar, { adminNavigation } from '../components/adminDashboard/Layout/Sidebar';
import AdminHeader from '../components/adminDashboard/Layout/AdminHeader';
import { Button } from '../components/adminDashboard/shared/AdminUI';
import {
  AdminSellerRequestsProvider,
  useAdminSellerRequests,
} from '../components/adminDashboard/Sellers/AdminSellerRequests';
import { initialAdminData } from '../components/adminDashboard/shared/mockData/admin';
import { applyCommerceChange } from '../components/adminDashboard/shared/commerceData';
import type { AdminActions, AdminData } from '../components/adminDashboard/shared/adminTypes';
import { Role, type UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { listAdminDisputes, listAdminReports } from '../services/admin';

// Every admin route uses the profile verified by AuthContext; no separate /me call.
export default function AdminLayout() {
  const { token, user, isLoading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading || retrying) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-sm text-slate-600">
          Đang kiểm tra quyền truy cập…
        </p>
      </main>
    );
  }
  // Only a server-verified profile grants access; a role saved in localStorage is insufficient.
  if (user?.role === Role.ADMIN) {
    return (
      <AdminSellerRequestsProvider key={token}>
        <AdminWorkspace user={user} />
      </AdminSellerRequestsProvider>
    );
  }

  const retry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-primary">
          {user ? '403 — Không có quyền truy cập' : 'Không thể kiểm tra quyền truy cập'}
        </h1>
        <p role={!user ? 'alert' : undefined} className="mt-3 text-sm leading-6 text-slate-500">
          {user
            ? 'Chỉ tài khoản có vai trò ADMIN mới được truy cập khu vực quản trị.'
            : 'Chưa thể lấy thông tin tài khoản từ máy chủ. Vui lòng thử lại.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!user && <Button onClick={() => void retry()}>Thử lại</Button>}
          <Link
            to="/"
            className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-semibold text-primary"
          >
            Về trang chủ
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600"
          >
            Đổi tài khoản
          </Link>
        </div>
      </section>
    </main>
  );
}

// Layout là khung chung: sidebar, header, footer và state tồn tại khi chuyển trang admin.
// Khung này chỉ được tạo sau khi API xác nhận role ADMIN; page con chưa mount trước đó.
function AdminWorkspace({ user }: { user: UserProfile }) {
  const sellerRequests = useAdminSellerRequests();
  const { pathname } = useLocation();
  // Lấy tên trang từ URL, ví dụ /admin/users -> users, để chọn tiêu đề tương ứng.
  const tab = pathname.split('/')[2] ?? 'overview';
  const [reportCount, setReportCount] = useState(0);
  const [refundCount, setRefundCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    listAdminDisputes({ limit: 1 }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setRefundCount(result.counters.pendingReview);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRefundCount(0);
      });
    Promise.all([
      listAdminReports({ limit: 1, status: 'PENDING' }, controller.signal),
      listAdminReports({ limit: 1, status: 'INVESTIGATING' }, controller.signal),
    ])
      .then(([pending, investigating]) => {
        if (!controller.signal.aborted) setReportCount(pending.total + investigating.total);
      })
      .catch(() => {
        if (!controller.signal.aborted) setReportCount(0);
      });
    return () => controller.abort();
  }, [tab]);
  const contentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  // Dữ liệu dùng chung đặt ở trang cha để thao tác trong tab và số đếm sidebar đồng bộ.
  // State chỉ nằm trong bộ nhớ: chuyển tab vẫn giữ dữ liệu, reload/rời trang admin sẽ reset.
  // Khi nối backend, thay initialAdminData bằng kết quả API và xử lý loading/error tại đây.
  const [data, setData] = useState<AdminData>(initialAdminData);
  // Các state bên dưới quản lý giao diện: menu mobile, thông báo và hai loại hộp thoại.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { success: notify } = useToast();
  const [detail, setDetail] = useState<{ title: string; content: string } | null>(null);
  // Đổi tab thì cuộn lên đầu và đóng hộp thoại của tab trước đó.
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
    setSidebarOpen(false);
    setDetail(null);
  }, [pathname]);
  // Các tab nhận một bộ callback chung thay vì tự sửa dữ liệu riêng.
  // Khi nối API: gửi yêu cầu tại các action, chỉ cập nhật state sau khi server thành công.
  const actions: AdminActions = {
    updateCommerce: (change) => {
      setData((current) => applyCommerceChange(current, change));
      notify('Đã cập nhật dữ liệu mẫu. Thay đổi sẽ mất khi tải lại trang.');
    },
    navigate: (target) => navigate(`/admin/${target}`),
    notify,
    showDetail: (title, content) => setDetail({ title, content }),
  };
  const title =
    adminNavigation.flatMap((group) => group.items).find((item) => item.id === tab)?.label ??
    (tab === 'categories' ? 'Danh mục hàng hóa' : 'Admin');
  // Tính số đếm từ dữ liệu hiện tại; duyệt hồ sơ xong badge sẽ tự giảm sau lần render tiếp.
  const sellerCount = sellerRequests.pendingTotal;
  const productCount = data.products.filter((item) => item.status === 'pending').length;
  return (
    <div className="h-dvh overflow-hidden bg-[#f5f7fb] text-slate-800 selection:bg-blue-100">
      {/* Đây là sidebar: menu điều hướng bên trái, dùng chung cho mọi trang admin.
          open/onClose điều khiển đóng mở menu trên mobile; các count hiển thị badge. */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sellerCount={sellerCount}
        refundCount={refundCount}
        productCount={productCount}
        reportCount={reportCount}
      />
      {/* lg:ml-64 chừa 256px cho sidebar trên desktop. min-w-0 giúp bảng cuộn trong khung. */}
      <div className="flex h-full min-w-0 flex-col lg:ml-64">
        {/* Gắn header phía trên: nhận tài khoản admin, nút mở menu mobile và số việc chờ xử lý. */}
        <AdminHeader
          user={user}
          onMenu={() => setSidebarOpen(true)}
          pendingCount={
            sellerCount +
            refundCount +
            productCount +
            reportCount +
            data.auctions.filter((item) => item.status === 'pending').length
          }
        />
        {/* Đây là vùng nội dung cuộn của trang; sidebar và header vẫn giữ nguyên vị trí. */}
        <main ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-7 sm:py-6">
            {/* Thanh đường dẫn: Quản trị > tên trang hiện tại. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Quản trị</span>
                <ChevronRight size={12} />
                <span className="font-medium text-slate-600">{title}</span>
              </div>
            </div>
            {/* Tiêu đề trang con; trang overview có tiêu đề riêng nên không hiển thị ở đây. */}
            {tab !== 'overview' && (
              <h1 className="mb-5 text-2xl font-bold tracking-tight text-primary">{title}</h1>
            )}
            {/* Gắn trang con tại đây: /admin/users hiện trang Users, /admin/sellers hiện trang Sellers...
                Router chọn page theo URL; page đọc dữ liệu và thao tác chung qua useAdminContext. */}
            <Outlet context={{ data, actions, pendingRefundCount: refundCount }} />
          </div>
        </main>
        {/* Đây là footer dùng chung ở cuối khung admin. */}
        <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-400 sm:px-7">
          <span>© 2026 NEXUS • Admin Operations</span>
          <span>3D Auction & Commerce Platform</span>
        </footer>
      </div>
      {/* Hộp thoại thông tin chỉ để xem. */}
      {detail && <DetailDialog {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// Hộp xem chi tiết do layout mở cho mọi trang con; chỉ khai báo nội bộ tại nơi sử dụng.
// Hộp thoại xem thông tin: đóng bằng nút, click lớp nền hoặc phím Escape khi focus bên trong.
// stopPropagation giữ hộp thoại mở khi người dùng bấm vào phần nội dung.
function DetailDialog({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button
            autoFocus
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="my-5 whitespace-pre-line text-sm leading-7 text-slate-600">{content}</p>
        <Button onClick={onClose}>Đóng</Button>
      </section>
    </div>
  );
}
