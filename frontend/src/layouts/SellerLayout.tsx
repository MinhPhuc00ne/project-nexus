import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight as SwapOutlined } from 'lucide-react';
import {
  Box as CodeSandboxOutlined,
  ChevronDown as DownOutlined,
  CircleHelp as QuestionCircleOutlined,
  LayoutDashboard as DashboardOutlined,
  LogOut as LogoutOutlined,
  Menu as MenuOutlined,
  Inbox as InboxOutlined,
  Settings as SettingOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Star as StarOutlined,
  Store as ShopOutlined,
  Truck as TruckOutlined,
  WalletCards as WalletOutlined,
  User as UserOutlined,
} from 'lucide-react';
import { useSellerSession } from '../components/seller/SellerSession';
import { useAuth } from '../contexts/AuthContext';
import { clearAuthSession } from '../services/auth';
import { useSellerStore } from '../components/seller/useSellerStore';
import SellerNotifications from '../components/seller/SellerNotifications';
import { SellerWorkspaceContext } from '../components/seller/SellerWorkspace';
import type { SellerDraft } from '../components/seller/sellerData';
import { useToast } from '../components/ToastNotification';
import LogoutConfirmDialog from '../components/auth/LogoutConfirmDialog';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { dashboardChrome } from '../components/dashboard/dashboardChrome';

const linkDefs = [
  { to: '/seller', key: 'nav.center', icon: ShopOutlined },
  { to: '/seller/overview', key: 'nav.overview', icon: DashboardOutlined },
  { to: '/seller/orders', key: 'nav.orders', icon: TruckOutlined },
  { to: '/seller/auctions', key: 'nav.auctions', icon: CodeSandboxOutlined },
  { to: '/seller/products', key: 'nav.products', icon: InboxOutlined },
  { to: '/seller/finance', key: 'nav.finance', icon: WalletOutlined },
  { to: '/seller/reviews', key: 'nav.reviews', icon: StarOutlined },
  { to: '/seller/disputes', key: 'nav.disputes', icon: SafetyCertificateOutlined },
  { to: '/seller/settings', key: 'nav.settings', icon: SettingOutlined },
  { to: '/seller/profile', key: 'nav.profile', icon: UserOutlined },
] as const;
function readDrafts(key: string): SellerDraft[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value)
      ? value.filter(
          (item): item is SellerDraft =>
            !!item &&
            typeof item.id === 'string' &&
            typeof item.title === 'string' &&
            ['product', 'auction'].includes(item.kind) &&
            typeof item.price === 'number',
        )
      : [];
  } catch {
    return [];
  }
}
export default function SellerLayout() {
  const user = useSellerSession();
  return <SellerWorkspace key={user.id} />;
}
function SellerWorkspace() {
  const { t } = useTranslation(['seller', 'common']);
  const user = useSellerSession();
  const { switchActiveMode, token, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [account, setAccount] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [search, setSearch] = useState('');
  const store = useSellerStore(user.id);
  const draftKey = `nexus:seller-drafts:${user.id}`;
  const [drafts, setDrafts] = useState(() => readDrafts(draftKey));
  const accountRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const toggleLock = useRef(false);
  useEffect(() => {
    setSidebar(false);
    setAccount(false);
    setNotifications(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccount(false);
      if (!noticeRef.current?.contains(event.target as Node)) setNotifications(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebar(false);
        setAccount(false);
        setNotifications(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  const saveDraft = (draft: SellerDraft) => {
    const next = [draft, ...drafts.filter((item) => item.id !== draft.id)];
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
      setDrafts(next);
      toast.success(t('drafts.saved'));
      return true;
    } catch {
      toast.error(t('drafts.saveFailed'));
      return false;
    }
  };
  const deleteDraft = (id: string) => {
    const next = drafts.filter((item) => item.id !== id);
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
      setDrafts(next);
      toast.success(t('drafts.deleted'));
    } catch {
      toast.error(t('drafts.deleteFailed'));
    }
  };
  const switchToBuyer = async () => {
    if (toggleLock.current) return;
    toggleLock.current = true;
    setPending(true);
    try {
      await switchActiveMode('BUYER');
      toast.success(t('layout.switchedToBuyer'));
      navigate('/buyer');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : t('layout.switchModeFailed'));
    } finally {
      toggleLock.current = false;
      setPending(false);
    }
  };
  const initials = user.fullName
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <SellerWorkspaceContext.Provider
      value={{
        storeName: store.name,
        storeLoading: store.loading,
        storeError: store.error,
        shop: store.shop,
        refreshShop: store.refresh,
        search,
        setSearch,
        notify: (message, variant = 'success') => {
          toast[variant](message);
        },
        drafts,
        saveDraft,
        deleteDraft,
      }}
    >
      <div
        className="min-h-[100vh] bg-[#f6f8fc] text-[#182541] text-[13px] leading-[1.55] [&_*]:box-border [&_button]:[-webkit-tap-highlight-color:transparent] [&_button]:cursor-pointer [&_button]:[font:inherit] [&_button]:[transition:background_0.16s,_color_0.16s,_box-shadow_0.16s] [&_a]:[-webkit-tap-highlight-color:transparent] [&_a]:no-underline [&_input]:[-webkit-tap-highlight-color:transparent] [&_input]:[font:inherit] [&_select]:[-webkit-tap-highlight-color:transparent] [&_select]:cursor-pointer [&_select]:[font:inherit] [&_textarea]:[-webkit-tap-highlight-color:transparent] [&_textarea]:[font:inherit] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-[0.48] [&_:focus-visible]:[outline:3px_solid_#99b8ff] [&_:focus-visible]:[outline-offset:3px] [&_p]:mt-0 motion-reduce:[&_*]:[scroll-behavior:auto]! motion-reduce:[&_*]:[transition:none]! motion-reduce:[&_*]:[animation:none]!"
        data-seller="shell"
      >
        {sidebar && (
          <button
            className={dashboardChrome.sidebarBackdrop}
            data-seller="sidebar-backdrop"
            aria-label={t('layout.closeMenu')}
            onClick={() => setSidebar(false)}
          />
        )}
        <aside
          id="seller-navigation"
          className={`${dashboardChrome.sidebar} ${sidebar ? 'translate-x-0 is-open' : '-translate-x-full'}`}
          data-seller="sidebar"
        >
          <Link
            to="/seller"
            className={`${dashboardChrome.sidebarBrand} [&>img]:size-9 [&>img]:object-contain [&_strong]:text-[19px] [&_strong]:font-bold [&_strong]:tracking-tight [&_strong]:text-slate-900 [&_small]:block [&_small]:text-[9px] [&_small]:tracking-wider [&_small]:text-slate-500`}
            data-seller="brand"
          >
            <img src="/images/NEXUS.png" alt="NEXUS" />
            <span>
              <strong>NEXUS</strong>
              <small>SELLER CENTER</small>
            </span>
            <span
              className="ml-auto rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-primary"
              data-seller="version"
            >
              v2.4
            </span>
          </Link>
          <div className={`${dashboardChrome.sidebarLabel} mt-6 px-6`} data-seller="sidebar-label">
            {t('layout.sidebarLabel')}
          </div>
          <nav
            className="flex-1 space-y-1 overflow-y-auto px-3 pb-6"
            aria-label={t('layout.navAria')}
          >
            {linkDefs.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/seller'}
                className={({ isActive }) =>
                  `${dashboardChrome.navItem} ${isActive || (to === '/seller/products' && location.pathname === '/seller/inventory') ? dashboardChrome.navActive + ' is-active' : dashboardChrome.navIdle}`
                }
                data-seller="nav-link"
              >
                <Icon size={17} aria-hidden="true" />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-100 p-4" data-seller="sidebar-bottom">
            <div
              className="rounded-lg bg-blue-50 px-3 py-2.5 text-[10px] text-primary [&>div]:flex [&>div]:items-center [&>div]:gap-1.5 [&>div]:font-semibold [&_p]:my-2 [&_p]:text-[10px] [&_p]:leading-relaxed [&_p]:text-slate-500 [&>a]:flex [&>a]:items-center [&>a]:justify-between [&>a]:font-medium"
              data-seller="studio-card"
            >
              <div>
                <span
                  className="w-1.5 h-1.5 inline-block rounded-full bg-[#14b58a] shrink-0"
                  data-seller="dot"
                />{' '}
                {t('layout.studioTitle')} <CodeSandboxOutlined size={15} aria-hidden="true" />
              </div>
              <p>{t('layout.studioDesc')}</p>
              <Link to="/seller/auctions">
                {t('layout.exploreAuctions')} <DownOutlined size={13} aria-hidden="true" />
              </Link>
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 pt-4 text-left text-xs! font-medium text-slate-500 hover:text-primary [&>svg:last-child]:ml-auto"
              data-seller="support-link"
              onClick={() => navigate('/seller/disputes')}
            >
              <QuestionCircleOutlined size={17} aria-hidden="true" />
              {t('layout.supportCenter')}
              <SwapOutlined size={14} aria-hidden="true" />
            </button>
          </div>
        </aside>
        <div className="min-w-0 lg:ml-64" data-seller="workspace">
          <header className={`sticky top-0 ${dashboardChrome.header}`} data-seller="topbar">
            <button
              className={dashboardChrome.menuButton}
              data-seller="icon-button mobile-menu"
              aria-label={t('layout.openMenu')}
              aria-expanded={sidebar}
              aria-controls="seller-navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <MenuOutlined size={20} aria-hidden="true" />
            </button>
            <div className={`ml-auto ${dashboardChrome.headerActions}`} data-seller="topbar-right">
              <span
                className={`hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-700 xl:flex [&.is-paused]:bg-slate-100 [&.is-paused]:text-slate-500 [&.is-paused_[data-seller~=dot]]:bg-slate-400 ${!user.isSellerActive ? 'is-paused' : ''}`}
                data-seller="shop-status"
              >
                <span
                  className="w-1.5 h-1.5 inline-block rounded-full bg-[#14b58a] shrink-0"
                  data-seller="dot"
                />
                {(() => {
                  if (user.isShopSuspended) return t('layout.shopSuspended');
                  if (user.isSellerActive) return t('layout.shopActive');
                  return t('layout.buyerMode');
                })()}
              </span>
              <LanguageSwitcher compact />
              <div className="relative" data-seller="popover-anchor" ref={noticeRef}>
                <SellerNotifications
                  key={`${user.id}:${token}`}
                  userId={user.id}
                  isOpen={notifications}
                  onToggle={() => {
                    setNotifications(!notifications);
                    setAccount(false);
                  }}
                />
              </div>
              <div className="relative" data-seller="popover-anchor" ref={accountRef}>
                <button
                  className={dashboardChrome.accountButton}
                  data-seller="account-button"
                  aria-expanded={account}
                  onClick={() => {
                    setAccount(!account);
                    setNotifications(false);
                  }}
                >
                  <span
                    className={`${dashboardChrome.avatar} order-2 [&_img]:size-full [&_img]:object-cover`}
                    data-seller="avatar"
                  >
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
                  </span>
                  <span
                    className="order-1 hidden max-w-36 text-right sm:block [&_strong]:block [&_strong]:truncate [&_strong]:text-xs [&_strong]:font-semibold [&_strong]:text-slate-900 [&_small]:mt-0.5 [&_small]:block [&_small]:text-[9px] [&_small]:font-bold [&_small]:tracking-wider [&_small]:text-primary"
                    data-seller="account-copy"
                  >
                    <strong>{user.fullName}</strong>
                    <small>{t('layout.sellerIdPrefix', { id: user.id.slice(0, 8) })}</small>
                  </span>
                  <DownOutlined size={13} className="order-3 text-slate-400" aria-hidden="true" />
                </button>
                {account && (
                  <div
                    className={`${dashboardChrome.accountMenu} z-50 [&_p]:mb-2 [&_p]:mt-1 [&_p]:break-words [&_p]:border-b [&_p]:border-slate-100 [&_p]:px-3 [&_p]:pb-3 [&_p]:text-xs [&_p]:text-slate-500 [&>strong]:block [&>strong]:px-3 [&>strong]:pt-3 [&>strong]:text-sm [&>strong]:font-semibold [&>strong]:text-slate-900 [&_button]:flex [&_button]:w-full [&_button]:items-center [&_button]:gap-2.5 [&_button]:rounded-lg [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-2.5 [&_button]:text-left [&_button]:text-xs! [&_button]:text-slate-700 [&_button:hover]:bg-blue-50 [&_button:hover]:text-primary [&_[data-seller~=logout]]:text-red-500 [&_[data-seller~=logout]:hover]:bg-red-50`}
                    data-seller="popover account-menu"
                  >
                    <strong>{user.fullName}</strong>
                    <p>{user.email}</p>
                    <button onClick={() => navigate('/seller/settings')}>
                      <SettingOutlined size={16} aria-hidden="true" />
                      {t('layout.accountSettings')}
                    </button>
                    <button disabled={pending} onClick={() => void switchToBuyer()}>
                      <SwapOutlined size={16} aria-hidden="true" />
                      {pending ? t('layout.switching') : t('layout.switchToBuyer')}
                    </button>
                    <button
                      className=""
                      data-seller="logout"
                      onClick={() => {
                        setAccount(false);
                        setLogoutConfirmationOpen(true);
                      }}
                    >
                      <LogoutOutlined size={16} aria-hidden="true" />
                      {t('common:nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main
            className="max-w-[1550px] m-auto [padding:30px_32px_20px] min-h-[calc(100vh_-_136px)] min-[1600px]:pt-[35px] max-[1250px]:py-[25px] max-[1250px]:px-[23px] max-[760px]:py-[23px] max-[760px]:px-4.5 max-[540px]:py-5 max-[540px]:px-3.5"
            data-seller="main"
          >
            {user.isShopSuspended && (
              <div
                role="alert"
                className="mb-5 space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">{t('layout.suspendedBanner')}</p>
                {user.suspensionReason && (
                  <p>{t('layout.suspendedReason', { reason: user.suspensionReason })}</p>
                )}
                <button type="button" className="underline" onClick={() => void refreshProfile()}>
                  {t('layout.recheckStatus')}
                </button>
              </div>
            )}
            <Outlet />
          </main>
          <footer
            className="py-6 px-8 flex justify-between text-[#99a6bc] text-[10px] gap-3 [&>span:not(.anticon):last-child]:flex [&>span:not(.anticon):last-child]:items-center [&>span:not(.anticon):last-child]:gap-1.5 max-[760px]:py-5 max-[760px]:px-4.5 max-[760px]:[&>span:not(.anticon):last-child]:hidden"
            data-seller="footer"
          >
            <span>© {new Date().getFullYear()} NEXUS · Seller Center</span>
            <span>
              <SafetyCertificateOutlined className="text-[13px]" aria-hidden="true" />{' '}
              {t('layout.footerTagline')}
            </span>
          </footer>
        </div>
        <LogoutConfirmDialog
          open={logoutConfirmationOpen}
          accountName={user.fullName || user.email}
          onCancel={() => setLogoutConfirmationOpen(false)}
          onConfirm={() => {
            setLogoutConfirmationOpen(false);
            clearAuthSession();
            toast.success(t('common:logoutDialog.successToast'));
            navigate('/login', { replace: true });
          }}
        />
      </div>
    </SellerWorkspaceContext.Provider>
  );
}
