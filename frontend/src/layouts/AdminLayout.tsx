import PageTransition from '../components/common/PageTransition';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/ToastNotification';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar, { adminNavigation } from '../components/adminDashboard/Layout/Sidebar';
import AdminHeader from '../components/adminDashboard/Layout/AdminHeader';
import { Button } from '../components/adminDashboard/shared/AdminUI';
import {
  AdminSellerRequestsProvider,
  useAdminSellerRequests,
} from '../components/adminDashboard/Sellers/AdminSellerRequests';
import type { AdminActions, AdminData } from '../components/adminDashboard/shared/adminTypes';
import type { UserProfile } from '@/features/account/types/user.types';
import { Role } from '@nexus/types';
import { useAuth } from '../contexts/AuthContext';
import { useAdminPendingCounts } from '../components/adminDashboard/Layout/useAdminPendingCounts';

const EMPTY_ADMIN_DATA: AdminData = {
  products: [],
  orders: [],
  stores: [],
  reports: [],
  transactions: [],
  auctions: [],
};

// Every admin route uses the profile verified by AuthContext; no separate /me call.
export default function AdminLayout() {
  const { t } = useTranslation(['admin', 'common']);
  const { token, user, isLoading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading || retrying) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-sm text-slate-600">
          {t('common:states.checkingAccess')}
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
          {user ? t('common:access.forbiddenTitle') : t('common:access.cannotVerifyTitle')}
        </h1>
        <p role={!user ? 'alert' : undefined} className="mt-3 text-sm leading-6 text-slate-500">
          {user ? t('admin:layout.forbiddenDesc') : t('common:access.cannotVerifyDesc')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!user && <Button onClick={() => void retry()}>{t('common:actions.retry')}</Button>}
          <Link
            to="/"
            className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-semibold text-primary"
          >
            {t('common:access.backHome')}
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600"
          >
            {t('common:access.switchAccount')}
          </Link>
        </div>
      </section>
    </main>
  );
}

// Layout là khung chung: sidebar, header, footer và state tồn tại khi chuyển trang admin.
// Khung này chỉ được tạo sau khi API xác nhận role ADMIN; page con chưa mount trước đó.
function AdminWorkspace({ user }: { user: UserProfile }) {
  const { t } = useTranslation(['admin', 'common']);
  const sellerRequests = useAdminSellerRequests();
  const { pathname } = useLocation();
  // Lấy tên trang từ URL, ví dụ /admin/users -> users, để chọn tiêu đề tương ứng.
  const tab = pathname.split('/')[2] ?? 'overview';
  const { reportCount, refundCount } = useAdminPendingCounts(user.id);
  const contentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
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
  const actions: AdminActions = {
    updateCommerce: () => undefined,
    navigate: (target) => navigate(`/admin/${target}`),
    notify,
    showDetail: (title, content) => setDetail({ title, content }),
  };
  const navItem = adminNavigation.flatMap((group) => group.items).find((item) => item.id === tab);
  const title = navItem
    ? t(`admin:nav.${navItem.id}`, { defaultValue: navItem.label })
    : tab === 'categories'
      ? t('admin:nav.categories')
      : t('admin:layout.fallbackTitle');
  // Tính số đếm từ dữ liệu hiện tại; duyệt hồ sơ xong badge sẽ tự giảm sau lần render tiếp.
  const sellerCount = sellerRequests.pendingTotal;
  return (
    <div className="nexus-shell h-dvh overflow-hidden text-sm selection:bg-blue-100">
      {/* Đây là sidebar: menu điều hướng bên trái, dùng chung cho mọi trang admin.
          open/onClose điều khiển đóng mở menu trên mobile; các count hiển thị badge. */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sellerCount={sellerCount}
        refundCount={refundCount}
        productCount={0}
        reportCount={reportCount}
      />
      {/* lg:ml-64 chừa 256px cho sidebar trên desktop. min-w-0 giúp bảng cuộn trong khung. */}
      <div className="flex h-full min-w-0 flex-col lg:ml-64">
        {/* Gắn header phía trên: nhận tài khoản admin, nút mở menu mobile và số việc chờ xử lý. */}
        <AdminHeader
          user={user}
          onMenu={() => setSidebarOpen(true)}
          pendingCount={sellerCount + refundCount + reportCount}
        />
        {/* Đây là vùng nội dung cuộn của trang; sidebar và header vẫn giữ nguyên vị trí. */}
        <main ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
            {/* Thanh đường dẫn: Quản trị > tên trang hiện tại. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{t('admin:layout.breadcrumbRoot')}</span>
                <ChevronRight size={12} />
                <span className="font-medium text-slate-600">{title}</span>
              </div>
            </div>
            {/* Tiêu đề trang con; trang overview có tiêu đề riêng nên không hiển thị ở đây. */}
            {tab !== 'overview' && tab !== 'chat' && (
              <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {title}
              </h1>
            )}
            {/* Gắn trang con tại đây: /admin/users hiện trang Users, /admin/sellers hiện trang Sellers...
                Router chọn page theo URL; page đọc dữ liệu và thao tác chung qua useAdminContext. */}
            <PageTransition>
              <Outlet
                context={{ data: EMPTY_ADMIN_DATA, actions, pendingRefundCount: refundCount }}
              />
            </PageTransition>
          </div>
        </main>
        {/* Đây là footer dùng chung ở cuối khung admin. */}
        <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs text-muted sm:px-8">
          <span>{t('admin:layout.footerOps')}</span>
          <span>{t('admin:layout.footerPlatform')}</span>
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
  const { t } = useTranslation('common');
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
            aria-label={t('actions.close')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="my-5 whitespace-pre-line text-sm leading-7 text-slate-600">{content}</p>
        <Button onClick={onClose}>{t('actions.close')}</Button>
      </section>
    </div>
  );
}
