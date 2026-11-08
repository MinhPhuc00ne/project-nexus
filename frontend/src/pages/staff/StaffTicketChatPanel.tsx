import './staffSupportChat.css';
import { RefreshCw } from 'lucide-react';
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

const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });

function formatConversationTime(value?: string | null, includeTimeForOlderDates = false): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const isToday = date.toDateString() === new Date().toDateString();
  if (isToday) return timeFormatter.format(date);
  return includeTimeForOlderDates
    ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`
    : dateFormatter.format(date);
}

interface StaffTicketChatPanelProps {
  searchText: string;
  onSearchChange?: (text: string) => void;
  notify: (message: string) => void;
}

export default function StaffTicketChatPanel({
  searchText,
  onSearchChange = () => {},
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
        const uniqueSupport = [...new Map(allSupport.map((c) => [c.id, c])).values()].sort(
          (a, b) =>
            new Date(b.lastMessageAt ?? b.createdAt).getTime() -
              new Date(a.lastMessageAt ?? a.createdAt).getTime() || a.id.localeCompare(b.id),
        );
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
      customerId: c.partner.id,
      avatarUrl: c.partner.avatarUrl,
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
      time: formatConversationTime(c.lastMessageAt),
      preview: c.lastMessage ?? '',
      messages:
        c.id === activeTicketId && !room.loading
          ? room.messages.map((m) => ({
              id: m.id,
              author: m.senderName ?? '',
              avatarUrl: m.senderAvatar,
              body: m.body,
              attachments: m.attachments,
              isAgent: m.isMe,
              isRead: m.isRead,
              time: formatConversationTime(m.createdAt, true),
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
        return matchesFilter && searchTarget.includes(searchText.trim().toLowerCase());
      }),
    [activeFilter, searchText, ticketList],
  );

  const sendReply = async (attachments: string[] = []): Promise<boolean> => {
    const messageText = reply.trim();
    if (
      (!messageText && !attachments.length) ||
      !activeTicket ||
      updatingStatus ||
      activeTicket.conversationStatus !== 'IN_PROGRESS'
    )
      return false;
    if (!room.loading && !room.sending) return room.send(attachments);
    return false;
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
      notify('Đã tiếp nhận hội thoại.');
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
      notify('Đã hoàn tất hội thoại.');
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
    <div className="staff-support-chat">
      {/* Top Streamlined Toolbar */}
      <div className="support-toolbar">
        <div className="flex items-center gap-2">
          <div className="support-status-chip">
            <span className={`support-status-dot ${room.connected ? '' : 'offline'}`} />
            <span>{room.connected ? 'Đã kết nối trực tuyến' : 'Đang kết nối…'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <StaffMetricCards
            chattingCount={chattingCount}
            waitingCount={waitingCount}
            hasTickets={tickets !== null}
            resolvedCount={ticketList.filter((ticket) => ticket.status === 'resolved').length}
          />

          <button
            type="button"
            onClick={refresh}
            className="support-refresh-btn"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={13} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {(listError || room.error) && (
        <p role="alert" className="mb-2 shrink-0 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
          {listError || room.error}
        </p>
      )}

      {/* 3-Column Ergonomic Workspace */}
      <section className="support-workspace">
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
          key={activeTicketId}
          loading={room.loading}
          typing={room.typing}
          hasOlder={room.hasOlder}
          loadingOlder={room.older}
          onLoadOlder={() => void room.loadOlder()}
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
    </div>
  );
}
