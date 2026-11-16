import { type JSX, useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createChatConversation,
  getChatConversations,
  getChatConversation,
  getChatUnreadCount,
  requestChatSupport,
} from '../../services/chat';
import type { ChatConversation, ChatConversationType } from '../../types/chat.types';
import ChatConversationList from './ChatConversationList';
import ChatMessageArea from './ChatMessageArea';
import { getChatErrorMessage } from './chatUtils';
import { useChatRoom } from './useChatRoom';
import SupportMenu from './SupportMenu';
import ChatbotPanel from './ChatbotPanel';
import {
  OPEN_CHAT_CONVERSATION_EVENT,
  OPEN_CHAT_WITH_USER_EVENT,
  type OpenChatWithUserRequest,
} from './chatEvents';

export default function ChatWidget(): JSX.Element | null {
  const { token, storedUser } = useAuth();
  if (!token || !storedUser) return <GuestChatbotWidget />;
  if (storedUser.role === 'SUPPORT_STAFF') return null;
  return (
    <ChatPanel
      key={storedUser.id}
      userId={storedUser.id}
      canRequestSupport={storedUser.role === 'BUYER' || storedUser.role === 'SELLER'}
    />
  );
}

function GuestChatbotWidget(): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-[1300] font-sans max-sm:bottom-3 max-sm:right-3">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý' : 'Mở trợ lý NEXUS'}
        className="ml-auto flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-semibold text-white shadow-xl"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />} {open ? 'Đóng' : 'Hỗ trợ NEXUS'}
      </button>
      <section
        aria-label="Chatbot NEXUS"
        className={`${open ? 'flex' : 'hidden'} mt-3 h-[min(560px,calc(100dvh-32px))] w-[min(460px,calc(100vw-32px))] max-sm:w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <ChatbotPanel guest />
      </section>
    </div>
  );
}

function ChatPanel({
  userId,
  canRequestSupport,
}: {
  userId: string;
  canRequestSupport: boolean;
}): JSX.Element {
  const [view, setView] = useState<'chat' | 'support' | 'bot'>(canRequestSupport ? 'bot' : 'chat');
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [active, setActive] = useState<ChatConversation | null>(null);
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState(0);
  const [panelError, setPanelError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [creating, setCreating] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [type, setType] = useState<ChatConversationType>('BUYER_SELLER');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handleOpenChat = (event: Event): void => {
      const request = (event as CustomEvent<OpenChatWithUserRequest>).detail;
      if (!request?.userId || request.userId === userId || creating) return;

      setOpen(true);
      setView('chat');
      setSearch('');
      setPage(1);
      setActive(null);
      setPanelError('');
      setCreating(true);

      void createChatConversation({
        participantId: request.userId,
        type: 'BUYER_SELLER',
        ...(request.userName ? { title: `Chat với ${request.userName}` } : {}),
      })
        .then((conversation) => {
          setActive(conversation);
          setRevision((value) => value + 1);
        })
        .catch((error: unknown) => {
          setPanelError(getChatErrorMessage(error));
        })
        .finally(() => setCreating(false));
    };

    window.addEventListener(OPEN_CHAT_WITH_USER_EVENT, handleOpenChat);
    return () => window.removeEventListener(OPEN_CHAT_WITH_USER_EVENT, handleOpenChat);
  }, [creating, userId]);

  useEffect(() => {
    const handleOpenConversation = (event: Event): void => {
      const conversationId = (event as CustomEvent<{ conversationId?: string }>).detail
        ?.conversationId;
      if (!conversationId) return;
      setOpen(true);
      setView('chat');
      setActive(null);
      setPanelError('');
      setCreating(true);
      void getChatConversation(conversationId)
        .then((conversation) => {
          setActive(conversation);
          setRevision((value) => value + 1);
        })
        .catch((error: unknown) => setPanelError(getChatErrorMessage(error)))
        .finally(() => setCreating(false));
    };
    window.addEventListener(OPEN_CHAT_CONVERSATION_EVENT, handleOpenConversation);
    return () => window.removeEventListener(OPEN_CHAT_CONVERSATION_EVENT, handleOpenConversation);
  }, []);

  const activeId = active?.id;

  const room = useChatRoom({
    activeId,
    userId,
    isOpen: open && view === 'chat',
    onRevisionChange: () => setRevision((v) => v + 1),
    onRead: (conversationId) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
      );
    },
  });

  const displayError = panelError || room.error;

  const clearError = (): void => {
    setPanelError('');
    room.setError('');
    setRevision((v) => v + 1);
  };

  useEffect(() => {
    const handleOpenChatEvent = async (event: Event) => {
      const e = event as CustomEvent<{ sellerId?: string; shopName?: string }>;
      const targetSellerId = e.detail?.sellerId;
      setOpen(true);
      if (!targetSellerId) return;

      setCreating(true);
      setPanelError('');
      try {
        const conversation = await createChatConversation({
          participantId: targetSellerId,
          type: 'BUYER_SELLER',
        });
        setActive(conversation);
        setRevision((v) => v + 1);
      } catch (err) {
        setPanelError(getChatErrorMessage(err));
      } finally {
        setCreating(false);
      }
    };

    window.addEventListener('nexus:open-chat', handleOpenChatEvent);
    return () => {
      window.removeEventListener('nexus:open-chat', handleOpenChatEvent);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = (): void => {
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
          if (!cancelled) setPanelError(getChatErrorMessage(err));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search, page, revision]);

  async function handleStartConversation(): Promise<void> {
    if (!participantId.trim() || creating) return;
    setCreating(true);
    setPanelError('');
    try {
      const conversation = await createChatConversation({
        participantId: participantId.trim(),
        type,
      });
      setActive(conversation);
      setParticipantId('');
      setRevision((v) => v + 1);
    } catch (err) {
      setPanelError(getChatErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleSendSupportMessage(request: {
    category: string;
    description: string;
    orderId?: string;
  }): Promise<void> {
    if (creating) return;
    setCreating(true);
    setPanelError('');
    try {
      const conversation = await requestChatSupport({
        subject: request.category,
        message: request.description,
        ...(request.orderId
          ? { contextId: request.orderId, contextType: 'ORDER' as const }
          : { contextType: 'GENERAL' as const }),
      });
      setActive(conversation);
      setView('chat');
      setRevision((value) => value + 1);
    } catch (err) {
      setPanelError(getChatErrorMessage(err));
      throw err;
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1300] font-sans max-sm:bottom-3 max-sm:right-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 font-semibold text-white shadow-xl hover:bg-blue-700"
          aria-label="Mở tin nhắn"
        >
          <MessageCircle size={22} /> {canRequestSupport ? 'Tin nhắn & Hỗ trợ' : 'Tin nhắn'}{' '}
          {unread > 0 && <span className="rounded-full bg-red-500 px-2 text-xs">{unread}</span>}
        </button>
      ) : (
        <section
          aria-label="Hộp tin nhắn"
          className="flex h-[min(560px,calc(100dvh-32px))] w-[min(560px,calc(100vw-32px))] max-sm:h-[calc(100dvh-24px)] max-sm:w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 bg-blue-600 px-5 py-4 text-white">
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

          {canRequestSupport && (
            <nav
              aria-label="Tin nhắn và hỗ trợ"
              className="flex shrink-0 flex-wrap gap-1 border-b border-slate-100 px-3 py-2"
            >
              {(['bot', 'support', 'chat'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setView(tab)}
                  aria-pressed={view === tab}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold max-sm:flex-1 max-sm:px-2 max-sm:text-xs ${view === tab ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {tab === 'bot'
                    ? 'Trợ lý NEXUS'
                    : tab === 'support'
                      ? 'Nhân viên hỗ trợ'
                      : 'Tin nhắn'}
                </button>
              ))}
            </nav>
          )}
          {displayError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-700"
            >
              {displayError}
              <button onClick={clearError} aria-label="Đóng thông báo">
                <X size={16} />
              </button>
            </div>
          )}

          {canRequestSupport && (
            <div className={view === 'bot' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
              <ChatbotPanel
                creating={creating}
                onRequestSupport={(description, orderId) =>
                  handleSendSupportMessage({ category: 'Hỗ trợ từ chatbot', description, orderId })
                }
              />
            </div>
          )}
          {view === 'bot' && canRequestSupport ? null : view === 'support' && canRequestSupport ? (
            <SupportMenu
              conversations={conversations}
              onSendSupportMessage={handleSendSupportMessage}
              sending={creating}
              onOpenConversation={(conversation) => {
                setActive(conversation);
                setView('chat');
                clearError();
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1">
              <ChatConversationList
                conversations={conversations}
                activeId={activeId}
                onSelect={(c) => {
                  setActive(c);
                  clearError();
                }}
                search={search}
                onSearchChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                participantId={participantId}
                onParticipantIdChange={setParticipantId}
                type={type}
                onTypeChange={setType}
                creating={creating}
                onCreateConversation={() => void handleStartConversation()}
                hasMorePages={page < totalPages}
                onLoadMore={() => setPage((v) => v + 1)}
                hiddenOnMobile={!!active}
              />

              <ChatMessageArea
                active={active}
                loading={room.loading}
                messages={room.messages}
                hasOlder={room.hasOlder}
                older={room.older}
                typing={room.typing}
                draft={room.draft}
                sending={room.sending}
                onBack={() => setActive(null)}
                onLoadOlder={() => void room.loadOlder()}
                onDraftChange={room.setDraft}
                onSend={() => void room.send()}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
