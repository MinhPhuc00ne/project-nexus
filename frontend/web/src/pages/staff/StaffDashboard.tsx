import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Activity,
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
} from 'lucide-react';
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
  const [activeNavigation, setActiveNavigation] = useState('Hộp Thư Trực Tuyến');
  const [searchText, setSearchText] = useState('');
  const [reply, setReply] = useState('');
  const [toast, setToast] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const notify = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };
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
          <button className="staff-icon-button staff-notification-button" aria-label="Thông báo">
            <Bell size={18} />
          </button>
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
                      <button aria-label="Đính kèm tệp" onClick={() => notify('Chọn tệp đính kèm')}>
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
