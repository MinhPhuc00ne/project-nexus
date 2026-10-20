import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar, { adminNavigation } from '../components/adminDashboard/Sidebar';
import AdminHeader from '../components/adminDashboard/AdminHeader';
import { Button } from '../components/adminDashboard/AdminUI';
import {
  AdminSellerRequestsProvider,
  useAdminSellerRequests,
} from '../components/adminDashboard/AdminSellerRequests';
import { initialAdminData } from '../components/adminDashboard/adminData';
import type { AdminActions, AdminData } from '../components/adminDashboard/adminTypes';
import { Role, type UserProfile } from '../types';
import { getStoredToken } from '../services/auth';
import { getMe } from '../services/users';
import { ApiRequestError } from '../services/api';

// Mỗi kết quả gắn với đúng token đã kiểm tra, tránh dùng quyền của phiên đăng nhập cũ.
type AdminAccess = { token: string | null } & (
  | { status: 'loading' | 'unauthenticated' | 'forbidden' }
  | { status: 'error'; message: string }
  | { status: 'allowed'; user: UserProfile }
);

// Mọi URL /admin/* đều đi qua đây, kể cả khi nhập thẳng đường dẫn trên trình duyệt.
// Chưa xác minh xong thì tuyệt đối chưa render sidebar, header hay page con.
export default function AdminLayout() {
  const token = getStoredToken();
  const [access, setAccess] = useState<AdminAccess>({ token: null, status: 'loading' });
  const [retry, setRetry] = useState(0);

  // Kiểm tra quyền khi vào khu vực admin và khi phiên đăng nhập thay đổi.
  useEffect(() => {
    let active = true;
    let requestId = 0;

    const checkAccess = async () => {
      const currentRequest = ++requestId;
      const checkedToken = getStoredToken();

      if (!checkedToken) {
        setAccess({ token: null, status: 'unauthenticated' });
        return;
      }

      setAccess({ token: checkedToken, status: 'loading' });
      const isCurrent = () =>
        active && currentRequest === requestId && checkedToken === getStoredToken();

      try {
        // Chỉ tin role do backend trả về, không đọc role từ localStorage để cấp quyền.
        const user = await getMe();
        if (!isCurrent()) return;
        if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') {
          throw new Error('Thông tin tài khoản từ máy chủ không hợp lệ.');
        }
        setAccess(
          user.role === Role.ADMIN
            ? { token: checkedToken, status: 'allowed', user }
            : { token: checkedToken, status: 'forbidden' },
        );
      } catch (error: unknown) {
        if (!isCurrent()) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          setAccess({ token: checkedToken, status: 'unauthenticated' });
        } else if (error instanceof ApiRequestError && error.status === 403) {
          setAccess({ token: checkedToken, status: 'forbidden' });
        } else {
          // Mất mạng/lỗi server vẫn chặn nội dung, nhưng cho thử lại thay vì tự đăng xuất.
          setAccess({
            token: checkedToken,
            status: 'error',
            message: error instanceof Error ? error.message : 'Không thể kiểm tra quyền truy cập.',
          });
        }
      }
    };

    const syncAuth = () => void checkAccess();
    const syncStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'nexus:auth-token') syncAuth();
    };
    syncAuth();
    window.addEventListener('nexus:auth-change', syncAuth);
    window.addEventListener('storage', syncStorage);
    return () => {
      active = false;
      window.removeEventListener('nexus:auth-change', syncAuth);
      window.removeEventListener('storage', syncStorage);
    };
  }, [retry]);

  // Chưa đăng nhập hoặc token không hợp lệ: chuyển sang trang login.
  if (!token || (access.token === token && access.status === 'unauthenticated')) {
    return <Navigate to="/login" replace />;
  }

  // Đang xác minh tài khoản: chỉ hiện loading, chưa hiện giao diện admin.
  if (access.token !== token || access.status === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-sm text-slate-600">
          Đang kiểm tra quyền truy cập…
        </p>
      </main>
    );
  }

  if (access.status === 'allowed') {
    // Header dùng cùng profile này; không gọi /users/me thêm lần nữa.
    // Provider chia sẻ dữ liệu hồ sơ Seller; AdminWorkspace ghép các phần giao diện.
    return (
      <AdminSellerRequestsProvider key={token}>
        <AdminWorkspace user={access.user} />
      </AdminSellerRequestsProvider>
    );
  }

  // Sai role thì hiện 403; lỗi kiểm tra quyền thì hiện thông báo và nút thử lại.
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-primary">
          {access.status === 'forbidden'
            ? '403 — Không có quyền truy cập'
            : 'Không thể kiểm tra quyền truy cập'}
        </h1>
        <p
          role={access.status === 'error' ? 'alert' : undefined}
          className="mt-3 text-sm leading-6 text-slate-500"
        >
          {access.status === 'error'
            ? access.message
            : 'Chỉ tài khoản có vai trò ADMIN mới được truy cập khu vực quản trị.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {access.status === 'error' && (
            <Button onClick={() => setRetry((current) => current + 1)}>Thử lại</Button>
          )}
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
  const contentRef = useRef<HTMLElement>(null);
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
    contentRef.current?.scrollTo(0, 0);
    setSidebarOpen(false);
    setDetail(null);
    setConfirmation(null);
  }, [pathname]);
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
  };
  const title =
    adminNavigation.flatMap((group) => group.items).find((item) => item.id === tab)?.label ??
    (tab === 'categories' ? 'Danh mục hàng hóa' : 'Admin');
  // Tính số đếm từ dữ liệu hiện tại; duyệt hồ sơ xong badge sẽ tự giảm sau lần render tiếp.
  const sellerCount = sellerRequests.pendingTotal;
  const refundCount = data.refunds.filter((item) => item.status === 'pending').length;
  return (
    <div className="h-dvh overflow-hidden bg-[#f5f7fb] text-slate-800 selection:bg-blue-100">
      {/* Đây là sidebar: menu điều hướng bên trái, dùng chung cho mọi trang admin.
          open/onClose điều khiển đóng mở menu trên mobile; các count hiển thị badge. */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sellerCount={sellerCount}
        refundCount={refundCount}
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
            data.auctions.filter((item) => item.status === 'pending').length
          }
        />
        {/* Đây là vùng nội dung cuộn của trang; sidebar và header vẫn giữ nguyên vị trí. */}
        <main ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-7 sm:py-6">
            {/* Thanh đường dẫn: Quản trị > tên trang hiện tại, kèm nhãn nguồn dữ liệu. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Quản trị</span>
                <ChevronRight size={12} />
                <span className="font-medium text-slate-600">{title}</span>
              </div>
              <span className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] text-primary">
                {tab === 'sellers'
                  ? 'Hồ sơ Seller từ hệ thống'
                  : 'Hồ sơ Seller từ hệ thống • Các mục khác dùng dữ liệu mẫu'}
              </span>
            </div>
            {/* Tiêu đề trang con; trang overview có tiêu đề riêng nên không hiển thị ở đây. */}
            {tab !== 'overview' && (
              <h1 className="mb-5 text-2xl font-bold tracking-tight text-primary">{title}</h1>
            )}
            {/* Gắn trang con tại đây: /admin/users hiện trang Users, /admin/sellers hiện trang Sellers...
                Router chọn page theo URL; page đọc dữ liệu và thao tác chung qua useAdminContext. */}
            <Outlet context={{ data, actions }} />
          </div>
        </main>
        {/* Đây là footer dùng chung ở cuối khung admin. */}
        <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-400 sm:px-7">
          <span>© 2026 NEXUS • Admin Operations</span>
          <span>3D Auction & Commerce Platform</span>
        </footer>
      </div>
      {/* Đây là thông báo nổi (toast) sau thao tác; chuỗi toast rỗng thì ẩn. */}
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
      {/* Đây là hộp xác nhận: chỉ chạy thao tác đã lưu khi bấm "Xác nhận". */}
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
