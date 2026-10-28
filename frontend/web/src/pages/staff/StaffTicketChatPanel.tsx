import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gavel, Inbox, Search, ShieldCheck, Truck } from 'lucide-react';
import StaffMetricCards from './StaffMetricCards';
import StaffTicketConversationView, { type SupportTicket } from './StaffTicketConversationView';
import {
  claimChatConversation,
  getChatConversations,
  getChatSupportQueue,
  updateChatConversationStatus,
} from '../../services/chat';
import { useAuth } from '../../contexts/AuthContext';
import { useChatRoom } from '../../components/chat/useChatRoom';
import type { ChatConversation, SupportConversationStatus } from '../../types/chat.types';

export type TicketStatus = 'chatting' | 'waiting' | 'resolved';
export type TicketCategory = 'Auction 3D' | 'Shipping' | 'Escrow';
export type { SupportTicket };

interface StaffTicketChatPanelProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  notify: (message: string) => void;
}

export default function StaffTicketChatPanel({
  searchText,
  onSearchChange,
  notify,
}: StaffTicketChatPanelProps) {
  const { storedUser } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [revision, setRevision] = useState(0);
  const [listError, setListError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | TicketStatus>('all');
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const room = useChatRoom({
    activeId: activeTicketId ?? undefined,
    userId: storedUser?.id ?? '',
    isOpen: Boolean(storedUser),
    onRevisionChange: refresh,
  });
  const reply = room.draft;
  const setReply = room.setDraft;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const assigned: ChatConversation[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const result = await getChatConversations({ page, limit: 50 });
          assigned.push(...result.items);
          totalPages = result.pagination.totalPages;
          page++;
        } while (page <= totalPages && !cancelled);
        const firstQueuePage = await getChatSupportQueue({ page: 1, limit: 50 });
        const queued = [...firstQueuePage.items];
        for (let queuePage = 2; queuePage <= firstQueuePage.pagination.totalPages; queuePage++) {
          if (cancelled) return;
          const nextQueuePage = await getChatSupportQueue({ page: queuePage, limit: 50 });
          queued.push(...nextQueuePage.items);
        }
        if (cancelled) return;
        const assignedSupport = assigned.filter(
          (c) =>
            c.type === 'STAFF_BUYER' || c.type === 'STAFF_SELLER' || c.type === 'SUPPORT_TICKET',
        );
        const allSupport = [...queued, ...assignedSupport];
        const uniqueSupport = [...new Map(allSupport.map((c) => [c.id, c])).values()];
        setConversations(uniqueSupport);
        setActiveTicketId((current) => current ?? uniqueSupport[0]?.id ?? null);
        setListError('');
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof Error ? error.message : 'Could not load support conversations.',
          );
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [revision]);

  const tickets: SupportTicket[] | null =
    conversations?.map((c) => ({
      id: c.id,
      customer: c.partner.fullName,
      initials: c.partner.fullName.slice(0, 2).toUpperCase(),
      role: c.partner.role,
      subject: c.title ?? undefined,
      category:
        c.contextType === 'ORDER'
          ? 'Shipping'
          : c.contextType === 'DISPUTE'
            ? 'Escrow'
            : 'General',
      conversationStatus: c.status as SupportConversationStatus,
      assignedStaffId: c.assignedStaffId,
      assignedStaff: c.assignedStaff?.fullName ?? null,
      waitingTimeSeconds: c.waitingTimeSeconds,
      status:
        c.status === 'OPEN'
          ? 'waiting'
          : c.status === 'RESOLVED' || c.status === 'CLOSED'
            ? 'resolved'
            : 'chatting',
      time: c.lastMessageAt
        ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
      preview: c.lastMessage ?? '',
      messages:
        c.id === activeTicketId && !room.loading
          ? room.messages.map((m) => ({
              id: m.id,
              author: m.senderName ?? '',
              body: m.body,
              isAgent: m.isMe,
              time: new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }))
          : [],
    })) ?? null;

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
    if (!room.loading && !room.sending) void room.send();
  };

  async function claimActiveConversation(): Promise<void> {
    if (!activeTicket || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const claimed = await claimChatConversation(activeTicket.id);
      setConversations((current) =>
        current?.map((conversation) => (conversation.id === claimed.id ? claimed : conversation)) ??
        current,
      );
      notify('Support conversation claimed.');
      refresh();
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : 'Could not claim the conversation.',
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function resolveActiveConversation(): Promise<void> {
    if (!activeTicket || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const resolved = await updateChatConversationStatus(activeTicket.id, 'RESOLVED');
      setConversations((current) =>
        current?.map((conversation) => (conversation.id === resolved.id ? resolved : conversation)) ??
        current,
      );
      notify('Conversation marked as resolved.');
      refresh();
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : 'Could not update the conversation status.',
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <>
      <div className="my-3 flex flex-wrap gap-2">
        <button type="button" onClick={refresh} className="rounded-lg border px-3 text-sm">
          Refresh
        </button>
      </div>
      {(listError || room.error) && (
        <p role="alert" className="my-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {listError || room.error}
        </p>
      )}
      {room.loading && <p role="status">Đang tải tin nhắn…</p>}
      {room.typing && <p className="text-sm text-slate-500">Người nhận đang nhập…</p>}
      {room.hasOlder && (
        <button
          disabled={room.older}
          onClick={() => void room.loadOlder()}
          className="text-sm text-blue-600"
        >
          {room.older ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}
        </button>
      )}
      <StaffMetricCards
        chattingCount={chattingCount}
        waitingCount={waitingCount}
        hasTickets={tickets !== null}
      />

      <section className="[grid-template-columns:minmax(255px,_0.92fr)_minmax(330px,_1.2fr)_minmax(205px,_0.76fr)] [align-items:start] mt-4 max-[1100px]:[grid-template-columns:minmax(235px,_0.85fr)_minmax(310px,_1.15fr)] max-[760px]:[grid-template-columns:minmax(0,_1fr)] grid gap-4">
        {/* Left Column: Tickets Queue List */}
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
                            {ticket.category === 'General'
                              ? 'Hỗ trợ trực tuyến'
                              : 'Thanh toán Escrow'}
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

        {/* Middle Column: Active Ticket Conversation View */}
        <StaffTicketConversationView
          activeTicket={activeTicket}
          reply={reply}
          onReplyChange={setReply}
          onSendReply={sendReply}
          sending={room.sending || room.loading || activeTicket?.conversationStatus !== 'IN_PROGRESS'}
          notify={notify}
          onClaim={() => void claimActiveConversation()}
          onResolve={() => void resolveActiveConversation()}
          updatingStatus={updatingStatus}
        />

        {/* Right Column: Customer Info & Related Data */}
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
  );
}
