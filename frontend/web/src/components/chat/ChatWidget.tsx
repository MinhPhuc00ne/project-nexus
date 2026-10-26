import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Plus, Send, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createChatConversation,
  getChatConversations,
  getChatMessages,
  getChatUnreadCount,
  markChatAsRead,
  sendChatMessage,
} from '../../services/chat';
import { createChatConnection } from '../../services/chatSocket';
import type { ChatConversation, ChatConversationType, ChatMessage } from '../../types/chat.types';

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Không thể tải tin nhắn.';
const time = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const mergeMessages = (old: ChatMessage[], incoming: ChatMessage[]) =>
  [...new Map([...old, ...incoming].map((message) => [message.id, message])).values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

export default function ChatWidget() {
  const { token, storedUser } = useAuth();
  if (!token || !storedUser) return null;
  return <ChatPanel key={storedUser.id} userId={storedUser.id} />;
}

function ChatPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [active, setActive] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [older, setOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [creating, setCreating] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [type, setType] = useState<ChatConversationType>('BUYER_SELLER');
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [revision, setRevision] = useState(0);
  const connection = useRef<ReturnType<typeof createChatConnection> | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const activeId = active?.id;
  const currentConversation = useRef(activeId);
  currentConversation.current = activeId;

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void getChatUnreadCount()
        .then((count) => {
          if (!cancelled) setUnread(count);
        })
        .catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [revision]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getChatConversations({ search, page, limit: 20 })
        .then((result) => {
          if (cancelled) return;
          setConversations((current) =>
            page === 1
              ? result.items
              : [...new Map([...current, ...result.items].map((c) => [c.id, c])).values()],
          );
          setTotalPages(result.pagination.totalPages);
        })
        .catch((err) => {
          if (!cancelled) setError(errorText(err));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search, page, revision]);

  useEffect(() => {
    if (!open || !activeId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setError('');
    setTyping(false);
    setDraft('');
    setHasOlder(false);
    setOlder(false);
    const client = createChatConnection();
    connection.current = client;
    const read = () =>
      void markChatAsRead(activeId)
        .then(() => setRevision((v) => v + 1))
        .catch((err) => {
          if (!cancelled) setError(errorText(err));
        });
    client.socket.on('connect', () => {
      setConnected(true);
      // Recover messages missed while disconnected; merge with socket messages.
      void getChatMessages(activeId)
        .then((result) => {
          if (!cancelled) setMessages((current) => mergeMessages(current, result.messages));
        })
        .catch((err) => {
          if (!cancelled) setError(errorText(err));
        });
    });
    client.socket.on('disconnect', () => setConnected(false));
    client.socket.on('connect_error', () => setConnected(false));
    client.socket.on('new_message', (message) => {
      if (message.conversationId !== activeId) return;
      setMessages((current) =>
        mergeMessages(current, [{ ...message, isMe: message.senderId === userId }]),
      );
      setRevision((v) => v + 1);
      if (message.senderId !== userId && document.visibilityState === 'visible') read();
    });
    client.socket.on('user_typing', (event) => {
      if (event.conversationId === activeId && event.userId !== userId) setTyping(event.isTyping);
    });
    client.socket.on('messages_read', (event) => {
      if (event.conversationId === activeId && event.readBy !== userId)
        setMessages((current) =>
          current.map((message) =>
            message.senderId === userId ? { ...message, isRead: true } : message,
          ),
        );
    });
    client.joinConversation(activeId);
    client.connect();
    void getChatMessages(activeId)
      .then((result) => {
        if (cancelled) return;
        setMessages((current) => mergeMessages(current, result.messages));
        setHasOlder(result.count === result.limit);
        read();
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      client.setTyping(activeId, false);
      client.disconnect();
      connection.current = null;
      setConnected(false);
    };
  }, [open, activeId, userId]);

  useEffect(() => {
    if (!activeId || !draft) return;
    connection.current?.setTyping(activeId, true);
    const timer = window.setTimeout(() => connection.current?.setTyping(activeId, false), 1500);
    return () => {
      window.clearTimeout(timer);
      connection.current?.setTyping(activeId, false);
    };
  }, [draft, activeId]);

  useEffect(() => {
    if (!typing) return;
    const timer = window.setTimeout(() => setTyping(false), 3000);
    return () => window.clearTimeout(timer);
  }, [typing]);

  useEffect(() => {
    if (!older) end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, typing, older]);

  async function send() {
    if (!activeId || !draft.trim() || sending) return;
    const id = activeId;
    const body = draft.trim();
    setSending(true);
    setError('');
    try {
      const message = await sendChatMessage(id, { body });
      if (connection.current && id === currentConversation.current) {
        setMessages((current) => mergeMessages(current, [message]));
        setDraft((current) => (current.trim() === body ? '' : current));
      }
      setRevision((v) => v + 1);
    } catch (err) {
      if (id === currentConversation.current) setError(errorText(err));
    } finally {
      setSending(false);
    }
  }

  async function start() {
    if (!participantId.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      const conversation = await createChatConversation({
        participantId: participantId.trim(),
        type,
      });
      setActive(conversation);
      setParticipantId('');
      setRevision((v) => v + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setCreating(false);
    }
  }

  async function loadOlder() {
    if (!activeId || !messages[0] || older) return;
    const id = activeId;
    setOlder(true);
    try {
      const result = await getChatMessages(id, { before: messages[0].createdAt, limit: 50 });
      if (currentConversation.current !== id) return;
      setMessages((current) => mergeMessages(result.messages, current));
      setHasOlder(result.count === result.limit);
    } catch (err) {
      if (currentConversation.current === id) setError(errorText(err));
    } finally {
      if (currentConversation.current === id) setOlder(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[100] font-sans max-sm:bottom-3 max-sm:right-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-semibold text-white shadow-xl hover:bg-blue-700"
          aria-label="Mở tin nhắn"
        >
          <MessageCircle size={22} /> Tin nhắn{' '}
          {unread > 0 && <span className="rounded-full bg-red-500 px-2 text-xs">{unread}</span>}
        </button>
      ) : (
        <section
          aria-label="Hộp tin nhắn"
          className="flex h-[min(640px,85dvh)] w-[min(760px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
        >
          <header className="flex items-center justify-between bg-blue-600 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <MessageCircle />
              <div>
                <h2 className="font-bold">Nexus Chat</h2>
                <p className="text-xs text-blue-100">Kết nối người mua, người bán và hỗ trợ</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng chat"
              className="rounded-lg p-2 hover:bg-blue-500"
            >
              <X size={20} />
            </button>
          </header>
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-700"
            >
              {error}
              <button
                onClick={() => {
                  setError('');
                  setRevision((v) => v + 1);
                }}
                aria-label="Đóng thông báo"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex min-h-0 flex-1">
            <aside
              className={`${active ? 'max-sm:hidden' : ''} flex w-64 shrink-0 flex-col border-r border-slate-100 max-sm:w-full`}
            >
              <div className="space-y-3 border-b border-slate-100 p-3">
                <input
                  aria-label="Tìm hội thoại"
                  placeholder="Tìm cuộc trò chuyện…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-blue-500"
                />
                <details>
                  <summary className="flex cursor-pointer items-center gap-1 text-sm font-medium text-blue-600">
                    <Plus size={16} /> Cuộc trò chuyện mới
                  </summary>
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void start();
                    }}
                  >
                    <input
                      required
                      aria-label="ID người nhận"
                      placeholder="ID tài khoản người nhận"
                      value={participantId}
                      onChange={(e) => setParticipantId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    />
                    <select
                      aria-label="Loại hội thoại"
                      value={type}
                      onChange={(e) => setType(e.target.value as ChatConversationType)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                    >
                      <option value="BUYER_SELLER">Người mua – Người bán</option>
                      <option value="STAFF_BUYER">Hỗ trợ – Người mua</option>
                      <option value="STAFF_SELLER">Hỗ trợ – Người bán</option>
                      <option value="GENERAL">Trao đổi chung</option>
                    </select>
                    <button
                      disabled={creating}
                      className="w-full rounded-lg bg-blue-600 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {creating ? 'Đang mở…' : 'Bắt đầu chat'}
                    </button>
                  </form>
                </details>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 && (
                  <p className="p-5 text-center text-sm text-slate-500">
                    Chưa có cuộc trò chuyện. Bắt đầu chat với một tài khoản khác.
                  </p>
                )}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActive(c);
                      setError('');
                    }}
                    className={`flex w-full gap-3 border-b border-slate-50 p-3 text-left hover:bg-blue-50 ${activeId === c.id ? 'bg-blue-50' : ''}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                      {c.partner.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {c.partner.storeName || c.partner.fullName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {c.lastMessage || 'Bắt đầu trò chuyện'}
                      </span>
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="h-fit rounded-full bg-blue-600 px-1.5 text-xs text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                {page < totalPages && (
                  <button
                    onClick={() => setPage((v) => v + 1)}
                    className="w-full p-3 text-sm text-blue-600"
                  >
                    Xem thêm hội thoại
                  </button>
                )}
              </div>
            </aside>
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center max-sm:hidden">
                <MessageCircle size={48} className="text-blue-200" />
                <h3 className="font-semibold">Tin nhắn của bạn</h3>
                <p className="text-sm text-slate-500">Chọn một hội thoại để bắt đầu trao đổi.</p>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <button
                    aria-label="Về danh sách"
                    onClick={() => setActive(null)}
                    className="sm:hidden"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="font-semibold">
                      {active.partner.storeName || active.partner.fullName}
                    </h3>
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
                      onClick={() => void loadOlder()}
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
                    <p className="py-10 text-center text-sm text-slate-400">
                      Gửi lời chào đầu tiên!
                    </p>
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
                          {time(message.createdAt)}
                          {message.senderId === userId
                            ? message.isRead
                              ? ' · Đã đọc'
                              : ' · Đã gửi'
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {typing && <p className="text-xs italic text-slate-500">Đang nhập…</p>}
                  <div ref={end} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                  className="flex items-end gap-2 border-t border-slate-100 p-3"
                >
                  <textarea
                    aria-label="Nội dung tin nhắn"
                    placeholder="Nhập tin nhắn…"
                    rows={2}
                    value={draft}
                    disabled={loading || sending}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void send();
                      }
                    }}
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
            )}
          </div>
        </section>
      )}
    </div>
  );
}
