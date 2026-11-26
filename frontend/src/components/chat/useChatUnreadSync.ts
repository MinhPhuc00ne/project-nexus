import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { getChatConversations, getChatUnreadCount } from '@/features/chat/services/chat';
import {
  createChatConnection,
  type ChatConnectionClient,
} from '@/features/chat/services/chatSocket';
import type { ChatConversation, ChatMessage } from '@/features/chat/types/chat.types';
import { orderByLastMessage, rememberChatMessageId } from './chatWidget.helpers';

const CHAT_CONVERSATION_SYNC_INTERVAL_MS = 15_000;
const ACTIVE_CONVERSATIONS_PAGE_SIZE = 100;

type ActiveChatState = { id?: string; isVisible: boolean };

type UseChatUnreadSyncOptions = {
  userId: string;
  activeChatStateRef: MutableRefObject<ActiveChatState>;
  isPanelOpenRef: MutableRefObject<boolean>;
  setUnread: Dispatch<SetStateAction<number>>;
  setConversations: Dispatch<SetStateAction<ChatConversation[]>>;
  setRevision: Dispatch<SetStateAction<number>>;
};

export function useChatUnreadSync({
  userId,
  activeChatStateRef,
  isPanelOpenRef,
  setUnread,
  setConversations,
  setRevision,
}: UseChatUnreadSyncOptions): MutableRefObject<ChatConnectionClient | null> {
  const connectionRef = useRef<ChatConnectionClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connection = createChatConnection();
    connectionRef.current = connection;
    const joinedConversationIds = new Set<string>();
    const seenMessageIds = new Set<string>();
    let syncingConversations = false;

    const refreshUnreadCount = (): void => {
      void getChatUnreadCount()
        .then((count) => {
          if (!cancelled) setUnread(count);
        })
        .catch(() => {});
    };

    const handleNewMessage = (message: ChatMessage): void => {
      if (!message?.id || message.isMe || !rememberChatMessageId(seenMessageIds, message.id))
        return;
      const activeChat = activeChatStateRef.current;
      const isReadingThisConversation =
        activeChat.isVisible &&
        activeChat.id === message.conversationId &&
        document.visibilityState === 'visible';

      if (isReadingThisConversation) return;
      setUnread((count) => count + 1);
      setConversations((current) =>
        orderByLastMessage(
          current.map((conversation) => {
            if (conversation.id !== message.conversationId) return conversation;
            const isNewer =
              (Date.parse(message.createdAt) || 0) >=
              (Date.parse(conversation.lastMessageAt ?? conversation.createdAt) || 0);
            return {
              ...conversation,
              unreadCount: conversation.unreadCount + 1,
              ...(isNewer
                ? {
                    lastMessage: message.body || (message.attachments.length ? '📎' : ''),
                    lastMessageAt: message.createdAt,
                  }
                : {}),
            };
          }),
        ),
      );
    };

    const handleMessagesRead = (event: { conversationId: string; readBy: string }): void => {
      if (event.readBy !== userId) return;
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === event.conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
      refreshUnreadCount();
    };

    const syncUserConversations = async (recentOnly = false): Promise<void> => {
      if (cancelled || syncingConversations) return;
      syncingConversations = true;
      let joinedNewConversation = false;
      try {
        let page = 1;
        let totalPages = 1;
        while (!cancelled && page <= totalPages) {
          const result = await getChatConversations({
            page,
            limit: ACTIVE_CONVERSATIONS_PAGE_SIZE,
          });
          for (const conversation of result.items) {
            if (joinedConversationIds.has(conversation.id)) continue;
            joinedConversationIds.add(conversation.id);
            connection.joinConversation(conversation.id);
            joinedNewConversation = true;
          }
          totalPages = recentOnly ? 1 : Math.max(1, result.pagination.totalPages);
          page += 1;
        }
        if (!cancelled) {
          refreshUnreadCount();
          if (joinedNewConversation && isPanelOpenRef.current) setRevision((value) => value + 1);
        }
      } catch {
        // Opening the inbox, refocusing the tab, or the next poll retries failed joins.
      } finally {
        syncingConversations = false;
      }
    };

    const handleSocketConnect = (): void => {
      refreshUnreadCount();
      joinedConversationIds.forEach((conversationId) => {
        connection.joinConversation(conversationId);
      });
      void syncUserConversations(true);
    };
    const syncWhenVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      refreshUnreadCount();
      void syncUserConversations(true);
    };

    connection.socket.on('new_message', handleNewMessage);
    connection.socket.on('messages_read', handleMessagesRead);
    connection.socket.on('connect', handleSocketConnect);
    window.addEventListener('focus', syncWhenVisible);
    document.addEventListener('visibilitychange', syncWhenVisible);
    connection.connect();
    void syncUserConversations();
    const syncTimer = window.setInterval(
      () => void syncUserConversations(true),
      CHAT_CONVERSATION_SYNC_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(syncTimer);
      window.removeEventListener('focus', syncWhenVisible);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      connection.socket.off('new_message', handleNewMessage);
      connection.socket.off('messages_read', handleMessagesRead);
      connection.socket.off('connect', handleSocketConnect);
      connection.disconnect();
      joinedConversationIds.clear();
      seenMessageIds.clear();
      connectionRef.current = null;
    };
  }, [activeChatStateRef, isPanelOpenRef, setConversations, setRevision, setUnread, userId]);

  return connectionRef;
}
