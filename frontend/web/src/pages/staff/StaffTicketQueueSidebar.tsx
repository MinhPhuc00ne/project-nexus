import type { JSX } from 'react';
import { Gavel, Inbox, Search, ShieldCheck, Truck } from 'lucide-react';
import type { SupportTicket, TicketStatus } from './StaffTicketConversationView';

export interface StaffTicketQueueSidebarProps {
  tickets: SupportTicket[] | null;
  visibleTickets: SupportTicket[];
  activeTicketId: string | null;
  onSelectTicket: (id: string) => void;
  activeFilter: 'all' | TicketStatus;
  onFilterChange: (filter: 'all' | TicketStatus) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  chattingCount: number;
  waitingCount: number;
}

export default function StaffTicketQueueSidebar({
  tickets,
  visibleTickets,
  activeTicketId,
  onSelectTicket,
  activeFilter,
  onFilterChange,
  searchText,
  onSearchChange,
  chattingCount,
  waitingCount,
}: StaffTicketQueueSidebarProps): JSX.Element {
  return (
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
          onClick={() => onFilterChange('all')}
        >
          Tất cả{tickets !== null && ` (${tickets.length})`}
        </button>
        <button
          className={activeFilter === 'chatting' ? 'is-selected' : ''}
          onClick={() => onFilterChange('chatting')}
        >
          Đang chat{tickets !== null && ` (${chattingCount})`}
        </button>
        <button
          className={activeFilter === 'waiting' ? 'is-selected' : ''}
          onClick={() => onFilterChange('waiting')}
        >
          Chờ phản hồi{tickets !== null && ` (${waitingCount})`}
        </button>
      </div>
      <label className="flex [min-height:34px] items-center [gap:7px] [padding:0_9px] [border-radius:8px] [color:#9a91a0] [background:#f4f3fa] [&_input]:w-full [&_input]:min-w-0 [&_input]:[border:0] [&_input]:[outline:0] [&_input]:[color:#46516a] [&_input]:[background:transparent] [&_input]:[font:inherit] [&_input]:[font-size:9px]">
        <Search size={15} />
        <input
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên khách, SĐT, mã đơn..."
        />
      </label>
      <div className="[min-height:0] overflow-auto">
        {visibleTickets.length
          ? visibleTickets.map((ticket) => (
              <button
                key={ticket.id}
                className={`relative block w-full [padding:10px_9px] [border:0] [border-bottom:1px_solid_#f1f1f5] [border-radius:8px] [color:inherit] [background:white] cursor-pointer text-left hover:[background:#fafaff] [&.is-current]:[background:#f1f1ff] [&.is-current::before]:absolute [&.is-current::before]:top-2 [&.is-current::before]:bottom-2 [&.is-current::before]:left-0 [&.is-current::before]:w-1 [&.is-current::before]:[border-radius:0_5px_5px_0] [&.is-current::before]:[background:var(--staff-accent)] [&.is-current::before]:[content:''] ${activeTicketId === ticket.id ? 'is-current' : ''}`}
                onClick={() => onSelectTicket(ticket.id)}
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
                <small className="mt-1 block truncate text-slate-400">
                  {ticket.subject || 'Hỗ trợ chung'}
                  {ticket.assignedStaff ? ` · ${ticket.assignedStaff}` : ''}
                  {ticket.status === 'waiting' && typeof ticket.waitingTimeSeconds === 'number'
                    ? ` · Chờ ${Math.floor(ticket.waitingTimeSeconds / 60)} phút`
                    : ''}
                </small>
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
                        <ShieldCheck size={12} />{' '}
                        {ticket.category === 'General' ? 'Hỗ trợ trực tuyến' : 'Thanh toán Escrow'}
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
  );
}
