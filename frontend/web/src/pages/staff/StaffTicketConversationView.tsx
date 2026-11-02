import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { MessageCircle, Paperclip, Send, ShieldCheck, CheckCheck, X } from 'lucide-react';
import { uploadChatAttachments } from '../../services/chat';
import ChatAvatar from '../../components/chat/ChatAvatar';
import ChatMessageContent from '../../components/chat/ChatMessageContent';
export interface ChatMessage {
  avatarUrl?: string | null;
  id: number | string;
  author: string;
  time: string;
  body: string;
  isAgent?: boolean;
  attachments?: string[];
}
export type TicketStatus = 'chatting' | 'waiting' | 'resolved';
export interface SupportTicket {
  avatarUrl?: string | null;
  id: string;
  customerId?: string;
  customer: string;
  initials: string;
  role: string;
  subject?: string;
  category: 'Auction 3D' | 'Shipping' | 'Escrow' | 'General';
  status: TicketStatus;
  conversationStatus?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedStaffId?: string | null;
  assignedStaff?: string | null;
  waitingTimeSeconds?: number;
  time: string;
  preview: string;
  messages: ChatMessage[];
}
interface Props {
  activeTicket?: SupportTicket;
  reply: string;
  onReplyChange: (value: string) => void;
  onSendReply: (attachments?: string[]) => Promise<boolean>;
  notify: (message: string) => void;
  sending?: boolean;
  onClaim: () => void;
  onResolve: () => void;
  updatingStatus: boolean;
  loading?: boolean;
  typing?: boolean;
  hasOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
}
export default function StaffTicketConversationView({
  activeTicket,
  reply,
  onReplyChange,
  onSendReply,
  notify,
  sending,
  onClaim,
  onResolve,
  updatingStatus,
  loading,
  typing,
  hasOlder,
  loadingOlder,
  onLoadOlder,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const previousLast = useRef<string | number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const currentTicketId = useRef(activeTicket?.id);
  currentTicketId.current = activeTicket?.id;
  const lastId = activeTicket?.messages[activeTicket.messages.length - 1]?.id;
  useEffect(() => {
    const area = scrollArea.current;
    if (area && lastId !== previousLast.current) area.scrollTop = area.scrollHeight;
    previousLast.current = lastId;
  }, [lastId, typing]);
  const disabled = sending || uploading || updatingStatus || submitting;
  async function submit() {
    if (disabled || (!reply.trim() && !attachments.length)) return;
    setSubmitting(true);
    try {
      if (await onSendReply(attachments)) setAttachments([]);
    } finally {
      setSubmitting(false);
    }
  }
  async function attach(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 5 - attachments.length);
    if (!files.length) return;
    const ticketId = activeTicket?.id;
    setUploading(true);
    try {
      const urls = await uploadChatAttachments(files);
      if (currentTicketId.current !== ticketId) return;
      setAttachments((current) => [...new Set([...current, ...urls])].slice(0, 5));
      notify(`Đã đính kèm ${urls.length} ảnh.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể tải ảnh.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }
  if (!activeTicket)
    return (
      <div className="support-conversation">
        <div className="support-empty support-conversation-empty">
          <MessageCircle size={40} />
          <strong>Chọn một hội thoại</strong>
          <p>Tiếp nhận và phản hồi khách hàng từ danh sách bên trái.</p>
        </div>
      </div>
    );
  return (
    <div className="support-conversation">
      <div className="support-conversation-header">
        <div className="support-person">
          <ChatAvatar src={activeTicket.avatarUrl} name={activeTicket.customer} />
          <div>
            <b>{activeTicket.customer}</b>
            <small>{activeTicket.subject || 'Hỗ trợ trực tuyến'}</small>
          </div>
        </div>
        {activeTicket.status === 'waiting' && (
          <button className="support-action" disabled={updatingStatus} onClick={onClaim}>
            {updatingStatus ? 'Đang nhận…' : 'Nhận xử lý'}
          </button>
        )}
        {activeTicket.status === 'chatting' && (
          <button
            className="support-action complete"
            disabled={updatingStatus || uploading || sending}
            onClick={onResolve}
          >
            <CheckCheck size={16} />
            {updatingStatus ? 'Đang lưu…' : 'Hoàn tất'}
          </button>
        )}
        {activeTicket.status === 'resolved' && (
          <span className="support-resolved">
            <CheckCheck size={16} />
            Đã hoàn tất
          </span>
        )}
      </div>
      <div className="support-ticket-id" title={activeTicket.id}>
        MÃ TICKET: #{activeTicket.id.slice(0, 8)}
      </div>
      <div
        className="support-messages"
        ref={scrollArea}
        role="log"
        aria-label="Tin nhắn hội thoại"
        aria-busy={loading}
      >
        {hasOlder && (
          <button className="support-load-older" disabled={loadingOlder} onClick={onLoadOlder}>
            {loadingOlder ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}
          </button>
        )}
        {loading ? (
          <div className="support-empty" role="status">
            Đang tải tin nhắn…
          </div>
        ) : (
          !activeTicket.messages.length && (
            <div className="support-empty">
              <MessageCircle size={30} />
              <p>Chưa có tin nhắn.</p>
            </div>
          )
        )}
        {activeTicket.messages.map((message) => (
          <article
            key={message.id}
            className={`support-message ${message.isAgent ? 'is-agent' : ''}`}
          >
            <div>
              <ChatAvatar
                src={message.avatarUrl}
                name={message.author || (message.isAgent ? 'Bạn' : activeTicket.customer)}
                size={26}
              />
              <b>{message.author || (message.isAgent ? 'Bạn' : activeTicket.customer)}</b>
              <time>{message.time}</time>
              {message.isAgent && <ShieldCheck size={13} />}
            </div>
            <ChatMessageContent body={message.body} attachments={message.attachments} />
          </article>
        ))}
        {typing && (
          <p className="support-typing" role="status">
            Khách hàng đang nhập…
          </p>
        )}
      </div>
      <div className="support-composer">
        <div className="support-composer-tools">
          <button
            aria-label="Đính kèm ảnh"
            title="Đính kèm ảnh"
            disabled={disabled || attachments.length >= 5}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip size={18} />
          </button>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            ref={fileInput}
            onChange={(event) => void attach(event)}
          />
          <span>
            {activeTicket.status === 'waiting'
              ? 'Nhận xử lý để trả lời'
              : activeTicket.status === 'resolved'
                ? 'Hội thoại đã hoàn tất'
                : 'Enter để gửi · Shift + Enter xuống dòng'}
          </span>
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3" aria-label="Ảnh chờ gửi">
            {attachments.map((url) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt="Ảnh chờ gửi"
                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  aria-label="Bỏ ảnh đính kèm"
                  disabled={disabled}
                  onClick={() =>
                    setAttachments((current) => current.filter((item) => item !== url))
                  }
                  className="absolute -right-1 -top-1 rounded-full bg-slate-700 p-1 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          aria-label="Nội dung phản hồi"
          disabled={disabled}
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          onKeyDown={keyDown}
          rows={3}
          placeholder={
            activeTicket.status === 'resolved'
              ? 'Hội thoại đã hoàn tất'
              : 'Nhập nội dung phản hồi khách hàng…'
          }
        />
        <div className="support-composer-footer">
          <span>
            <ShieldCheck size={14} />
            Nhân viên hỗ trợ
          </span>
          <button
            disabled={disabled || (!reply.trim() && !attachments.length)}
            onClick={() => void submit()}
          >
            {uploading
              ? 'Đang tải ảnh…'
              : sending && activeTicket.status === 'chatting'
                ? 'Đang gửi…'
                : 'Gửi phản hồi'}
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
