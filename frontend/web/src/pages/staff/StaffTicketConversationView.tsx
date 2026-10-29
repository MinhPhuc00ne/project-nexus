import { type ChangeEvent, type JSX, type KeyboardEvent, useRef, useState } from 'react';
import {
  AtSign,
  BadgeCheck,
  List,
  MoreHorizontal,
  Paperclip,
  Send,
  ShieldCheck,
  Smile,
  Tag,
} from 'lucide-react';
import { uploadChatAttachments } from '../../services/chat';

export interface ChatMessage {
  id: number | string;
  author: string;
  time: string;
  body: string;
  isAgent?: boolean;
}

export type TicketStatus = 'chatting' | 'waiting' | 'resolved';

export interface SupportTicket {
  id: string;
  customer: string;
  initials: string;
  role: string;
  subject?: string;
  category: 'Auction 3D' | 'Shipping' | 'Escrow' | 'General';
  status: 'chatting' | 'waiting' | 'resolved';
  conversationStatus?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedStaffId?: string | null;
  assignedStaff?: string | null;
  waitingTimeSeconds?: number;
  time: string;
  preview: string;
  messages: ChatMessage[];
}

interface StaffTicketConversationViewProps {
  activeTicket: SupportTicket | undefined;
  reply: string;
  onReplyChange: (val: string) => void;
  onSendReply: () => void;
  notify: (msg: string) => void;
  sending?: boolean;
  onClaim: () => void;
  onResolve: () => void;
  updatingStatus: boolean;
}

export default function StaffTicketConversationView({
  activeTicket,
  reply,
  onReplyChange,
  onSendReply,
  notify,
  sending = false,
  onClaim,
  onResolve,
  updatingStatus,
}: StaffTicketConversationViewProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!sending) onSendReply();
    }
  };

  const handleAttachFiles = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await uploadChatAttachments(files);
      if (urls.length) {
        notify(`Đã đính kèm ${urls.length} ảnh.`);
        const attachmentText = urls.join('\n');
        onReplyChange(reply.trim() ? `${reply.trim()}\n${attachmentText}` : attachmentText);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Tải tệp đính kèm thất bại.');
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  return (
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
                <small>{activeTicket.subject || activeTicket.category}</small>
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
              {activeTicket.conversationStatus === 'OPEN' && (
                <button
                  type="button"
                  onClick={onClaim}
                  disabled={updatingStatus}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {updatingStatus ? 'Đang nhận…' : 'Nhận xử lý'}
                </button>
              )}
              {activeTicket.conversationStatus === 'IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={onResolve}
                  disabled={updatingStatus}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {updatingStatus ? 'Đang lưu…' : 'Hoàn tất'}
                </button>
              )}
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
                type="button"
                aria-label="Đính kèm tệp"
                disabled={uploading || sending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={15} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleAttachFiles(e)}
              />
              <button aria-label="Chèn biểu tượng cảm xúc">
                <Smile size={15} />
              </button>
              <span>
                SLA:{' '}
                <b>
                  {activeTicket.conversationStatus === 'RESOLVED'
                    ? 'Đã hoàn tất'
                    : typeof activeTicket.waitingTimeSeconds === 'number'
                      ? `${Math.floor(activeTicket.waitingTimeSeconds / 60)} phút`
                      : '< 15 phút'}
                </b>
              </span>
            </div>
            <textarea
              disabled={sending}
              value={reply}
              onChange={(event) => onReplyChange(event.target.value)}
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
                onClick={onSendReply}
                disabled={sending || !reply.trim()}
              >
                Gửi phản hồi <Send size={15} />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
