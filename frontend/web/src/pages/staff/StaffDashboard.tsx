import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
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
  Store,
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  getSellerRequests,
  approveSellerRequest,
  rejectSellerRequest,
  listStaff,
  createStaff,
  type StaffUser,
} from '../../services/admin';
import type { SellerUpgradeRequest } from '../../services/users';
import { API_BASE_URL } from '../../services/api';
import Popup from '../../components/popup/Popup';
import './StaffDashboard.css';

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
  { label: 'Duyệt Hồ Sơ Seller', icon: ShieldCheck },
  { label: 'Quản Lý Nhân Viên', icon: BadgeCheck },
  { label: 'Hộp Thư Trực Tuyến', icon: Inbox },
  { label: 'Khiếu Nại & Tranh Chấp', icon: ShieldCheck },
  { label: 'Hỗ Trợ Đấu Giá 3D', icon: Gavel },
  { label: 'Hướng Dẫn & FAQ Sàn', icon: BookOpen },
  { label: 'Lịch Sử & CSAT', icon: History },
  { label: 'Hiệu Suất Cá Nhân', icon: Activity },
];

function StaffDashboard() {
  const [tickets] = useState<SupportTicket[] | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | TicketStatus>('all');
  const [activeNavigation, setActiveNavigation] = useState('Duyệt Hồ Sơ Seller');
  const [searchText, setSearchText] = useState('');
  const [reply, setReply] = useState('');
  const [toast, setToast] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Seller Requests State
  const [sellerRequests, setSellerRequests] = useState<SellerUpgradeRequest[]>([]);
  const [sellerReqFilter, setSellerReqFilter] = useState<
    'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  >('PENDING');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionPending, setActionPending] = useState(false);

  // Staff Management State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffFullName, setStaffFullName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPending, setStaffPending] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');

  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const fetchSellerRequests = async () => {
    setIsLoadingRequests(true);
    setRequestError('');
    try {
      const res = await getSellerRequests({
        status: sellerReqFilter === 'ALL' ? undefined : sellerReqFilter,
        limit: 50,
      });
      setSellerRequests(res.items || []);
    } catch (err: unknown) {
      setRequestError(err instanceof Error ? err.message : 'Không thể tải danh sách hồ sơ.');
    } finally {
      setIsLoadingRequests(false);
    }
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
    if (activeNavigation === 'Duyệt Hồ Sơ Seller') {
      void fetchSellerRequests();
    } else if (activeNavigation === 'Quản Lý Nhân Viên') {
      void fetchStaffList();
    }
  }, [activeNavigation, sellerReqFilter]);

  const handleApprove = async (id: string, storeName: string) => {
    if (!window.confirm(`Xác nhận phê duyệt hồ sơ người bán cho gian hàng "${storeName}"?`)) {
      return;
    }
    setActionPending(true);
    try {
      const res = await approveSellerRequest(id);
      notify(res.message || 'Phê duyệt hồ sơ thành công!');
      void fetchSellerRequests();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Phê duyệt thất bại.');
    } finally {
      setActionPending(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReqId) return;
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionPending(true);
    try {
      const res = await rejectSellerRequest(rejectingReqId, rejectReason.trim());
      notify(res.message || 'Đã từ chối hồ sơ thành công.');
      setRejectingReqId(null);
      setRejectReason('');
      void fetchSellerRequests();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Từ chối hồ sơ thất bại.');
    } finally {
      setActionPending(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim() || !staffFullName.trim() || !staffPassword.trim()) {
      setStaffFormError('Vui lòng điền đầy đủ Email, Họ tên và Mật khẩu.');
      return;
    }
    setStaffPending(true);
    setStaffFormError('');
    try {
      const res = await createStaff({
        email: staffEmail.trim(),
        fullName: staffFullName.trim(),
        phoneNumber: staffPhone.trim() || undefined,
        password: staffPassword.trim(),
      });
      notify(res.message || 'Tạo tài khoản nhân viên thành công!');
      setShowAddStaffModal(false);
      setStaffEmail('');
      setStaffFullName('');
      setStaffPhone('');
      setStaffPassword('');
      void fetchStaffList();
    } catch (err: unknown) {
      setStaffFormError(err instanceof Error ? err.message : 'Tạo nhân viên thất bại.');
    } finally {
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
  return (
    <div className="staff-dashboard min-h-screen bg-[#f8f7fc] text-slate-800">
      <aside
        className={`staff-sidebar sticky top-0 z-30 flex h-screen min-h-[650px] flex-col border-r border-slate-200 bg-white ${isSidebarOpen ? 'staff-sidebar--open' : ''}`}
      >
        <div className="staff-brand">
          <img src="/images/logo.png" alt="NEXUS" className="staff-brand-logo" />
          <div className="staff-brand-copy">
            <div className="staff-brand-name">
              <span className="staff-brand-badge">STAFF</span>
            </div>
            <div className="staff-brand-version">Support Desk v2.4</div>
          </div>
          <button
            className="staff-icon-button staff-sidebar-close"
            aria-label="Đóng menu"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="staff-nav-label">NGHIỆP VỤ HỖ TRỢ</div>
        <nav className="staff-navigation" aria-label="Điều hướng nhân viên">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={`staff-nav-item ${activeNavigation === label ? 'is-active' : ''}`}
              key={label}
              onClick={() => {
                setActiveNavigation(label);
                setIsSidebarOpen(false);
                if (label !== 'Hộp Thư Trực Tuyến')
                  notify(`${label} sẽ được mở trong khu vực nghiệp vụ tương ứng.`);
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="staff-sidebar-bottom">
          <div className="staff-gateway">
            <span>NEXUS Staff Gateway</span>
          </div>
        </div>
      </aside>
      {isSidebarOpen && (
        <button
          className="staff-sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="staff-main min-w-0">
        <header className="staff-topbar sticky top-0 z-20 flex min-h-[70px] items-center gap-3 border-b border-slate-200 bg-white/95 px-5 backdrop-blur-sm">
          <button
            className="staff-icon-button staff-menu-button"
            aria-label="Mở menu"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <label className="staff-global-search flex h-[38px] w-[48px] items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Search size={17} />
            <input aria-label="Tìm kiếm toàn hệ thống" placeholder="Tìm khách hàng, ticket..." />
          </label>
          <div className="staff-top-metrics mx-auto flex min-w-[225px] items-center justify-around rounded-xl bg-violet-50 px-2 py-1.5">
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
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="Quay lại Trang Chủ"
            >
              <ArrowLeft size={14} />
              <span>Về Trang Chủ</span>
            </a>
            <button className="staff-icon-button staff-notification-button" aria-label="Thông báo">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="staff-content mx-auto max-w-[1800px] px-5 pb-6 pt-4">
          <div className="staff-breadcrumb flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>Kênh Nhân Viên</span>
            <ChevronRight size={13} />
            <b className="font-semibold text-slate-600">
              Hộp Thư Trực Tuyến &amp; Chăm Sóc Khách Hàng
            </b>
          </div>
          <div className="staff-page-heading mt-2.5 flex items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-[clamp(20px,2vw,27px)] font-black tracking-[-0.035em] text-slate-900">
                Trung Tâm Tiếp Nhận &amp; Giải Đáp Thắc Mắc Khách Hàng
              </h1>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Quản lý hội thoại, hỗ trợ khách hàng và theo dõi SLA theo thời gian thực.
              </p>
            </div>
            <div className="staff-heading-actions flex items-center gap-2">
              <div className="staff-queue-button">
                <Headphones size={16} />
                <span>Phiên làm việc</span>
              </div>
            </div>
          </div>
          {activeNavigation === 'Duyệt Hồ Sơ Seller' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    Duyệt Hồ Sơ Nâng Cấp Người Bán (Seller Upgrade Requests)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Kiểm tra thông tin gian hàng và tài liệu chứng minh danh tính để phê duyệt quyền
                    bán hàng.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void fetchSellerRequests()}
                    disabled={isLoadingRequests}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                </div>
              </div>

              {/* Tabs lọc */}
              <div className="flex items-center gap-2 mb-6">
                {(['PENDING', 'ALL', 'APPROVED', 'REJECTED'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSellerReqFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                      sellerReqFilter === status
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'ALL'
                      ? 'Tất cả'
                      : status === 'PENDING'
                        ? 'Chờ xét duyệt'
                        : status === 'APPROVED'
                          ? 'Đã duyệt'
                          : 'Đã từ chối'}
                  </button>
                ))}
              </div>

              {requestError && (
                <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Lỗi tải dữ liệu</h4>
                    <p>{requestError}</p>
                    <p className="text-xs text-red-600 mt-1">
                      (Lưu ý: Chức năng này yêu cầu đăng nhập bằng tài khoản Quản trị viên ADMIN.
                      Bạn có thể đăng nhập bằng tài khoản <strong>admin@nexus.com</strong> / mật
                      khẩu <strong>Admin@123456</strong>).
                    </p>
                  </div>
                </div>
              )}

              {isLoadingRequests ? (
                <div className="py-20 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 text-indigo-500 animate-spin" />
                  Đang tải danh sách hồ sơ từ máy chủ...
                </div>
              ) : sellerRequests.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Store className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Không có hồ sơ người bán nào ở trạng thái này.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sellerRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{req.storeName}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.status === 'PENDING'
                                ? 'CHỜ DUYỆT'
                                : req.status === 'APPROVED'
                                  ? 'ĐÃ DUYỆT'
                                  : 'TỪ CHỐI'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Người nộp:{' '}
                            <strong>{req.reviewedBy ? req.reviewedBy.fullName : req.userId}</strong>{' '}
                            • Ngày gửi: {new Date(req.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={() => handleApprove(req.id, req.storeName)}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Phê Duyệt
                            </button>
                            <button
                              type="button"
                              disabled={actionPending}
                              onClick={() => {
                                setRejectingReqId(req.id);
                                setRejectReason('');
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              Từ Chối
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-400 block">Số điện thoại liên hệ:</span>
                          <span className="font-semibold text-slate-800">{req.phone}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Email kinh doanh:</span>
                          <span className="font-semibold text-slate-800">
                            {req.businessEmail || 'Chưa cung cấp'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Số CCCD / GPKD:</span>
                          <span className="font-semibold text-slate-800">
                            {req.identityCardNumber || 'Chưa cung cấp'}
                          </span>
                        </div>
                      </div>

                      {req.storeDescription && (
                        <p className="text-xs text-slate-600 italic bg-slate-100/60 p-2.5 rounded">
                          "{req.storeDescription}"
                        </p>
                      )}

                      {req.rejectionReason && (
                        <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                          <strong>Lý do từ chối:</strong> {req.rejectionReason}
                        </div>
                      )}

                      {req.attachmentUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-slate-500">Tài liệu đính kèm:</span>
                          <a
                            href={
                              req.attachmentUrl.startsWith('http')
                                ? req.attachmentUrl
                                : `${API_BASE_URL.replace('/api/v1', '')}${req.attachmentUrl}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-semibold"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Xem tệp chứng minh
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeNavigation === 'Quản Lý Nhân Viên' ? (
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
          ) : (
            <>
              <section className="staff-kpi-grid grid grid-cols-4 gap-3" aria-label="Chỉ số hỗ trợ">
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

              <section className="staff-workspace grid gap-4">
                <div className="staff-ticket-panel staff-panel">
                  <div className="staff-panel-heading">
                    <h2>
                      <Inbox size={17} /> Hàng Đợi Hỗ Trợ
                    </h2>
                    <span className="staff-ticket-total">
                      {tickets === null ? '' : `${tickets.length} TICKET`}
                    </span>
                  </div>
                  <div className="staff-filter-tabs" role="tablist" aria-label="Lọc ticket">
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
                  <label className="staff-ticket-search">
                    <Search size={15} />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Tìm theo tên khách, SĐT, mã đơn..."
                    />
                  </label>
                  <div className="staff-ticket-list">
                    {visibleTickets.length
                      ? visibleTickets.map((ticket) => (
                          <button
                            key={ticket.id}
                            className={`staff-ticket ${activeTicketId === ticket.id ? 'is-current' : ''}`}
                            onClick={() => setActiveTicketId(ticket.id)}
                          >
                            <div className="staff-ticket-top">
                              <span
                                className={`staff-avatar staff-avatar--${ticket.initials.toLowerCase()}`}
                              >
                                {ticket.initials}
                              </span>
                              <span className="staff-ticket-customer">
                                <b>{ticket.customer}</b>
                                <small>{ticket.id}</small>
                              </span>
                              <span
                                className={`staff-role-badge ${ticket.role === 'VIP GOLD' ? 'is-vip' : ticket.role === 'SELLER VERIFIED' ? 'is-seller' : ''}`}
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
                                className={`staff-ticket-state ${ticket.status === 'chatting' ? 'is-chatting' : ''}`}
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

                <div className="staff-chat-panel staff-panel">
                  {activeTicket ? (
                    <>
                      <div className="staff-chat-heading">
                        <div className="staff-chat-person">
                          <span
                            className={`staff-avatar staff-avatar--${activeTicket.initials.toLowerCase()}`}
                          >
                            {activeTicket.initials}
                          </span>
                          <span>
                            <b>{activeTicket.customer}</b>
                            <small>{activeTicket.category}</small>
                          </span>
                        </div>
                        <div className="staff-chat-actions">
                          <button
                            className="staff-icon-button"
                            aria-label="Gửi email"
                            onClick={() => notify(`Mở email của ${activeTicket.customer}`)}
                          >
                            <AtSign size={16} />
                          </button>
                          <button
                            className="staff-icon-button"
                            aria-label="Gắn nhãn"
                            onClick={() => notify(`Ticket ${activeTicket.id} đã gắn nhãn ưu tiên.`)}
                          >
                            <Tag size={16} />
                          </button>
                          <button
                            className="staff-icon-button"
                            aria-label="Thêm tùy chọn"
                            onClick={() => notify('Tùy chọn hội thoại')}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="staff-session-banner">MÃ TICKET: {activeTicket.id}</div>
                      <div className="staff-message-list">
                        {activeTicket.messages.map((message) => (
                          <article
                            key={message.id}
                            className={`staff-message ${message.isAgent ? 'is-agent' : ''}`}
                          >
                            <div className="staff-message-meta">
                              {!message.isAgent && (
                                <span
                                  className={`staff-avatar staff-avatar--small staff-avatar--${activeTicket.initials.toLowerCase()}`}
                                >
                                  {activeTicket.initials}
                                </span>
                              )}
                              <b>{message.author}</b>
                              <time>{message.time}</time>
                              {message.isAgent && (
                                <span className="staff-message-shield">
                                  <ShieldCheck size={14} />
                                </span>
                              )}
                            </div>
                            <p>{message.body}</p>
                          </article>
                        ))}
                      </div>
                      <div className="staff-reply-area">
                        <div className="staff-composer-toolbar">
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
                        <div className="staff-composer-footer">
                          <span>
                            <BadgeCheck size={14} /> Nhân viên hỗ trợ
                          </span>
                          <button
                            className="staff-send-button"
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

                <aside className="staff-context-column">
                  {activeTicket ? (
                    <>
                      <section className="staff-context-card staff-customer-card">
                        <div className="staff-context-title">HỒ SƠ KHÁCH HÀNG</div>
                        <div className="staff-customer-profile">
                          <span className="staff-avatar staff-avatar--large">
                            {activeTicket.initials}
                          </span>
                          <div>
                            <b>{activeTicket.customer}</b>
                            <small>{activeTicket.id}</small>
                            <small>{activeTicket.role}</small>
                          </div>
                        </div>
                      </section>
                      <section className="staff-context-card">
                        <div className="staff-context-title">DỮ LIỆU LIÊN QUAN</div>
                      </section>
                    </>
                  ) : (
                    <section className="staff-context-card">
                      <div className="staff-context-title">HỒ SƠ KHÁCH HÀNG</div>
                    </section>
                  )}
                </aside>
              </section>
            </>
          )}

          {/* POPUP TỪ CHỐI DUYỆT HỒ SƠ */}
          <Popup
            isOpen={Boolean(rejectingReqId)}
            onClose={() => {
              if (!actionPending) setRejectingReqId(null);
            }}
            title="Từ Chối Hồ Sơ Nâng Cấp Người Bán"
            size="md"
          >
            <form onSubmit={handleReject} className="space-y-4">
              <p className="text-sm text-slate-600">
                Vui lòng nhập lý do từ chối hồ sơ này. Lý do sẽ được lưu vào hệ thống và hiển thị
                cho người dùng biết để họ bổ sung giấy tờ.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="VD: Giấy phép kinh doanh mờ, CCCD không trùng khớp với tên đăng ký..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  disabled={actionPending}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  onClick={() => setRejectingReqId(null)}
                  disabled={actionPending}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {actionPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </Popup>

          {/* POPUP TẠO TÀI KHOẢN NHÂN VIÊN MỚI */}
          <Popup
            isOpen={showAddStaffModal}
            onClose={() => {
              if (!staffPending) setShowAddStaffModal(false);
            }}
            title="Tạo Tài Khoản Nhân Viên Hỗ Trợ (Support Staff)"
            size="md"
          >
            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <p className="text-sm text-slate-600">
                Tài khoản nhân viên được cấp quyền <code>SUPPORT_STAFF</code> và tự động xác thực để
                truy cập hệ thống chăm sóc khách hàng.
              </p>

              {staffFormError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  {staffFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@nexus.com"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu khởi tạo <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
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
                  {staffPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </Popup>
        </main>
      </div>
      {toast && (
        <div className="staff-toast">
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
    <article className="staff-kpi-card">
      <div className="staff-kpi-label">
        <span>{label}</span>
        <i className={`staff-kpi-icon is-${tone}`}>{icon}</i>
      </div>
      <div className={`staff-kpi-value is-${tone}`}>
        <b>{value}</b>
        <span>{suffix}</span>
      </div>
      <div className="staff-kpi-footer">
        <span>{footerLabel}</span>
        <b>{footerValue}</b>
      </div>
    </article>
  );
}

export default StaffDashboard;
