import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Paperclip,
  Send,
  ShieldCheck,
  Check,
  CheckCheck,
  X,
  Copy,
  Sparkles,
} from 'lucide-react';
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
  isRead?: boolean;
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
  const { t } = useTranslation('staff');
  const quickCannedTemplates = t('inbox.conversation.canned', {
    returnObjects: true,
  }) as Array<{ label: string; text: string }>;
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const previousLast = useRef<string | number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
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
      notify(t('inbox.conversation.attachedToast', { count: urls.length }));
    } catch (error) {
      notify(error instanceof Error ? error.message : t('inbox.conversation.uploadErr'));
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

  function handleCopyTicketId() {
    if (!activeTicket) return;
    void navigator.clipboard.writeText(activeTicket.id);
    setCopiedId(true);
    notify(t('inbox.conversation.copiedToast'));
    setTimeout(() => setCopiedId(false), 2000);
  }

  function insertQuickReply(text: string) {
    onReplyChange(reply ? `${reply} ${text}` : text);
  }

  if (!activeTicket) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
          <MessageCircle size={28} />
        </div>
        <strong className="text-base font-bold text-slate-800">
          {t('inbox.conversation.emptyTitle')}
        </strong>
        <p className="mt-1 max-w-xs text-xs text-slate-500">{t('inbox.conversation.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div
      className="support-conversation-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
      data-chat-conversation-id={activeTicket.id}
    >
      {/* Header */}
      <div className="support-conversation-header flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5">
        {/* Left: Customer Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <ChatAvatar src={activeTicket.avatarUrl} name={activeTicket.customer} size={36} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <b className="truncate text-[13px] font-bold text-slate-900">
                {activeTicket.customer}
              </b>
              <button
                type="button"
                onClick={handleCopyTicketId}
                title={
                  copiedId ? t('inbox.conversation.copiedAria') : t('inbox.conversation.copyAria')
                }
                aria-label={
                  copiedId ? t('inbox.conversation.copiedAria') : t('inbox.conversation.copyAria')
                }
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {copiedId ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                <span>#{activeTicket.id.slice(0, 8)}</span>
              </button>
            </div>
            <small className="block truncate text-[11px] text-slate-500">
              {activeTicket.subject || t('inbox.conversation.onlineSupport')}
            </small>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTicket.status === 'waiting' && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              disabled={updatingStatus}
              onClick={onClaim}
            >
              {updatingStatus ? t('inbox.conversation.claiming') : t('inbox.conversation.claimBtn')}
            </button>
          )}

          {activeTicket.status === 'chatting' && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              disabled={updatingStatus || uploading || sending}
              onClick={onResolve}
            >
              <CheckCheck size={14} />
              {updatingStatus ? t('inbox.conversation.saving') : t('inbox.conversation.resolveBtn')}
            </button>
          )}

          {activeTicket.status === 'resolved' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <CheckCheck size={13} />
              {t('inbox.conversation.resolvedBadge')}
            </span>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        className="support-message-stream custom-scrollbar flex-1 min-h-0 overflow-y-auto bg-slate-50/60 p-4 space-y-1.5"
        ref={scrollArea}
        role="log"
        aria-label={t('inbox.conversation.messagesAria')}
        aria-busy={loading}
      >
        {hasOlder && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-blue-600 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              disabled={loadingOlder}
              onClick={onLoadOlder}
            >
              {loadingOlder
                ? t('inbox.conversation.loadingOlder')
                : t('inbox.conversation.loadOlder')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-xs text-slate-400" role="status">
            {t('inbox.conversation.loadingMessages')}
          </div>
        ) : (
          !activeTicket.messages.length && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <MessageCircle size={28} className="text-slate-300 mb-2" />
              <p className="text-xs">{t('inbox.conversation.noMessages')}</p>
            </div>
          )
        )}

        {/* Message Grouping: Eliminate redundant sender labels on consecutive messages */}
        {activeTicket.messages.map((message, index) => {
          const isAgent = message.isAgent;
          const prevMessage = index > 0 ? activeTicket.messages[index - 1] : null;
          const nextMessage =
            index < activeTicket.messages.length - 1 ? activeTicket.messages[index + 1] : null;
          const isFirstInGroup =
            !prevMessage ||
            prevMessage.isAgent !== isAgent ||
            prevMessage.author !== message.author;
          const isLastInGroup =
            !nextMessage ||
            nextMessage.isAgent !== isAgent ||
            nextMessage.author !== message.author;

          return (
            <article
              key={message.id}
              className={`support-message-item flex flex-col max-w-[80%] min-w-0 ${
                isAgent ? 'is-agent ml-auto items-end' : 'mr-auto items-start'
              } ${isFirstInGroup ? 'pt-2' : 'pt-0.5'}`}
            >
              {/* Header inside bubble / Author & Time (only for first message in group) */}
              {isFirstInGroup && (
                <div
                  className={`flex items-center gap-1.5 mb-1 text-[10.5px] text-slate-400 ${
                    isAgent ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="font-semibold text-slate-700">
                    {message.author ||
                      (isAgent ? t('inbox.conversation.youAuthor') : activeTicket.customer)}
                  </span>
                  <time>{message.time}</time>
                  {isAgent && <ShieldCheck size={12} className="text-blue-600" />}
                </div>
              )}

              {/* Message Bubble with connected radii */}
              <div
                className={`support-message-bubble px-3.5 py-2.5 text-[13px] leading-relaxed break-words shadow-xs min-w-[50px] ${
                  isAgent
                    ? `bg-gradient-to-r from-blue-600 to-indigo-600 text-white ${
                        isFirstInGroup && isLastInGroup
                          ? 'rounded-2xl rounded-tr-xs'
                          : isFirstInGroup
                            ? 'rounded-2xl rounded-tr-xs rounded-br-sm'
                            : isLastInGroup
                              ? 'rounded-2xl rounded-r-sm rounded-br-xs'
                              : 'rounded-2xl rounded-r-sm'
                      }`
                    : `bg-white border border-slate-200/90 text-slate-800 ${
                        isFirstInGroup && isLastInGroup
                          ? 'rounded-2xl rounded-tl-xs'
                          : isFirstInGroup
                            ? 'rounded-2xl rounded-tl-xs rounded-bl-sm'
                            : isLastInGroup
                              ? 'rounded-2xl rounded-l-sm rounded-bl-xs'
                              : 'rounded-2xl rounded-l-sm'
                      }`
                }`}
              >
                <ChatMessageContent body={message.body} attachments={message.attachments} />
              </div>

              {/* Read receipt for Agent (only on last message in consecutive group) */}
              {isAgent && isLastInGroup && (
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    message.isRead ? 'text-blue-600 font-medium' : 'text-slate-400'
                  }`}
                >
                  {message.isRead ? <CheckCheck size={12} /> : <Check size={12} />}
                  <span>
                    {message.isRead ? t('inbox.conversation.read') : t('inbox.conversation.sent')}
                  </span>
                </div>
              )}
            </article>
          );
        })}

        {typing && (
          <div className="flex items-center gap-2 text-xs italic text-slate-400">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>{t('inbox.conversation.customerTyping')}</span>
          </div>
        )}
      </div>

      {/* Composer (Input Area) */}
      <div className="border-t border-slate-100 bg-white p-3 shrink-0">
        {/* Quick Canned Replies in a neat single row */}
        <div className="flex items-center gap-2 pb-2 min-w-0">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-400 shrink-0">
            <Sparkles size={12} className="text-amber-500" /> {t('inbox.conversation.quickLabel')}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-nowrap py-0.5 custom-scrollbar">
            {quickCannedTemplates.map(({ label, text }) => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => insertQuickReply(text)}
                title={text}
                className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div
            className="flex flex-wrap gap-2 pb-2"
            aria-label={t('inbox.conversation.pendingImagesAria')}
          >
            {attachments.map((url) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={t('inbox.conversation.pendingImageAlt')}
                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  aria-label={t('inbox.conversation.removeAttachmentAria')}
                  disabled={disabled}
                  onClick={() =>
                    setAttachments((current) => current.filter((item) => item !== url))
                  }
                  className="absolute -right-1 -top-1 rounded-full bg-slate-800 p-0.5 text-white opacity-90 hover:opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          aria-label={t('inbox.conversation.replyAria')}
          disabled={disabled}
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          onKeyDown={keyDown}
          rows={2}
          placeholder={
            activeTicket.status === 'resolved'
              ? t('inbox.conversation.resolvedPlaceholder')
              : t('inbox.conversation.replyPlaceholder')
          }
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none transition-all resize-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50"
        />

        {/* Footer Actions */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t('inbox.conversation.attachAria')}
              title={t('inbox.conversation.attachTitle')}
              disabled={disabled || attachments.length >= 5}
              onClick={() => fileInput.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Paperclip size={16} />
            </button>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              ref={fileInput}
              onChange={(event) => void attach(event)}
            />
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <ShieldCheck size={13} className="text-blue-600" />
              {t('inbox.conversation.staffBadge')}
            </span>
          </div>

          <button
            type="button"
            disabled={disabled || (!reply.trim() && !attachments.length)}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-40 cursor-pointer"
          >
            <span>
              {uploading
                ? t('inbox.conversation.uploading')
                : sending && activeTicket.status === 'chatting'
                  ? t('inbox.conversation.sending')
                  : t('inbox.conversation.sendBtn')}
            </span>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
