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
import { Role } from '@nexus/contracts';
import { useAuth } from '../contexts/AuthContext';
import { listAdminDisputes, listAdminReports } from '@/features/admin/services/admin';

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

// Shared workspace shell: sidebar, header, footer, and state preserved across admin pages.
// Mounted only after the API confirms ADMIN role; child pages stay unmounted before then.
function AdminWorkspace({ user }: { user: UserProfile }) {
  const { t } = useTranslation(['admin', 'common']);
  const sellerRequests = useAdminSellerRequests();
  const { pathname } = useLocation();
  // Extract current page segment from URL, e.g. /admin/users -> users, to select its title.
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
  // State below manages UI chrome: mobile drawer, toast notice, and detail modal.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { success: notify } = useToast();
  const [detail, setDetail] = useState<{ title: string; content: string } | null>(null);
  // Scroll to top and close previous tab popovers when switching tabs.
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
    setSidebarOpen(false);
    setDetail(null);
  }, [pathname]);
  // Tabs receive a shared actions callback object rather than mutating state independently.
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
  // Derive counts from live data so approving an application updates the badge on next render.
  const sellerCount = sellerRequests.pendingTotal;
  return (
    <div className="h-dvh overflow-hidden bg-[#f5f7fb] text-slate-800 selection:bg-blue-100">
      {/* Left navigation sidebar shared across all admin pages.
          open/onClose toggle mobile drawer visibility; counts display pending badges. */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sellerCount={sellerCount}
        refundCount={refundCount}
        productCount={0}
        reportCount={reportCount}
      />
      {/* lg:ml-64 reserves 256px for desktop sidebar. min-w-0 allows inner tables to scroll. */}
      <div className="flex h-full min-w-0 flex-col lg:ml-64">
        {/* Top header receives admin user, mobile drawer trigger, and pending count. */}
        <AdminHeader
          user={user}
          onMenu={() => setSidebarOpen(true)}
          pendingCount={sellerCount + refundCount + reportCount}
        />
        {/* Scrollable page body; sidebar and header remain fixed. */}
        <main ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-7 sm:py-6">
            {/* Breadcrumb: Admin > current page title. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{t('admin:layout.breadcrumbRoot')}</span>
                <ChevronRight size={12} />
                <span className="font-medium text-slate-600">{title}</span>
              </div>
            </div>
            {/* Child page heading; overview renders its own hero header. */}
            {tab !== 'overview' && (
              <h1 className="mb-5 text-2xl font-bold tracking-tight text-primary">{title}</h1>
            )}
            {/* Child routes mount here: /admin/users renders Users, /admin/sellers renders Sellers, etc.
                Router picks the page by URL; pages share state/actions via useAdminContext. */}
            <Outlet
              context={{ data: EMPTY_ADMIN_DATA, actions, pendingRefundCount: refundCount }}
            />
          </div>
        </main>
        {/* Shared footer at the bottom of the admin shell. */}
        <footer className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-400 sm:px-7">
          <span>{t('admin:layout.footerOps')}</span>
          <span>{t('admin:layout.footerPlatform')}</span>
        </footer>
      </div>
      {/* Read-only detail modal. */}
      {detail && <DetailDialog {...detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// Shared detail modal opened by AdminLayout for child pages; declared locally where used.
// Detail dialog closes via button, backdrop click, or Escape key when focused inside.
// stopPropagation keeps the modal open when clicking inside its content.
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
