import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import StaffMetricCards from './StaffMetricCards';
import StaffTicketConversationView, {
  type SupportTicket,
  type TicketStatus,
} from './StaffTicketConversationView';
import StaffTicketQueueSidebar from './StaffTicketQueueSidebar';
import StaffCustomerInfoAside from './StaffCustomerInfoAside';
import {
  claimChatConversation,
  getChatConversations,
  getChatSupportQueue,
  updateChatConversationStatus,
} from '../../services/chat';
import { useAuth } from '../../contexts/AuthContext';
import { useChatRoom } from '../../components/chat/useChatRoom';
import type { ChatConversation, SupportConversationStatus } from '../../types/chat.types';

export type TicketCategory = 'Auction 3D' | 'Shipping' | 'Escrow';
export type { SupportTicket, TicketStatus };

interface StaffTicketChatPanelProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  notify: (message: string) => void;
}

export default function StaffTicketChatPanel({
  searchText,
  onSearchChange,
  notify,
}: StaffTicketChatPanelProps): JSX.Element {
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
    const load = async (): Promise<void> => {
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
        c.contextType === 'ORDER' ? 'Shipping' : c.contextType === 'DISPUTE' ? 'Escrow' : 'General',
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
      setConversations(
        (current) =>
          current?.map((conversation) =>
            conversation.id === claimed.id ? claimed : conversation,
          ) ?? current,
      );
      notify('Support conversation claimed.');
      refresh();
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Could not claim the conversation.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function resolveActiveConversation(): Promise<void> {
    if (!activeTicket || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const resolved = await updateChatConversationStatus(activeTicket.id, 'RESOLVED');
      setConversations(
        (current) =>
          current?.map((conversation) =>
            conversation.id === resolved.id ? resolved : conversation,
          ) ?? current,
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

      <section className="mt-4 grid gap-4 [align-items:start] [grid-template-columns:minmax(255px,_0.92fr)_minmax(330px,_1.2fr)_minmax(205px,_0.76fr)] max-[1100px]:[grid-template-columns:minmax(235px,_0.85fr)_minmax(310px,_1.15fr)] max-[760px]:[grid-template-columns:minmax(0,_1fr)]">
        {/* Left Column: Tickets Queue List */}
        <StaffTicketQueueSidebar
          tickets={tickets}
          visibleTickets={visibleTickets}
          activeTicketId={activeTicketId}
          onSelectTicket={setActiveTicketId}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchText={searchText}
          onSearchChange={onSearchChange}
          chattingCount={chattingCount}
          waitingCount={waitingCount}
        />

        {/* Middle Column: Active Ticket Conversation View */}
        <StaffTicketConversationView
          activeTicket={activeTicket}
          reply={reply}
          onReplyChange={setReply}
          onSendReply={sendReply}
          sending={
            room.sending || room.loading || activeTicket?.conversationStatus !== 'IN_PROGRESS'
          }
          notify={notify}
          onClaim={() => void claimActiveConversation()}
          onResolve={() => void resolveActiveConversation()}
          updatingStatus={updatingStatus}
        />

        {/* Right Column: Customer Info & Related Data */}
        <StaffCustomerInfoAside activeTicket={activeTicket} />
      </section>
    </>
  );
}
