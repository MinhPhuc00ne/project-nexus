import { cn } from '../lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  SwapOutlined,
  BellOutlined,
  CodeSandboxOutlined,
  CheckOutlined,
  DownOutlined,
  QuestionCircleOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuOutlined,
  InboxOutlined,
  SearchOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  ShopOutlined,
  TruckOutlined,
  WalletOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useSellerSession } from '../components/seller/SellerSession';
import { clearAuthSession } from '../services/auth';
import { getMySellerRequests, toggleSellerMode } from '../services/users';
import { SellerWorkspaceContext } from '../components/seller/SellerWorkspace';
import type { SellerDraft } from '../components/seller/sellerData';

const links = [
  { to: '/seller', label: 'Trung tâm người bán', icon: ShopOutlined },
  { to: '/seller/overview', label: 'Tổng quan', icon: DashboardOutlined },
  { to: '/seller/orders', label: 'Đơn hàng & GHN', icon: TruckOutlined },
  { to: '/seller/auctions', label: 'Đấu giá 3D', icon: CodeSandboxOutlined },
  { to: '/seller/products', label: 'Kho & Sản phẩm', icon: InboxOutlined },
  { to: '/seller/finance', label: 'Tài chính & Ví Escrow', icon: WalletOutlined },
  { to: '/seller/reviews', label: 'Đánh giá & Khách hàng', icon: StarOutlined },
  { to: '/seller/disputes', label: 'Khiếu nại', icon: SafetyCertificateOutlined },
  { to: '/seller/settings', label: 'Cài đặt Shop', icon: SettingOutlined },
];
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
  const user = useSellerSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [account, setAccount] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [store, setStore] = useState({ name: '', loading: true, error: '' });
  const draftKey = `nexus:seller-drafts:${user.id}`;
  const [drafts, setDrafts] = useState(() => readDrafts(draftKey));
  const accountRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const toggleLock = useRef(false);
  useEffect(() => {
    let active = true;
    void getMySellerRequests()
      .then((result) => {
        if (active)
          setStore({
            name: result.requests.find((item) => item.status === 'APPROVED')?.storeName || '',
            loading: false,
            error: '',
          });
      })
      .catch(() => {
        if (active) setStore({ name: '', loading: false, error: 'Chưa thể tải tên gian hàng.' });
      });
    return () => {
      active = false;
    };
  }, [user.id]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
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
      setToast('Đã lưu bản nháp trên thiết bị này.');
      return true;
    } catch {
      setToast('Không thể lưu bản nháp. Vui lòng kiểm tra bộ nhớ trình duyệt.');
      return false;
    }
  };
  const deleteDraft = (id: string) => {
    const next = drafts.filter((item) => item.id !== id);
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
      setDrafts(next);
      setToast('Đã xóa bản nháp trên thiết bị.');
    } catch {
      setToast('Không thể xóa bản nháp. Vui lòng thử lại.');
    }
  };
  const switchToBuyer = async () => {
    if (toggleLock.current) return;
    toggleLock.current = true;
    setPending(true);
    setError('');
    try {
      await toggleSellerMode(false);
      navigate('/buyer');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể chuyển chế độ.');
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
        preview,
        setPreview,
        storeName: store.name,
        storeLoading: store.loading,
        storeError: store.error,
        search,
        setSearch,
        notify: setToast,
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
            className="hidden max-[760px]:block max-[760px]:fixed max-[760px]:[inset:0] max-[760px]:[border:0] max-[760px]:bg-[#1b315c45] max-[760px]:[backdrop-filter:blur(2px)] max-[760px]:z-[39]"
            data-seller="sidebar-backdrop"
            aria-label="Đóng menu"
            onClick={() => setSidebar(false)}
          />
        )}
        <aside
          id="seller-navigation"
          className={cn(
            `fixed [inset:0_auto_0_0] w-[242px] bg-white [border-right:1px_solid_#e5ebf4] z-[40] flex flex-col [&_nav]:py-0 [&_nav]:px-3 [&_nav]:overflow-y-auto max-[1250px]:w-[220px] max-[1050px]:w-[210px] max-[760px]:[transform:translateX(-100%)] max-[760px]:[transition:transform_0.2s] max-[760px]:w-[242px] max-[760px]:[&.is-open]:[transform:translateX(0)] ${sidebar ? 'is-open' : ''}`,
          )}
          data-seller="sidebar"
        >
          <Link
            to="/seller"
            className="h-20 shrink-0 flex items-center gap-[11px] py-4 px-5.5 [border-bottom:1px_solid_#e5ebf4] [&>img]:w-9 [&>img]:h-[37px] [&>img]:object-contain [&_strong]:text-[19px] [&_strong]:tracking-[-0.6px] [&_strong]:text-[#162444] [&_small]:block [&_small]:text-[9px] [&_small]:tracking-[1.45px] [&_small]:text-[#7186ab] max-[1250px]:p-4"
            data-seller="brand"
          >
            <img src="/images/NEXUS.png" alt="NEXUS" />
            <span>
              <strong>NEXUS</strong>
              <small>SELLER CENTER</small>
            </span>
            <span
              className="text-[9px] text-[#8390a7] bg-[#f1f5fa] rounded-[4px] py-0.5 px-1.5 ml-auto"
              data-seller="version"
            >
              v2.4
            </span>
          </Link>
          <div
            className="text-[10px] tracking-[1.1px] text-[#94a2b9] [margin:27px_23px_12px]"
            data-seller="sidebar-label"
          >
            QUẢN TRỊ CỬA HÀNG
          </div>
          <nav aria-label="Điều hướng người bán">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/seller'}
                className={({ isActive }) =>
                  cn(
                    `relative flex items-center gap-3 min-h-[45px] my-1 mx-0 rounded-[8px] py-0 px-3 text-[#5e6d87] text-[12px] font-medium [&>.anticon]:text-[#8d9ebc]! [&>.anticon]:shrink-0 [&:hover]:bg-[#f6f8fc] [&:hover]:text-[#315eea] [&.is-active]:text-[#315eea] [&.is-active]:bg-[#edf3ff] [&.is-active]:font-[650] [&.is-active:before]:[content:''] [&.is-active:before]:absolute [&.is-active:before]:left-[-12px] [&.is-active:before]:top-[11px] [&.is-active:before]:bottom-[11px] [&.is-active:before]:w-[3px] [&.is-active:before]:bg-[#315eea] [&.is-active:before]:rounded-[0_3px_3px_0] [&.is-active>.anticon]:text-[#315eea]! ${isActive || (to === '/seller/products' && location.pathname === '/seller/inventory') ? 'is-active' : ''}`,
                  )
                }
                data-seller="nav-link"
              >
                <Icon className="text-[19px]" aria-hidden="true" />
                <span>{label}</span>
                {to === '/seller/auctions' && (
                  <span
                    className="ml-auto text-[9px] bg-[#e8f5f2] text-[#159876] py-[1px] px-[5px] rounded-[4px]"
                    data-seller="nav-tag"
                  >
                    3D
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto [padding:30px_16px_14px]" data-seller="sidebar-bottom">
            <div
              className="[border:1px_solid_#e5ebf4] rounded-[11px] p-[13px] [background:linear-gradient(135deg,_#f7faff,_#f4f8ff)] [&>div]:flex [&>div]:items-center [&>div]:gap-1.5 [&>div]:text-[10px] [&>div]:font-[650] [&>div>.anticon]:ml-auto [&>div>.anticon]:text-[#315eea]! [&_p]:text-[10px] [&_p]:text-[#8c9ab2] [&_p]:my-2 [&_p]:mx-0 [&_p]:leading-[1.7] [&>a]:flex [&>a]:items-center [&>a]:justify-between [&>a]:text-[10px] [&>a]:text-[#315eea]"
              data-seller="studio-card"
            >
              <div>
                <span
                  className="w-1.5 h-1.5 inline-block rounded-full bg-[#14b58a] shrink-0"
                  data-seller="dot"
                />{' '}
                NEXUS Seller Studio{' '}
                <CodeSandboxOutlined className="text-[15px]" aria-hidden="true" />
              </div>
              <p>Một không gian. Toàn bộ hoạt động kinh doanh của bạn.</p>
              <Link to="/seller/auctions">
                Khám phá đấu giá 3D <DownOutlined className="text-[13px]" aria-hidden="true" />
              </Link>
            </div>
            <button
              className="flex items-center gap-2 text-[#7d8ba3] w-full [padding:17px_6px_0] bg-transparent [border:0] text-[11px]! [&>.anticon:last-child]:ml-auto"
              data-seller="support-link"
              onClick={() => navigate('/seller/disputes')}
            >
              <QuestionCircleOutlined className="text-[17px]" aria-hidden="true" />
              Trung tâm hỗ trợ
              <SwapOutlined className="text-[14px]" aria-hidden="true" />
            </button>
          </div>
        </aside>
        <div
          className="ml-[242px] min-w-0 max-[1250px]:ml-[220px] max-[1050px]:ml-[210px] max-[760px]:ml-0"
          data-seller="workspace"
        >
          <header
            className="h-20 [border-bottom:1px_solid_#e5ebf4] [background:rgba(255,_255,_255,_0.97)] sticky top-0 z-[30] flex items-center justify-between gap-5 py-0 px-8 max-[1250px]:py-0 max-[1250px]:px-[23px] max-[760px]:h-16.5 max-[760px]:py-0 max-[760px]:px-4.5 max-[760px]:gap-[13px] max-[540px]:py-0 max-[540px]:px-3 max-[540px]:gap-[7px] max-[540px]:[&_[data-seller~=icon-button]]:p-[5px]"
            data-seller="topbar"
          >
            <button
              className="[border:0] bg-transparent p-[7px] text-[#7f8ca4] [place-items:center] rounded-[7px] [&:hover]:bg-[#edf3ff] [&:hover]:text-[#315eea] hidden max-[760px]:grid"
              data-seller="icon-button mobile-menu"
              aria-label="Mở menu người bán"
              aria-expanded={sidebar}
              aria-controls="seller-navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <MenuOutlined className="text-[21px]" aria-hidden="true" />
            </button>
            <form
              className="flex items-center gap-2.5 max-w-[360px] w-full text-[#9aaac3] [&_input]:w-full [&_input]:bg-transparent [&_input]:[border:0] [&_input]:[outline:none] [&_input]:text-[11px] [&_input::placeholder]:text-[#a0aec3] [&_kbd]:[border:1px_solid_#e5ebf4] [&_kbd]:rounded-[4px] [&_kbd]:py-0 [&_kbd]:px-1 [&_kbd]:text-[11px] [&_kbd]:text-[#a6b2c5] max-[760px]:max-w-[none] max-[760px]:[&_input]:text-[10px] max-[760px]:[&_kbd]:hidden max-[540px]:gap-1.5 max-[540px]:[&>.anticon]:w-[15px] max-[540px]:[&>.anticon]:shrink-0"
              data-seller="global-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate('/seller/products');
              }}
            >
              <SearchOutlined className="text-[17px]" aria-hidden="true" />
              <input
                aria-label="Tìm trong gian hàng"
                placeholder="Tìm sản phẩm trong gian hàng..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <div
              className="flex items-center gap-[19px] shrink-0 max-[1250px]:gap-3 max-[760px]:gap-[9px] max-[540px]:gap-[1px]"
              data-seller="topbar-right"
            >
              <span
                className={cn(
                  `flex items-center gap-[7px] whitespace-nowrap text-[10px] text-[#41967d] [border:1px_solid_#d4efe3] bg-[#f0fbf6] rounded-[20px] py-[5px] px-3 [&.is-paused]:bg-[#f9fafc] [&.is-paused]:[border-color:#e5ebf4] [&.is-paused]:text-[#8e98a8] [&.is-paused_[data-seller~=dot]]:bg-[#a2adbe] max-[1050px]:hidden ${!user.isSellerActive ? 'is-paused' : ''}`,
                )}
                data-seller="shop-status"
              >
                <span
                  className="w-1.5 h-1.5 inline-block rounded-full bg-[#14b58a] shrink-0"
                  data-seller="dot"
                />
                {user.isSellerActive ? 'Gian hàng hoạt động' : 'Chế độ người mua'}
              </span>
              <div className="relative" data-seller="popover-anchor" ref={noticeRef}>
                <button
                  className="[border:0] bg-transparent p-[7px] text-[#7f8ca4] grid [place-items:center] rounded-[7px] [&:hover]:bg-[#edf3ff] [&:hover]:text-[#315eea]"
                  data-seller="icon-button"
                  aria-label="Thông báo người bán"
                  aria-expanded={notifications}
                  onClick={() => {
                    setNotifications(!notifications);
                    setAccount(false);
                  }}
                >
                  <BellOutlined className="text-[19px]" aria-hidden="true" />
                </button>
                {notifications && (
                  <div
                    className="absolute right-0 top-[calc(100%_+_18px)] w-[270px] p-4.5 [border:1px_solid_#e5ebf4] bg-white rounded-[12px] [box-shadow:0_12px_35px_#19356317] z-[60] [&_p]:text-[11px] [&_p]:text-[#8d9ab0] [&_p]:[margin:7px_0_15px] [&_p]:[overflow-wrap:anywhere] max-[760px]:right-0 max-[540px]:w-[255px] max-[540px]:max-w-[calc(100vw_-_28px)]"
                    data-seller="popover"
                  >
                    <strong>Thông báo gian hàng</strong>
                    <p>Thông báo sẽ hiển thị khi dịch vụ thông báo được kết nối.</p>
                  </div>
                )}
              </div>
              <div className="relative" data-seller="popover-anchor" ref={accountRef}>
                <button
                  className="[border:0] [border-left:1px_solid_#e5ebf4] bg-transparent pl-[19px] flex items-center gap-2.5 text-left text-[#182541] max-[760px]:[border:0] max-[760px]:pl-0 max-[760px]:gap-[5px] max-[760px]:[&>.anticon]:hidden"
                  data-seller="account-button"
                  aria-expanded={account}
                  onClick={() => {
                    setAccount(!account);
                    setNotifications(false);
                  }}
                >
                  <span
                    className="grid [place-items:center] w-8.5 h-8.5 shrink-0 rounded-full [border:1px_solid_#dce6fd] bg-[#eef3ff] text-[#315eea] text-[11px] font-[650] overflow-hidden [&_img]:w-full [&_img]:h-full [&_img]:object-cover max-[540px]:w-[31px] max-[540px]:h-[31px]"
                    data-seller="avatar"
                  >
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
                  </span>
                  <span
                    className="max-w-[165px] [&_strong]:text-[11px] [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:text-[9px] [&_small]:text-[#8c9bb3] max-[1250px]:max-w-[120px] max-[760px]:hidden"
                    data-seller="account-copy"
                  >
                    <strong>{user.fullName}</strong>
                    <small>Người bán · {user.id.slice(0, 8)}</small>
                  </span>
                  <DownOutlined className="text-[14px]" aria-hidden="true" />
                </button>
                {account && (
                  <div
                    className="absolute right-0 top-[calc(100%_+_18px)] w-[270px] p-4.5 [border:1px_solid_#e5ebf4] bg-white rounded-[12px] [box-shadow:0_12px_35px_#19356317] z-[60] [&_p]:text-[11px] [&_p]:text-[#8d9ab0] [&_p]:[margin:7px_0_15px] [&_p]:[overflow-wrap:anywhere] max-[760px]:right-0 max-[540px]:w-[255px] max-[540px]:max-w-[calc(100vw_-_28px)] [&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:gap-2.5 [&_button]:bg-transparent [&_button]:[border:0] [&_button]:text-left [&_button]:p-2.5 [&_button]:rounded-[7px] [&_button]:text-[12px] [&_button:hover]:bg-[#f3f6fc] [&_[data-seller~=logout]]:text-[#d94b61] [&_[data-seller~=logout]]:[border-top:1px_solid_#e5ebf4] [&_[data-seller~=logout]]:rounded-[0px] [&_[data-seller~=logout]]:mt-[5px]"
                    data-seller="popover account-menu"
                  >
                    <strong>{user.fullName}</strong>
                    <p>{user.email}</p>
                    <button onClick={() => navigate('/seller/settings')}>
                      <SettingOutlined className="text-[16px]" aria-hidden="true" />
                      Cài đặt tài khoản
                    </button>
                    <button disabled={pending} onClick={() => void switchToBuyer()}>
                      <SwapOutlined className="text-[16px]" aria-hidden="true" />
                      {pending ? 'Đang chuyển…' : 'Chuyển sang người mua'}
                    </button>
                    <button
                      className=""
                      data-seller="logout"
                      onClick={() => {
                        clearAuthSession();
                        navigate('/login', { replace: true });
                      }}
                    >
                      <LogoutOutlined className="text-[16px]" aria-hidden="true" />
                      Đăng xuất
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
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 py-[13px] px-[17px] [border:1px_solid_#f6d9df] bg-[#fff3f5] rounded-[9px] text-[#bb5265] mb-4 text-[12px] [&_button]:bg-transparent [&_button]:[border:0] [&_button]:text-inherit"
                data-seller="error"
              >
                {error}
                <button aria-label="Đóng lỗi" onClick={() => setError('')}>
                  <CloseOutlined className="text-[16px]" aria-hidden="true" />
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
              <SafetyCertificateOutlined className="text-[13px]" aria-hidden="true" /> Kinh doanh an
              tâm, kết nối bền vững
            </span>
          </footer>
        </div>
        {toast && (
          <div
            className="fixed bottom-[25px] right-[25px] flex items-center gap-2.5 bg-[#213d79] text-[#fff] py-[15px] px-4.5 rounded-[11px] max-w-[min(490px,_calc(100vw_-_32px))] [box-shadow:0_6px_30px_#132d5d25] z-[1100] text-[12px] [&>.anticon]:shrink-0 [&>.anticon]:text-[#90d7be]! [&>button]:ml-[9px] [&>button]:bg-transparent [&>button]:[border:0] [&>button]:text-[#c9d8f5] max-[540px]:right-4 max-[540px]:bottom-4 max-[540px]:text-[11px]"
            data-seller="toast"
            role="status"
          >
            <CheckOutlined className="text-[18px]" aria-hidden="true" />
            <span>{toast}</span>
            <button aria-label="Đóng thông báo" onClick={() => setToast('')}>
              <CloseOutlined className="text-[16px]" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </SellerWorkspaceContext.Provider>
  );
}
