import { useEffect, useRef, useState } from 'react';
import {
  getChatMessages,
  markChatAsRead,
  normalizeChatMessage,
  sendChatMessage,
} from '@/features/chat/services/chat';
import {
  type ChatConnectionClient,
  createChatConnection,
} from '@/features/chat/services/chatSocket';
import type { ChatMessage } from '../../types/chat.types';
import { getChatErrorMessage, mergeMessages } from './chatUtils';

interface UseChatRoomOptions {
  activeId?: string;
  userId: string;
  isOpen: boolean;
  onRevisionChange: () => void;
  onRead?: (conversationId: string) => void;
}

export interface UseChatRoomResult {
  messages: ChatMessage[];
  draft: string;
  setDraft: (value: string) => void;
  loading: boolean;
  sending: boolean;
  older: boolean;
  hasOlder: boolean;
  connected: boolean;
  scrollVersion: number;
  typing: boolean;
  error: string;
  setError: (value: string) => void;
  send: (attachments?: string[]) => Promise<boolean>;
  loadOlder: () => Promise<void>;
}

export function useChatRoom({
  activeId,
  userId,
  isOpen,
  onRevisionChange,
  onRead,
}: UseChatRoomOptions): UseChatRoomResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [older, setOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [scrollVersion, setScrollVersion] = useState(0);

  const connection = useRef<ChatConnectionClient | null>(null);
  const callbacks = useRef({ onRevisionChange, onRead });
  callbacks.current = { onRevisionChange, onRead };
  const currentConversation = useRef(activeId);
  currentConversation.current = activeId;

  useEffect(() => {
    if (!isOpen || !activeId) return;
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

    let reading = false;
    const read = (): void => {
      if (cancelled || reading || document.visibilityState !== 'visible') return;
      reading = true;
      void markChatAsRead(activeId)
        .then(() => {
          if (cancelled) return;
          callbacks.current.onRead?.(activeId);
        })
        .catch((err) => {
          if (!cancelled) setError(getChatErrorMessage(err));
        })
        .finally(() => {
          reading = false;
        });
    };

    client.socket.on('connect', () => {
      setConnected(true);
      void getChatMessages(activeId)
        .then((result) => {
          if (!cancelled) setMessages((current) => mergeMessages(current, result.messages));
          if (!cancelled) read();
        })
        .catch((err) => {
          if (!cancelled) setError(getChatErrorMessage(err));
        });
    });
    client.socket.on('disconnect', () => setConnected(false));
    client.socket.on('connect_error', () => setConnected(false));
    client.socket.on('new_message', (message) => {
      if (message.conversationId !== activeId) return;
      setMessages((current) => mergeMessages(current, [normalizeChatMessage(message, userId)]));
      setScrollVersion((current) => current + 1);
      onRevisionChange();
      if (message.senderId !== userId && document.visibilityState === 'visible') read();
    });
    client.socket.on('user_typing', (event) => {
      if (event.conversationId === activeId && event.userId !== userId) setTyping(event.isTyping);
    });
    client.socket.on('messages_read', (event) => {
      if (event.conversationId === activeId && event.readBy !== userId) {
        setMessages((current) =>
          current.map((message) => (message.isMe ? { ...message, isRead: true } : message)),
        );
      }
    });
    client.socket.on('conversation_status_changed', (event) => {
      if (event?.conversationId === activeId) {
        onRevisionChange();
      }
    });

    client.joinConversation(activeId);
    client.connect();
    window.addEventListener('focus', read);
    document.addEventListener('visibilitychange', read);
    const handleInteraction = (event: Event): void => {
      if (
        (event.target as Element | null)
          ?.closest('[data-chat-conversation-id]')
          ?.getAttribute('data-chat-conversation-id') === activeId
      )
        read();
    };
    document.addEventListener('pointerdown', handleInteraction);

    void getChatMessages(activeId)
      .then((result) => {
        if (cancelled) return;
        setMessages((current) => mergeMessages(current, result.messages));
        setHasOlder(result.count === result.limit);
        read();
      })
      .catch((err) => {
        if (!cancelled) setError(getChatErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', read);
      document.removeEventListener('visibilitychange', read);
      document.removeEventListener('pointerdown', handleInteraction);
      client.setTyping(activeId, false);
      client.disconnect();
      connection.current = null;
      setConnected(false);
    };
  }, [isOpen, activeId, userId]);

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

  async function send(attachments?: string[]): Promise<boolean> {
    if (!activeId || (!draft.trim() && (!attachments || attachments.length === 0)) || sending)
      return false;
    const id = activeId;
    const body = draft.trim();
    setSending(true);
    setError('');
    try {
      const message = await sendChatMessage(id, { body, attachments });
      if (connection.current && id === currentConversation.current) {
        setMessages((current) => mergeMessages(current, [message]));
        setScrollVersion((current) => current + 1);
        setDraft((current) => (current.trim() === body ? '' : current));
      }
      onRevisionChange();
      return true;
    } catch (err) {
      if (id === currentConversation.current) setError(getChatErrorMessage(err));
      return false;
    } finally {
      setSending(false);
    }
  }

  async function loadOlder(): Promise<void> {
    if (!activeId || !messages[0] || older) return;
    const id = activeId;
    setOlder(true);
    try {
      const result = await getChatMessages(id, { before: messages[0].createdAt, limit: 50 });
      if (currentConversation.current !== id) return;
      setMessages((current) => mergeMessages(result.messages, current));
      setHasOlder(result.count === result.limit);
    } catch (err) {
      if (currentConversation.current === id) setError(getChatErrorMessage(err));
    } finally {
      if (currentConversation.current === id) setOlder(false);
    }
  }

  return {
    messages,
    draft,
    setDraft,
    loading,
    sending,
    older,
    hasOlder,
    connected,
    scrollVersion,
    typing,
    error,
    setError,
    send,
    loadOlder,
  };
}
