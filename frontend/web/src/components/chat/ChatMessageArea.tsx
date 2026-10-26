import { type FormEvent, type JSX, type KeyboardEvent, useEffect, useRef } from 'react';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import type { ChatConversation, ChatMessage } from '../../types/chat.types';
import { formatChatTime } from './chatUtils';

interface ChatMessageAreaProps {
  active: ChatConversation | null;
  userId: string;
  connected: boolean;
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
  userId,
  connected,
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
        <h3 className="font-semibold">Tin nhắn của bạn</h3>
        <p className="text-sm text-slate-500">Chọn một hội thoại để bắt đầu trao đổi.</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button aria-label="Về danh sách" onClick={onBack} className="sm:hidden">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="font-semibold">{active.partner.storeName || active.partner.fullName}</h3>
          <p className={`text-xs ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
            {connected ? 'Đã kết nối realtime' : 'Đang kết nối realtime…'}
          </p>
        </div>
      </div>
      <div
        role="log"
        aria-label="Lịch sử tin nhắn"
        className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
      >
        {hasOlder && (
          <button
            disabled={older}
            onClick={onLoadOlder}
            className="block w-full text-xs text-blue-600"
          >
            {older ? 'Đang tải…' : 'Xem tin nhắn cũ hơn'}
          </button>
        )}
        {loading && (
          <p role="status" className="text-center text-sm text-slate-500">
            Đang tải tin nhắn…
          </p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Gửi lời chào đầu tiên!</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[85%]">
              <div
                className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${message.senderId === userId ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white'}`}
              >
                {message.body}
                {message.attachments.map(
                  (url, i) =>
                    /^https?:\/\//i.test(url) && (
                      <a
                        key={`${url}-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block underline"
                      >
                        Tệp đính kèm {i + 1}
                      </a>
                    ),
                )}
              </div>
              <p className="mt-1 text-right text-[10px] text-slate-400">
                {formatChatTime(message.createdAt)}
                {message.senderId === userId ? (message.isRead ? ' · Đã đọc' : ' · Đã gửi') : ''}
              </p>
            </div>
          </div>
        ))}
        {typing && <p className="text-xs italic text-slate-500">Đang nhập…</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <textarea
          aria-label="Nội dung tin nhắn"
          placeholder="Nhập tin nhắn…"
          rows={2}
          value={draft}
          disabled={loading || sending}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-28 min-h-12 flex-1 resize-none rounded-xl bg-slate-100 px-3 py-2 text-sm outline-blue-500"
        />
        <button
          type="submit"
          disabled={loading || sending || !draft.trim()}
          aria-label="Gửi tin nhắn"
          className="rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
