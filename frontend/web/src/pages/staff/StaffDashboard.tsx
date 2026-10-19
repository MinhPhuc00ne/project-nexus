import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  LogOut,
  AtSign,
  BadgeCheck,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Gavel,
  Headphones,
  History,
  Inbox,
  List,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Star,
  Tag,
  Truck,
  X,
  UserPlus,
  Users,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { listStaff, inviteStaff, type StaffUser } from '../../services/admin';
import { getMe } from '../../services/users';
import { clearAuthSession } from '../../services/auth';
import Popup from '../../components/Popup';
type TicketStatus = 'chatting' | 'waiting' | 'resolved';
type TicketCategory = 'Auction 3D' | 'Shipping' | 'Escrow';
interface ChatMessage {
  id: number;
  author: string;
  time: string;
  body: string;
  isAgent?: boolean;
}
interface SupportTicket {
  id: string;
  customer: string;
  initials: string;
  role: string;
  category: TicketCategory;
  status: TicketStatus;
  time: string;
  preview: string;
  messages: ChatMessage[];
}

const navigation = [
  { label: 'Quản Lý Nhân Viên', icon: BadgeCheck },
  { label: 'Hộp Thư Trực Tuyến', icon: Inbox },
  { label: 'Khiếu Nại & Tranh Chấp', icon: ShieldCheck },
  { label: 'Hỗ Trợ Đấu Giá 3D', icon: Gavel },
  { label: 'Hướng Dẫn & FAQ Sàn', icon: BookOpen },
  { label: 'Lịch Sử & CSAT', icon: History },
  { label: 'Hiệu Suất Cá Nhân', icon: Activity },
] as const;

export type StaffSection = (typeof navigation)[number]['label'];

const sectionContent: Record<
  StaffSection,
  { title: string; description: string; topics: string[] }
> = {
  'Quản Lý Nhân Viên': {
    title: 'Quản lý nhân viên hỗ trợ',
    description: 'Quản lý nhân viên và gửi lời mời kích hoạt tài khoản hỗ trợ.',
    topics: [],
  },
  'Hộp Thư Trực Tuyến': {
    title: 'Hộp thư hỗ trợ khách hàng',
    description: 'Tiếp nhận hội thoại, phản hồi khách hàng và theo dõi hàng đợi hỗ trợ.',
    topics: [],
  },
  'Khiếu Nại & Tranh Chấp': {
    title: 'Xử lý khiếu nại và tranh chấp',
    description:
      'Tiếp nhận phản ánh về đơn hàng, kiểm tra bằng chứng và theo dõi tiến độ giải quyết.',
    topics: ['Tiếp nhận khiếu nại', 'Kiểm tra bằng chứng', 'Theo dõi kết quả xử lý'],
  },
  'Hỗ Trợ Đấu Giá 3D': {
    title: 'Hỗ trợ phiên đấu giá',
    description: 'Theo dõi yêu cầu về phòng đấu giá, thao tác trả giá và hiển thị sản phẩm 3D.',
    topics: ['Sự cố phòng đấu giá', 'Yêu cầu về lượt trả giá', 'Hiển thị sản phẩm 3D'],
  },
  'Hướng Dẫn & FAQ Sàn': {
    title: 'Hướng dẫn nghiệp vụ và câu hỏi thường gặp',
    description: 'Tra cứu quy trình tiếp nhận và xử lý yêu cầu hỗ trợ trên NEXUS.',
    topics: [
      'Tiếp nhận: xác định khách hàng, mã đơn hàng hoặc phiên đấu giá và nội dung cần hỗ trợ.',
      'Xử lý: kiểm tra thông tin, thu thập bằng chứng và chuyển bộ phận có thẩm quyền.',
      'Hoàn tất: thông báo kết quả, ghi nhận nội dung xử lý và xác nhận với khách hàng.',
    ],
  },
  'Lịch Sử & CSAT': {
    title: 'Lịch sử hỗ trợ và đánh giá khách hàng',
    description: 'Tra cứu yêu cầu đã xử lý và phản hồi về chất lượng hỗ trợ.',
    topics: ['Yêu cầu đã xử lý', 'Đánh giá hài lòng (CSAT)', 'Phản hồi của khách hàng'],
  },
  'Hiệu Suất Cá Nhân': {
    title: 'Hiệu suất hỗ trợ cá nhân',
    description:
      'Theo dõi khối lượng công việc, thời gian phản hồi và chất lượng xử lý yêu cầu của bạn.',
    topics: ['Khối lượng yêu cầu', 'Thời gian phản hồi', 'Chất lượng xử lý'],
  },
};

const staffSectionPaths: Record<StaffSection, string> = {
  'Quản Lý Nhân Viên': '/staff/team',
  'Hộp Thư Trực Tuyến': '/staff/inbox',
  'Khiếu Nại & Tranh Chấp': '/staff/disputes',
  'Hỗ Trợ Đấu Giá 3D': '/staff/auction-support',
  'Hướng Dẫn & FAQ Sàn': '/staff/faq',
  'Lịch Sử & CSAT': '/staff/history',
  'Hiệu Suất Cá Nhân': '/staff/performance',
};

function StaffDashboard({
  initialSection = 'Hộp Thư Trực Tuyến',
}: {
  initialSection?: StaffSection;
}) {
  const navigate = useNavigate();
  const [tickets] = useState<SupportTicket[] | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | TicketStatus>('all');
  const [activeNavigation, setActiveNavigation] = useState<StaffSection>(initialSection);
  const content = sectionContent[activeNavigation];
  useEffect(() => {
    setActiveNavigation(initialSection);
  }, [initialSection]);
  const [searchText, setSearchText] = useState('');
  const [reply, setReply] = useState('');
  const [toast, setToast] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Staff Management State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const staffRequestInFlight = useRef(false);
  const [staffPending, setStaffPending] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');
  const [managementAccess, setManagementAccess] = useState<'loading' | 'allowed' | 'denied'>(
    'loading',
  );

  // API cấp/xem tài khoản Staff chỉ dành cho ADMIN, SUPPORT_STAFF không được cấp thêm quyền.
  useEffect(() => {
    let active = true;
    void getMe()
      .then((profile) => {
        if (active) setManagementAccess(profile.role === 'ADMIN' ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (active) setManagementAccess('denied');
      });
    return () => {
      active = false;
    };
  }, []);

  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const fetchStaffList = async () => {
    setIsLoadingStaff(true);
    setStaffError('');
    try {
      const res = await listStaff({ limit: 50 });
      setStaffList(res.items || []);
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeNavigation === 'Quản Lý Nhân Viên' && managementAccess === 'allowed')
      void fetchStaffList();
  }, [activeNavigation, managementAccess]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (managementAccess !== 'allowed' || staffRequestInFlight.current) return;
    if (!staffEmail.trim() || !staffFullName.trim()) {
      setStaffFormError('Vui lòng điền đầy đủ email cá nhân và họ tên.');
      return;
    }
    staffRequestInFlight.current = true;
    setStaffPending(true);
    setStaffFormError('');
    try {
      // Endpoint mời gửi email kích hoạt; không truyền password để tạo tài khoản trực tiếp.
      const res = await inviteStaff({
        email: staffEmail.trim(),
        fullName: staffFullName.trim(),
        phoneNumber: staffPhone.trim() || undefined,
      });
      notify(`${res.message} Tài khoản được cấp: ${res.assignedEmail}. Chờ nhân viên kích hoạt.`);
      setShowAddStaffModal(false);
      setStaffEmail('');
      setStaffFullName('');
      setStaffPhone('');
      // Danh sách hiện tại chỉ chứa tài khoản đã kích hoạt, chưa chứa lời mời đang chờ.
    } catch (err: unknown) {
      setStaffFormError(err instanceof Error ? err.message : 'Không thể gửi lời mời nhân viên.');
    } finally {
      staffRequestInFlight.current = false;
      setStaffPending(false);
    }
  };
  const ticketList = tickets ?? [];
  const activeTicket = ticketList.find((ticket) => ticket.id === activeTicketId);
  const chattingCount = ticketList.filter((ticket) => ticket.status === 'chatting').length;
  const waitingCount = ticketList.filter((ticket) => ticket.status === 'waiting').length;
  const visibleTickets = useMemo(
    () =>
      ticketList.filter((ticket) => {
        const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter;
        const searchTarget = `${ticket.customer} ${ticket.id} ${ticket.preview}`.toLowerCase();
        return matchesFilter && searchTarget.includes(searchText.toLowerCase());
      }),
    [activeFilter, searchText, ticketList],
  );

  const sendReply = (): void => {
    const messageText = reply.trim();
    if (!messageText || !activeTicket) return;
    notify('Chức năng gửi tin nhắn chưa được kết nối API.');
  };
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendReply();
    }
  };
  if (activeNavigation === 'Quản Lý Nhân Viên' && managementAccess !== 'allowed') {
    return (
      <main className="p-8">
        <p role="status">
          {managementAccess === 'loading'
            ? 'Đang kiểm tra quyền…'
            : 'Chỉ Admin có quyền quản lý và cấp tài khoản Staff.'}
        </p>
        {managementAccess === 'denied' && (
          <button onClick={() => navigate('/staff/inbox')} className="mt-4 text-primary">
            Về hộp thư hỗ trợ
          </button>
        )}
      </main>
    );
  }

  return (
    <div className="[--staff-ink:#17233d] [--staff-line:#e7eaf3] [--staff-primary:#1f5fe3] [--staff-primary-soft:#eaf1ff] [--staff-primary-strong:#1849b7] [--staff-accent:#1f5fe3] [--staff-accent-strong:#1849b7] grid [grid-template-columns:280px_minmax(0,_1fr)] min-h-screen [background:#f8f7fc] [color:var(--staff-ink)] [font-family:Inter,_ui-sans-serif,_system-ui,_-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] text-[13px] max-[1100px]:[grid-template-columns:240px_minmax(0,_1fr)] max-[760px]:block min-h-screen bg-[#f8f7fc] text-slate-800">
      <aside
        className={`[border-right:1px_solid_var(--staff-line)] max-[760px]:fixed max-[760px]:[inset:0_auto_0_0] max-[760px]:[width:min(290px,_84vw)] max-[760px]:h-dvh max-[760px]:[transform:translateX(-105%)] max-[760px]:[transition:transform_0.2s_ease] max-[760px]:[box-shadow:14px_0_40px_rgb(25_35_55_/_12%)] max-[760px]:[&.staff-sidebar--open]:[transform:translateX(0)] sticky top-0 z-30 flex h-screen min-h-[650px] flex-col border-r border-slate-200 bg-white ${isSidebarOpen ? 'staff-sidebar--open' : ''}`}
      >
        <div className="flex items-center gap-2.5 [min-height:70px] [padding:12px_18px] [border-bottom:1px_solid_#f0f1f6]">
          <img
            src="/images/logo.png"
            alt="NEXUS"
            className="[width:148px] max-w-full [height:auto] object-contain [filter:drop-shadow(0_6px_10px_rgb(31_95_227_/_10%))]"
          />
          <div className="min-w-0">
            <div className="flex items-center whitespace-nowrap">
              <span className="inline-flex items-center [padding:3px_7px] [border-radius:999px] [color:var(--staff-primary)] [background:var(--staff-primary-soft)] [font-size:9px] font-extrabold [letter-spacing:0.08em]">
                STAFF
              </span>
            </div>
            <div className="mt-[2px] [color:#818ba0] text-[10px]">Trung tâm hỗ trợ</div>
          </div>
          <button
            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] hidden [margin-left:auto] max-[760px]:[display:inline-grid]"
            aria-label="Đóng menu"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="[padding:22px_18px_10px] [color:#9aa2b4] text-[10px] font-extrabold [letter-spacing:0.11em]">
          NGHIỆP VỤ HỖ TRỢ
        </div>
        <nav className="grid [gap:5px] [padding:0_10px]" aria-label="Điều hướng nhân viên">
          {navigation
            .filter(({ label }) => label !== 'Quản Lý Nhân Viên' || managementAccess === 'allowed')
            .map(({ label, icon: Icon }) => (
              <button
                className={`flex [min-height:42px] items-center gap-2.5 [padding:0_11px] [border:0] [border-radius:8px] [color:#665f68] [background:transparent] cursor-pointer text-left [transition:0.15s_ease] [&_>_span:nth-child(2)]:[flex:1] [&_>_span:nth-child(2)]:text-xs [&_>_span:nth-child(2)]:[font-weight:650] [&_>_span:nth-child(2)]:whitespace-nowrap hover:[background:#fff2ef] hover:[color:var(--staff-accent)] [&.is-active]:[color:white] [&.is-active]:[background:var(--staff-accent)] [&.is-active]:[box-shadow:0_7px_16px_rgb(217_52_27_/_18%)] ${activeNavigation === label ? 'is-active' : ''}`}
                key={label}
                aria-current={activeNavigation === label ? 'page' : undefined}
                onClick={() => {
                  setActiveNavigation(label);
                  navigate(staffSectionPaths[label]);
                  setIsSidebarOpen(false);
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
        </nav>
        <div className="[margin-top:auto] [padding:12px_10px_14px] [border-top:1px_solid_#f0f1f6]">
          <button
            type="button"
            onClick={() => {
              clearAuthSession();
              navigate('/login', { replace: true });
            }}
            className="flex min-h-[42px] w-full cursor-pointer items-center gap-2.5 rounded-lg px-[11px] text-left text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            title="Đăng xuất"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
          <div className="flex justify-between [padding:12px_5px_0] [color:#9a8f8d] [font-size:9px] [&_strong]:[color:#c94c35]">
            <span>NEXUS Staff Gateway</span>
          </div>
        </div>
      </aside>
      {isSidebarOpen && (
        <button
          className="hidden max-[760px]:fixed max-[760px]:[inset:0] max-[760px]:[z-index:25] max-[760px]:block max-[760px]:[border:0] max-[760px]:[background:rgb(19_27_43_/_35%)]"
          aria-label="Đóng menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="[grid-column:2] min-w-0 max-[760px]:[grid-column:auto] min-w-0">
        <header className="[min-height:64px] [gap:9px] px-4 max-[760px]:[min-height:58px] max-[760px]:px-2.5 sticky top-0 z-20 flex min-h-[70px] items-center gap-3 border-b border-slate-200 bg-white/95 px-5 backdrop-blur-sm">
          <button
            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] hidden max-[760px]:[display:inline-grid]"
            aria-label="Mở menu"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <label className="relative [flex:0_0_48px] cursor-text [&_input]:absolute [&_input]:[inset:0] [&_input]:w-full [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[opacity:0] [&_input]:cursor-text focus-within:[flex-basis:190px] focus-within:justify-start focus-within:px-2.5 focus-within:[background:white] focus-within:[box-shadow:0_0_0_1px_var(--staff-line)] focus-within:[&_input]:static focus-within:[&_input]:min-w-0 focus-within:[&_input]:[opacity:1] flex h-[38px] w-[48px] items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Search size={17} />
            <input aria-label="Tìm kiếm toàn hệ thống" placeholder="Tìm khách hàng, ticket..." />
          </label>
          <div className="max-[1100px]:[min-width:165px] max-[1100px]:[font-size:9px] max-[760px]:hidden mx-auto flex min-w-[225px] items-center justify-around rounded-xl bg-violet-50 px-2 py-1.5">
            <div>
              Đang chat <b>{tickets === null ? '' : chattingCount}</b>
            </div>
            <div>
              Chờ phản hồi <b>{tickets === null ? '' : waitingCount}</b>
            </div>
            <div>
              SLA <b className="staff-blue-text"></b>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] [&_i]:absolute [&_i]:[top:7px] [&_i]:[right:7px] [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:[border:1px_solid_white] [&_i]:rounded-full [&_i]:[background:var(--staff-accent)]"
              aria-label="Thông báo"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="w-full [max-width:none] [padding:12px_18px_22px] max-[420px]:px-3 mx-auto max-w-[1800px] px-5 pb-6 pt-4">
          <div className="staff-breadcrumb flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>Kênh Nhân Viên</span>
            <ChevronRight size={13} />
            <b className="font-semibold text-slate-600">{content.title}</b>
          </div>
          <div className="[&_h1]:[max-width:500px] [&_h1]:[line-height:1.16] [&_p]:mb-0 max-[760px]:flex-col mt-2.5 flex items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-[clamp(20px,2vw,27px)] font-black tracking-[-0.035em] text-slate-900">
                {content.title}
              </h1>
              <p className="mt-1.5 text-[11px] text-slate-500">{content.description}</p>
            </div>
            <div className="max-[760px]:w-full max-[760px]:flex-wrap max-[420px]:[&_>_*]:[flex:1_1_auto] flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 [padding:7px_9px] [border:1px_solid_#e8eaf3] [border-radius:8px] [color:#33405a] [background:white] [font-size:9px] leading-tight text-left cursor-pointer [&_>_svg]:[color:var(--staff-primary)] [&_b]:[color:var(--staff-primary)]">
                <Headphones size={16} />
                <span>Phiên làm việc</span>
              </div>
            </div>
          </div>
          {activeNavigation === 'Quản Lý Nhân Viên' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BadgeCheck className="w-6 h-6 text-indigo-600" />
                    Quản Lý Nhân Viên Hỗ Trợ (Support Staff)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Danh sách nhân sự CSKH trực bàn hỗ trợ khách hàng và điều phối khiếu nại.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Thêm Nhân Viên Mới
                  </button>
                  <button
                    type="button"
                    onClick={() => void fetchStaffList()}
                    disabled={isLoadingStaff}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                </div>
              </div>

              {staffError && (
                <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {staffError}
                </div>
              )}

              {isLoadingStaff ? (
                <div className="py-20 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 text-indigo-500 animate-spin" />
                  Đang tải danh sách nhân viên từ máy chủ...
                </div>
              ) : staffList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Chưa có nhân viên hỗ trợ nào trong hệ thống.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                        <th className="py-3 px-4">Họ và Tên</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Số điện thoại</th>
                        <th className="py-3 px-4">Vai trò</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-semibold text-slate-800">{s.fullName}</td>
                          <td className="py-3 px-4 text-slate-600">{s.email}</td>
                          <td className="py-3 px-4 text-slate-600">{s.phoneNumber || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">
                              SUPPORT_STAFF
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {new Date(s.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeNavigation !== 'Hộp Thư Trực Tuyến' ? (
            <section
              className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              aria-label={content.title}
            >
              <h2 className="text-base font-bold text-slate-800">
                {activeNavigation === 'Hướng Dẫn & FAQ Sàn'
                  ? 'Quy trình hỗ trợ'
                  : 'Phạm vi theo dõi'}
              </h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {content.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
              {activeNavigation !== 'Hướng Dẫn & FAQ Sàn' && (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center"
                >
                  <Inbox className="mx-auto mb-3 text-slate-400" size={28} />
                  <h3 className="font-semibold text-slate-700">Chưa có dữ liệu để hiển thị</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Dữ liệu {content.title.toLowerCase()} sẽ hiển thị khi được hệ thống cung cấp.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <>
              <section
                className="mt-3.5 max-[760px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] grid grid-cols-4 gap-3"
                aria-label="Chỉ số hỗ trợ"
              >
                <MetricCard
                  icon={<MessageSquareText size={18} />}
                  tone="coral"
                  label="HỘI THOẠI ĐANG XỬ LÝ"
                  value={tickets === null ? '' : String(chattingCount)}
                  suffix=""
                  footerLabel="SLA phản hồi TB"
                  footerValue=""
                />
                <MetricCard
                  icon={<Clock3 size={18} />}
                  tone="amber"
                  label="HÀNG ĐỢI CHỜ HỖ TRỢ"
                  value={tickets === null ? '' : String(waitingCount)}
                  suffix=""
                  footerLabel="Thời gian chờ TB"
                  footerValue=""
                />
                <MetricCard
                  icon={<Star size={18} />}
                  tone="blue"
                  label="TỶ LỆ HÀI LÒNG CSAT"
                  value=""
                  suffix=""
                  footerLabel="Tổng lượt đánh giá"
                  footerValue=""
                />
                <MetricCard
                  icon={<Gavel size={18} />}
                  tone="red"
                  label="TRANH CHẤP CẦN CAN THIỆP"
                  value=""
                  suffix=""
                  footerLabel="Tạm giữ cọc"
                  footerValue=""
                />
              </section>

              <section className="[grid-template-columns:minmax(255px,_0.92fr)_minmax(330px,_1.2fr)_minmax(205px,_0.76fr)] [align-items:start] mt-4 max-[1100px]:[grid-template-columns:minmax(235px,_0.85fr)_minmax(310px,_1.15fr)] max-[760px]:[grid-template-columns:minmax(0,_1fr)] grid gap-4">
                <div className="flex [min-height:390px] [max-height:calc(100vh_-_350px)] flex-col [padding:14px_12px_8px] max-[760px]:[max-height:none] max-[760px]:[min-height:340px] min-w-0 overflow-hidden [border:1px_solid_#efedf5] [border-radius:12px] [background:white] [box-shadow:0_2px_8px_rgb(29_39_64_/_3%)]">
                  <div className="flex [min-height:42px] items-center justify-between gap-2 [&_h2]:flex [&_h2]:items-center [&_h2]:[gap:7px] [&_h2]:m-0 [&_h2]:[color:#263248] [&_h2]:[font-size:16px] [&_h2]:[font-weight:850] [&_h2_svg]:[color:var(--staff-accent)]">
                    <h2>
                      <Inbox size={17} /> Hàng Đợi Hỗ Trợ
                    </h2>
                    <span className="[color:#566179] [font-size:9px] font-extrabold">
                      {tickets === null ? '' : `${tickets.length} TICKET`}
                    </span>
                  </div>
                  <div
                    className="flex [margin:8px_0] p-[3px] [border-radius:8px] [background:#f4f3fa] [&_button]:min-w-0 [&_button]:[flex:1] [&_button]:[padding:6px_3px] [&_button]:[border:0] [&_button]:[border-radius:6px] [&_button]:[color:#766f7e] [&_button]:[background:transparent] [&_button]:[font-size:9px] [&_button]:whitespace-nowrap [&_button]:cursor-pointer [&_button.is-selected]:[color:#243149] [&_button.is-selected]:[background:white] [&_button.is-selected]:[box-shadow:0_1px_3px_rgb(20_30_55_/_10%)]"
                    role="tablist"
                    aria-label="Lọc ticket"
                  >
                    <button
                      className={activeFilter === 'all' ? 'is-selected' : ''}
                      onClick={() => setActiveFilter('all')}
                    >
                      Tất cả{tickets !== null && ` (${tickets.length})`}
                    </button>
                    <button
                      className={activeFilter === 'chatting' ? 'is-selected' : ''}
                      onClick={() => setActiveFilter('chatting')}
                    >
                      Đang chat{tickets !== null && ` (${chattingCount})`}
                    </button>
                    <button
                      className={activeFilter === 'waiting' ? 'is-selected' : ''}
                      onClick={() => setActiveFilter('waiting')}
                    >
                      Chờ phản hồi{tickets !== null && ` (${waitingCount})`}
                    </button>
                  </div>
                  <label className="flex [min-height:34px] items-center [gap:7px] [padding:0_9px] [border-radius:8px] [color:#9a91a0] [background:#f4f3fa] [&_input]:w-full [&_input]:min-w-0 [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[color:#46516a] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:[font-size:9px]">
                    <Search size={15} />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Tìm theo tên khách, SĐT, mã đơn..."
                    />
                  </label>
                  <div className="[min-height:0] overflow-auto">
                    {visibleTickets.length
                      ? visibleTickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            className={`relative block w-full [padding:10px_9px] [border:0] [border-bottom:1px_solid_#f1f1f5] [border-radius:8px] [color:inherit] [background:white] cursor-pointer text-left hover:[background:#fafaff] [&.is-current]:[background:#f1f1ff] [&.is-current::before]:absolute [&.is-current::before]:top-2 [&.is-current::before]:bottom-2 [&.is-current::before]:left-0 [&.is-current::before]:w-1 [&.is-current::before]:[border-radius:0_5px_5px_0] [&.is-current::before]:[background:var(--staff-accent)] [&.is-current::before]:[content:''] ${activeTicketId === ticket.id ? 'is-current' : ''}`}
                            onClick={() => setActiveTicketId(ticket.id)}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`[display:inline-grid] [width:35px] [height:35px] [place-items:center] rounded-full [color:#7f5637] [background:#ffdab5] text-xs font-extrabold staff-avatar--${ticket.initials.toLowerCase()}`}
                              >
                                {ticket.initials}
                              </span>
                              <span className="staff-ticket-customer">
                                <b>{ticket.customer}</b>
                                <small>{ticket.id}</small>
                              </span>
                              <span
                                className={`[padding:3px_4px] rounded [color:#53617b] [background:#e8edff] [font-size:7px] [font-weight:850] [&.is-vip]:[color:#7d5730] [&.is-vip]:[background:#ffe2b8] [&.is-seller]:[color:#385690] [&.is-seller]:[background:#dbe6ff] ${ticket.role === 'VIP GOLD' ? 'is-vip' : ticket.role === 'SELLER VERIFIED' ? 'is-seller' : ''}`}
                              >
                                {ticket.role}
                              </span>
                              <small className="staff-ticket-time">{ticket.time}</small>
                            </div>
                            <p>{ticket.preview}</p>
                            <div className="staff-ticket-bottom">
                              <span
                                className={`staff-topic staff-topic--${ticket.category.toLowerCase().replace(' ', '-')}`}
                              >
                                {ticket.category === 'Auction 3D' ? (
                                  <>
                                    <Gavel size={12} /> Đấu giá 3D
                                  </>
                                ) : ticket.category === 'Shipping' ? (
                                  <>
                                    <Truck size={12} /> Vận chuyển GHN
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={12} /> Thanh toán Escrow
                                  </>
                                )}
                              </span>
                              <span
                                className={`[color:#9a8f8d] [font-size:8px] whitespace-nowrap [&.is-chatting]:[color:#3167e5] ${ticket.status === 'chatting' ? 'is-chatting' : ''}`}
                              >
                                {ticket.status === 'chatting'
                                  ? '● Đang hỗ trợ'
                                  : ticket.status === 'resolved'
                                    ? 'Đã xử lý'
                                    : 'Chờ phản hồi'}
                              </span>
                            </div>
                          </button>
                        ))
                      : null}
                  </div>
                </div>

                <div className="flex [min-height:390px] [max-height:calc(100vh_-_350px)] flex-col [padding:0_12px] max-[760px]:[max-height:none] max-[760px]:[min-height:500px] min-w-0 overflow-hidden [border:1px_solid_#efedf5] [border-radius:12px] [background:white] [box-shadow:0_2px_8px_rgb(29_39_64_/_3%)]">
                  {activeTicket ? (
                    <>
                      <div className="flex [min-height:42px] items-center justify-between gap-2 [flex:0_0_68px] [border-bottom:1px_solid_#f0eef5]">
                        <div className="flex min-w-0 items-center gap-2 [&_>_span:last-child]:flex [&_>_span:last-child]:min-w-0 [&_>_span:last-child]:items-center [&_>_span:last-child]:gap-2 [&_>_span:last-child]:grid [&_>_span:last-child]:gap-1 [&_b]:overflow-hidden [&_b]:[text-overflow:ellipsis] [&_b]:whitespace-nowrap [&_b]:text-sm [&_small]:[color:#3970d5] [&_small]:[font-size:9px] [&_small]:font-bold [&_small_i]:w-1.5 [&_small_i]:h-1.5 [&_small_i]:rounded-full [&_small_i]:[background:#19b675]">
                          <span
                            className={`[display:inline-grid] [width:35px] [height:35px] [place-items:center] rounded-full [color:#7f5637] [background:#ffdab5] text-xs font-extrabold staff-avatar--${activeTicket.initials.toLowerCase()}`}
                          >
                            {activeTicket.initials}
                          </span>
                          <span>
                            <b>{activeTicket.customer}</b>
                            <small>{activeTicket.category}</small>
                          </span>
                        </div>
                        <div className="flex [gap:5px] [&_.staff-icon-button]:[width:31px] [&_.staff-icon-button]:[height:31px] max-[420px]:[&_.staff-icon-button:last-child]:hidden">
                          <button
                            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff]"
                            aria-label="Gửi email"
                            onClick={() => notify(`Mở email của ${activeTicket.customer}`)}
                          >
                            <AtSign size={16} />
                          </button>
                          <button
                            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff]"
                            aria-label="Gắn nhãn"
                            onClick={() => notify(`Ticket ${activeTicket.id} đã gắn nhãn ưu tiên.`)}
                          >
                            <Tag size={16} />
                          </button>
                          <button
                            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff]"
                            aria-label="Thêm tùy chọn"
                            onClick={() => notify('Tùy chọn hội thoại')}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="[align-self:center] [margin:12px_0_14px] [padding:7px_10px] [border-radius:999px] [color:#897e9c] [background:#f0efff] [font-size:8px] font-extrabold text-center">
                        MÃ TICKET: {activeTicket.id}
                      </div>
                      <div className="flex [min-height:0] [flex:1] flex-col gap-3.5 overflow-auto [padding:4px_8px_12px]">
                        {activeTicket.messages.map((message) => (
                          <article
                            key={message.id}
                            className={`[align-self:flex-start] [max-width:88%] [&.is-agent]:[align-self:flex-end] [&_>_p]:m-0 [&_>_p]:[padding:10px_12px] [&_>_p]:[border:1px_solid_#eff0f5] [&_>_p]:[border-radius:4px_12px_12px_12px] [&_>_p]:[color:#5f6170] [&_>_p]:[background:white] [&_>_p]:text-[10px] [&_>_p]:[line-height:1.55] [&.is-agent_>_p]:[border-color:var(--staff-accent)] [&.is-agent_>_p]:[border-radius:12px_4px_12px_12px] [&.is-agent_>_p]:[color:white] [&.is-agent_>_p]:[background:var(--staff-accent)] max-[760px]:[max-width:95%] ${message.isAgent ? 'is-agent' : ''}`}
                          >
                            <div className="flex items-center gap-1.5 [margin-bottom:5px] [color:#555f75] [font-size:8px] [&_b]:[font-size:9px] [&_time]:[color:#a0a5b1]">
                              {!message.isAgent && (
                                <span
                                  className={`[display:inline-grid] [width:35px] [height:35px] [place-items:center] rounded-full [color:#7f5637] [background:#ffdab5] text-xs font-extrabold [width:27px] [height:27px] [font-size:9px] staff-avatar--${activeTicket.initials.toLowerCase()}`}
                                >
                                  {activeTicket.initials}
                                </span>
                              )}
                              <b>{message.author}</b>
                              <time>{message.time}</time>
                              {message.isAgent && (
                                <span className="grid w-[18px] h-[18px] [place-items:center] rounded-full [color:white] [background:var(--staff-accent)]">
                                  <ShieldCheck size={14} />
                                </span>
                              )}
                            </div>
                            <p>{message.body}</p>
                          </article>
                        ))}
                      </div>
                      <div className="[margin-top:auto] [border-top:1px_solid_#eceef4] [background:white] [&_>_textarea]:block [&_>_textarea]:[width:calc(100%_-_20px)] [&_>_textarea]:[min-height:65px] [&_>_textarea]:[resize:vertical] [&_>_textarea]:[margin:0_10px] [&_>_textarea]:[padding:9px_10px] [&_>_textarea]:[border:1px_solid_#e8eaf2] [&_>_textarea]:[border-radius:8px] [&_>_textarea]:[outline:0] [&_>_textarea]:[color:#4d576e] [&_>_textarea]:[background:#fafaff] [&_>_textarea]:[font:inherit] [&_>_textarea]:text-[10px] [&_>_textarea]:leading-normal [&_>_textarea:focus]:[border-color:#9bb5f5] [&_>_textarea:focus]:[box-shadow:0_0_0_3px_rgb(49_99_221_/_9%)]">
                        <div className="flex items-center [gap:5px] [padding:4px_10px] [&_button]:grid [&_button]:[width:25px] [&_button]:[height:25px] [&_button]:[place-items:center] [&_button]:[border:0] [&_button]:[border-radius:5px] [&_button]:[color:#7c8493] [&_button]:[background:transparent] [&_button]:cursor-pointer [&_button:hover]:[color:#315fce] [&_button:hover]:[background:#f1f4fc] [&_>_span]:[margin-left:auto] [&_>_span]:[color:#9b93a0] [&_>_span]:[font-size:8px] [&_>_span_b]:[color:#bd3b29]">
                          <button aria-label="In đậm">
                            <b>B</b>
                          </button>
                          <button aria-label="Danh sách">
                            <List size={15} />
                          </button>
                          <button
                            aria-label="Đính kèm tệp"
                            onClick={() => notify('Chọn tệp đính kèm')}
                          >
                            <Paperclip size={15} />
                          </button>
                          <button aria-label="Chèn biểu tượng cảm xúc">
                            <Smile size={15} />
                          </button>
                          <span>
                            SLA: <b></b>
                          </span>
                        </div>
                        <textarea
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={handleComposerKeyDown}
                          placeholder="Nhập nội dung phản hồi... (Enter để gửi, Shift + Enter để xuống dòng)"
                          rows={3}
                        />
                        <div className="flex items-center justify-between gap-2 [padding:8px_10px_10px] [&_>_span]:flex [&_>_span]:items-center [&_>_span]:[gap:5px] [&_>_span]:[color:#8e94a1] [&_>_span]:[font-size:8px] [&_>_span_svg]:[color:#4b74df] [&_small]:[color:#9fa4b0]">
                          <span>
                            <BadgeCheck size={14} /> Nhân viên hỗ trợ
                          </span>
                          <button
                            className="inline-flex items-center gap-2 [padding:9px_12px] [border:0] [border-radius:8px] [color:white] [background:var(--staff-accent)] text-[10px] font-extrabold cursor-pointer [&:hover:not(:disabled)]:[background:var(--staff-accent-strong)] disabled:cursor-not-allowed disabled:[opacity:0.55]"
                            onClick={sendReply}
                            disabled={!reply.trim()}
                          >
                            Gửi phản hồi <Send size={15} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <aside className="grid min-w-0 gap-3 max-[1100px]:[grid-column:1_/_-1] max-[1100px]:[grid-template-columns:repeat(3,_minmax(0,_1fr))] max-[760px]:[grid-column:auto] max-[760px]:[grid-template-columns:minmax(0,_1fr)]">
                  {activeTicket ? (
                    <>
                      <section className="[padding:11px] [border:1px_solid_#e9eaf2] [border-radius:12px] [background:white] [box-shadow:0_4px_14px_rgb(30_42_72_/_3%)] staff-customer-card">
                        <div className="flex items-center justify-between [gap:5px] mb-2.5 [color:#92909b] [font-size:8px] [font-weight:850] [letter-spacing:0.04em]">
                          HỒ SƠ KHÁCH HÀNG
                        </div>
                        <div className="flex items-center [gap:9px] [&_>_div]:grid [&_>_div]:min-w-0 [&_>_div]:gap-[3px] [&_b]:text-[10px] [&_small]:overflow-hidden [&_small]:[color:#9b8f96] [&_small]:[font-size:8px] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap">
                          <span className="[display:inline-grid] [width:35px] [height:35px] [place-items:center] rounded-full [color:#7f5637] [background:#ffdab5] text-xs font-extrabold [width:40px] [height:40px] text-[13px]">
                            {activeTicket.initials}
                          </span>
                          <div>
                            <b>{activeTicket.customer}</b>
                            <small>{activeTicket.id}</small>
                            <small>{activeTicket.role}</small>
                          </div>
                        </div>
                      </section>
                      <section className="[padding:11px] [border:1px_solid_#e9eaf2] [border-radius:12px] [background:white] [box-shadow:0_4px_14px_rgb(30_42_72_/_3%)]">
                        <div className="flex items-center justify-between [gap:5px] mb-2.5 [color:#92909b] [font-size:8px] [font-weight:850] [letter-spacing:0.04em]">
                          DỮ LIỆU LIÊN QUAN
                        </div>
                      </section>
                    </>
                  ) : (
                    <section className="[padding:11px] [border:1px_solid_#e9eaf2] [border-radius:12px] [background:white] [box-shadow:0_4px_14px_rgb(30_42_72_/_3%)]">
                      <div className="flex items-center justify-between [gap:5px] mb-2.5 [color:#92909b] [font-size:8px] [font-weight:850] [letter-spacing:0.04em]">
                        HỒ SƠ KHÁCH HÀNG
                      </div>
                    </section>
                  )}
                </aside>
              </section>
            </>
          )}

          {/* Admin mời nhân viên bằng email cá nhân; nhân viên tự đặt mật khẩu qua link kích hoạt. */}
          <Popup
            isOpen={showAddStaffModal}
            onClose={() => {
              if (!staffPending) setShowAddStaffModal(false);
            }}
            title="Mời Nhân Viên Hỗ Trợ (Support Staff)"
            size="md"
          >
            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <p className="text-sm text-slate-600">
                Lời mời được gửi tới email cá nhân. Nhân viên mở link để xác nhận thông tin và tự
                đặt mật khẩu; sau khi kích hoạt mới đăng nhập bằng tài khoản @staff.com được cấp.
              </p>

              {staffFormError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  {staffFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email cá nhân nhận lời mời <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien@gmail.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  disabled={staffPending}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên nhân viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  disabled={staffPending}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  placeholder="VD: 0987654321"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  disabled={staffPending}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  onClick={() => setShowAddStaffModal(false)}
                  disabled={staffPending}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={staffPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {staffPending ? 'Đang gửi lời mời...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </Popup>
        </main>
      </div>
      {toast && (
        <div className="fixed [right:22px] [bottom:22px] [z-index:80] flex [max-width:min(420px,_calc(100vw_-_32px))] items-center [gap:9px] [padding:12px_16px] [border:1px_solid_#d8e8df] [border-radius:9px] [color:#256447] [background:white] [box-shadow:0_12px_35px_rgb(27_42_67_/_16%)] text-xs font-bold [&_svg]:[flex:0_0_auto]">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  suffix,
  footerLabel,
  footerValue,
}: {
  icon: ReactNode;
  tone: 'coral' | 'amber' | 'blue' | 'red';
  label: string;
  value: string;
  suffix: string;
  footerLabel: string;
  footerValue: string;
}) {
  return (
    <article className="flex min-w-0 [min-height:150px] flex-col justify-between p-3.5 [border:1px_solid_#efedf5] [border-radius:12px] [background:#fff] [box-shadow:0_2px_8px_rgb(29_39_64_/_3%)] [&:last-child_.staff-kpi-footer]:[color:#a8483d] [&:last-child_.staff-kpi-footer]:[background:#fff0ee] [&:last-child_.staff-kpi-footer_b]:[color:#d9341b] max-[760px]:[min-height:138px] max-[760px]:[padding:11px]">
      <div className="flex items-center justify-between gap-2 [color:#9b8580] [font-size:9px] font-extrabold max-[420px]:[font-size:8px]">
        <span>{label}</span>
        <i
          className={`grid w-8 h-8 [flex:0_0_auto] [place-items:center] [border-radius:8px] [&.is-coral]:[color:var(--staff-primary)] [&.is-coral]:[background:#e5edff] [&.is-amber]:[color:#9e6216] [&.is-amber]:[background:#ffebd0] [&.is-blue]:[color:var(--staff-primary)] [&.is-blue]:[background:#e1eaff] [&.is-red]:[color:#d9341b] [&.is-red]:[background:#ffe1dd] is-${tone}`}
        >
          {icon}
        </i>
      </div>
      <div
        className={`flex items-center justify-between gap-2 justify-start [color:var(--staff-primary)] [&_b]:[color:#18233a] [&_b]:[font-size:30px] [&_b]:leading-none [&_span]:text-[11px] [&_span]:font-extrabold [&.is-coral_span]:[color:var(--staff-accent)] [&.is-amber_span]:[color:#9e6216] [&.is-red]:[color:#d9341b] [&.is-red_b]:[color:#d9341b] [&.is-red_span]:[color:#d9341b] is-${tone}`}
      >
        <b>{value}</b>
        <span>{suffix}</span>
      </div>
      <div className="flex items-center justify-between gap-2 [min-height:34px] [padding:0_9px] [border-radius:8px] [color:#938a98] [background:#f1f2ff] [font-size:9px] [&_b]:[color:var(--staff-primary)] [&_b]:[font-size:9px] max-[420px]:px-1.5 max-[420px]:[font-size:8px] max-[420px]:[&_b]:[font-size:8px]">
        <span>{footerLabel}</span>
        <b>{footerValue}</b>
      </div>
    </article>
  );
}

export default StaffDashboard;
