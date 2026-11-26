import { io, type Socket } from 'socket.io-client';
import i18n from '@/i18n';
import { API_BASE_URL } from '@/services/api';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import { leaseSocket } from '@/services/socketPool';
import type { ChatMessage } from '@/features/chat/types/chat.types';

interface ChatServerEvents {
  new_message: (message: ChatMessage) => void;
  user_typing: (event: {
    conversationId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  }) => void;
  messages_read: (event: { conversationId: string; readBy: string }) => void;
  conversation_status_changed: (event: {
    conversationId: string;
    status: string;
    assignedStaffId?: string | null;
  }) => void;
  ticket_assigned: (event: { conversationId: string; conversation?: unknown }) => void;
  new_queue_ticket: (event: { conversationId: string; conversation?: unknown }) => void;
}

interface ChatClientEvents {
  join_conversation: (data: { conversationId: string }) => void;
  leave_conversation: (data: { conversationId: string }) => void;
  typing: (data: { conversationId: string; isTyping: boolean }) => void;
}

export type ChatSocket = Socket<ChatServerEvents, ChatClientEvents>;

export interface ChatConnectionClient {
  socket: ChatSocket;
  connect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  disconnect: () => void;
}

/**
 * Takes a lease on this account's chat connection.
 *
 * The widget opened two: one for the room it is showing and one for the unread
 * badge, so every message arrived twice and the server counted the visitor as
 * two people online. They share one now, and it closes when the last panel
 * using it goes away.
 *
 * Subscribe to events before calling connect(). Send messages through Axios.
 */
export function createChatConnection(): ChatConnectionClient {
  if (!getStoredToken()) throw new Error(i18n.t('errors:services.chatAuthRequired'));
  const userId = getStoredUser()?.id;
  const rooms = new Set<string>();

  const lease = leaseSocket<ChatSocket>(`chat:${userId ?? 'anonymous'}`, () => {
    const backendUrl = new URL(API_BASE_URL, window.location.origin);
    const shared: ChatSocket = io(`${backendUrl.origin}/chat`, {
      autoConnect: false,
      auth: (callback) => callback({ token: getStoredToken() }),
    });

    const onAuthChange = () => {
      if (!getStoredToken() || getStoredUser()?.id !== userId) {
        shared.disconnect();
      } else {
        shared.disconnect().connect();
      }
    };
    window.addEventListener('nexus:auth-change', onAuthChange);

    return {
      socket: shared,
      teardown: () => window.removeEventListener('nexus:auth-change', onAuthChange),
    };
  });

  const socket = lease.socket;

  // Rejoining is per lease: each panel re-enters the conversations it asked
  // for, which is what a reconnect has to restore.
  socket.on('connect', () => {
    rooms.forEach((conversationId) => socket.emit('join_conversation', { conversationId }));
  });

  // BE broadcasts isMe from the sender's perspective; compute it for this client.
  socket.on('new_message', (message) => {
    message.isMe = message.senderId === userId;
  });

  function disconnect() {
    rooms.clear();
    lease.disconnect();
  }

  return {
    socket,
    connect: () => lease.connect(),
    joinConversation(conversationId: string) {
      rooms.add(conversationId);
      if (socket.connected) socket.emit('join_conversation', { conversationId });
    },
    leaveConversation(conversationId: string) {
      rooms.delete(conversationId);
      if (socket.connected) socket.emit('leave_conversation', { conversationId });
    },
    setTyping(conversationId: string, isTyping: boolean) {
      if (socket.connected) socket.emit('typing', { conversationId, isTyping });
    },
    disconnect,
  };
}
