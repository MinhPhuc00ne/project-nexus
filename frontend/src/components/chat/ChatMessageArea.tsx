import ChatMessageContent from './ChatMessageContent';
import { type FormEvent, type JSX, type KeyboardEvent, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import type { ChatConversation, ChatMessage } from '@/features/chat/types/chat.types';
import { formatChatTime } from './chatUtils';
import ChatAvatar from './ChatAvatar';

interface ChatMessageAreaProps {
  active: ChatConversation | null;
  loading: boolean;
  messages: ChatMessage[];
  hasOlder: boolean;
  older: boolean;
  typing: boolean;
  draft: string;
  sending: boolean;
  onBack: () => void;
  onLoadOlder: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export default function ChatMessageArea({
  active,
  loading,
  messages,
  hasOlder,
  older,
  typing,
  draft,
  sending,
  onBack,
  onLoadOlder,
  onDraftChange,
  onSend,
}: ChatMessageAreaProps): JSX.Element {
  const { t } = useTranslation('common');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!older) {
      endRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [messages, typing, older]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  if (!active) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center max-sm:hidden">
        <MessageCircle size={48} className="text-blue-200" />
        <h3 className="font-semibold">{t('chat.messageArea.emptyTitle')}</h3>
        <p className="text-sm text-slate-500">{t('chat.messageArea.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-chat-conversation-id={active.id}>
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button
          aria-label={t('chat.messageArea.backToList')}
          onClick={onBack}
          className="sm:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <ChatAvatar src={active.partner.avatarUrl} name={active.partner.fullName} size={36} />
        <div className="min-w-0">
          <h3 className="truncate font-semibold">
            {active.partner.storeName || active.partner.fullName}
          </h3>
        </div>
      </div>
      <div
        role="log"
        aria-label={t('chat.messageArea.historyAria')}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 p-4"
      >
        {hasOlder && (
          <button
            disabled={older}
            onClick={onLoadOlder}
            className="block w-full text-xs text-blue-600"
          >
            {older ? t('chat.messageArea.loadingOlder') : t('chat.messageArea.loadOlder')}
          </button>
        )}
        {loading && (
          <p role="status" className="text-center text-sm text-slate-500">
            {t('chat.messageArea.loadingMessages')}
          </p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">
            {t('chat.messageArea.sendFirstGreeting')}
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${message.isMe ? 'justify-end' : 'justify-start'}`}
          >
            {!message.isMe && (
              <ChatAvatar
                src={message.senderAvatar}
                name={message.senderName || active.partner.fullName}
                size={28}
              />
            )}
            <div
              className={`flex min-w-0 max-w-[calc(100%-40px)] flex-col ${message.isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`w-fit max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-2 text-sm ${message.isMe ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white'}`}
              >
                <ChatMessageContent body={message.body} attachments={message.attachments} />
              </div>
              <p className="mt-1 text-right text-[10px] text-slate-400">
                {formatChatTime(message.createdAt)}
                {message.isMe
                  ? message.isRead
                    ? t('chat.messageArea.read')
                    : t('chat.messageArea.sent')
                  : ''}
              </p>
            </div>
            {message.isMe && (
              <ChatAvatar
                src={message.senderAvatar}
                name={message.senderName || t('chat.you')}
                size={28}
              />
            )}
          </div>
        ))}
        {typing && <p className="text-xs italic text-slate-500">{t('chat.messageArea.typing')}</p>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          aria-label={t('chat.messageArea.inputAria')}
          placeholder={t('chat.messageArea.inputPlaceholder')}
          rows={2}
          value={draft}
          disabled={loading || sending}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-28 min-h-12 min-w-0 flex-1 resize-none rounded-xl bg-slate-100 px-3 py-2 text-sm outline-blue-500"
        />
        <button
          type="submit"
          disabled={loading || sending || !draft.trim()}
          aria-label={t('chat.messageArea.sendAria')}
          className="rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
