import type { JSX } from 'react';
import ChatAvatar from '../../components/chat/ChatAvatar';
import { Gavel, Inbox, Search, ShieldCheck, Truck, X } from 'lucide-react';
import type { SupportTicket, TicketStatus } from './StaffTicketConversationView';

function formatQueueRole(role: string): string {
  if (role === 'SELLER') return 'Người bán';
  if (role === 'BUYER') return 'Người mua';
  if (role === 'SELLER VERIFIED') return 'Người bán xác minh';
  if (role === 'VIP GOLD') return 'VIP';
  return role;
}

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
  const resolvedCount = tickets?.filter((t) => t.status === 'resolved').length ?? 0;

  return (
    <div className="support-queue-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Inbox size={15} />
          </div>
          <h2 className="m-0 text-[13px] font-bold text-slate-800">Hàng Đợi Hỗ Trợ</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {tickets === null ? '–' : `${tickets.length} ticket`}
        </span>
      </div>

      {/* Filter Segmented Control */}
      <div className="px-3 pt-2 pb-1.5">
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100/90 p-1"
          role="group"
          aria-label="Lọc ticket"
        >
          <button
            type="button"
            className={`flex-1 rounded-md py-1 px-1 text-center text-[10.5px] font-medium transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => onFilterChange('all')}
          >
            Tất cả{tickets !== null && ` (${tickets.length})`}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1 px-1 text-center text-[10.5px] font-medium transition-all cursor-pointer ${
              activeFilter === 'chatting'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => onFilterChange('chatting')}
          >
            Đang chat{tickets !== null && ` (${chattingCount})`}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1 px-1 text-center text-[10.5px] font-medium transition-all cursor-pointer ${
              activeFilter === 'waiting'
                ? 'bg-white text-amber-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => onFilterChange('waiting')}
          >
            Chờ{tickets !== null && ` (${waitingCount})`}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1 px-1 text-center text-[10.5px] font-medium transition-all cursor-pointer ${
              activeFilter === 'resolved'
                ? 'bg-white text-emerald-600 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => onFilterChange('resolved')}
          >
            Xong{tickets !== null && ` (${resolvedCount})`}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2 pt-0.5">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-slate-400" />
          <input
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Tìm hội thoại"
            placeholder="Tìm tên khách, mã ticket..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-7 text-[11px] text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Ticket List */}
      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-1.5">
        {visibleTickets.length ? (
          visibleTickets.map((ticket) => {
            const isSelected = activeTicketId === ticket.id;
            return (
              <button
                key={ticket.id}
                type="button"
                aria-pressed={isSelected}
                className={`support-queue-item group relative block w-full rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'is-selected border-blue-200 bg-blue-50/70 shadow-xs'
                    : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/80'
                } border`}
                onClick={() => onSelectTicket(ticket.id)}
              >
                {/* Active Indicator Bar */}
                {isSelected && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-blue-600" />
                )}

                {/* Top Row: Avatar + Name + Role + Time */}
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <ChatAvatar src={ticket.avatarUrl} name={ticket.customer} size={34} />
                    {ticket.status === 'chatting' && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <b className="truncate text-[12px] font-semibold text-slate-900">
                        {ticket.customer}
                      </b>
                      <small className="shrink-0 text-[10px] font-medium text-slate-400">
                        {ticket.time}
                      </small>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[9.5px] text-slate-400" title={ticket.id}>
                        #{ticket.id.slice(0, 8)}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[8.5px] font-bold ${
                          ticket.role === 'VIP GOLD'
                            ? 'bg-amber-100 text-amber-800'
                            : ticket.role === 'SELLER VERIFIED' || ticket.role === 'SELLER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {formatQueueRole(ticket.role)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Preview */}
                <p className="mt-1.5 text-[11px] text-slate-600 line-clamp-1 font-normal">
                  {ticket.preview || 'Chưa có tin nhắn...'}
                </p>

                {/* Bottom Row: Category + Status */}
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium">
                    {ticket.category === 'Auction 3D' ? (
                      <>
                        <Gavel size={11} className="text-purple-600" /> Đấu giá 3D
                      </>
                    ) : ticket.category === 'Shipping' ? (
                      <>
                        <Truck size={11} className="text-sky-600" /> Vận chuyển GHN
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={11} className="text-blue-600" />{' '}
                        {ticket.category === 'General' ? 'Hỗ trợ' : 'Escrow'}
                      </>
                    )}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[9.5px] font-semibold ${
                      ticket.status === 'chatting'
                        ? 'text-blue-600'
                        : ticket.status === 'resolved'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {ticket.status === 'chatting'
                      ? '● Đang hỗ trợ'
                      : ticket.status === 'resolved'
                        ? '✓ Đã hoàn tất'
                        : '⏱ Chờ tiếp nhận'}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={20} />
            </div>
            <p className="text-[12px] font-semibold text-slate-700">
              {tickets === null ? 'Đang tải hội thoại...' : 'Không có hội thoại phù hợp'}
            </p>
            <span className="text-[10px] text-slate-400">
              {tickets === null ? 'Vui lòng chờ trong giây lát' : 'Thử đổi bộ lọc hoặc từ khóa'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
