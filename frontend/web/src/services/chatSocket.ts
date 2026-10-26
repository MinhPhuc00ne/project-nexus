import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getStoredToken, getStoredUser } from './auth';
import type { ChatMessage } from '../types/chat.types';

interface ChatServerEvents {
  new_message: (message: ChatMessage) => void;
  user_typing: (event: {
    conversationId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  }) => void;
  messages_read: (event: { conversationId: string; readBy: string }) => void;
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

// Subscribe to events before calling connect(). Send messages through Axios.
export function createChatConnection(): ChatConnectionClient {
  if (!getStoredToken()) throw new Error('Vui lòng đăng nhập để sử dụng chat.');
  const backendUrl = new URL(API_BASE_URL, window.location.origin);
  const socket: ChatSocket = io(`${backendUrl.origin}/chat`, {
    autoConnect: false,
    auth: (callback) => callback({ token: getStoredToken() }),
  });
  const rooms = new Set<string>();
  const userId = getStoredUser()?.id;

  socket.on('connect', () => {
    rooms.forEach((conversationId) => socket.emit('join_conversation', { conversationId }));
  });
  // BE broadcasts isMe from the sender's perspective; compute it for this client.
  socket.on('new_message', (message) => {
    message.isMe = message.senderId === userId;
  });

  const onAuthChange = () => {
    if (!getStoredToken() || getStoredUser()?.id !== userId) {
      disconnect();
    } else {
      socket.disconnect().connect();
    }
  };
  window.addEventListener('nexus:auth-change', onAuthChange);

  function disconnect() {
    window.removeEventListener('nexus:auth-change', onAuthChange);
    rooms.clear();
    socket.disconnect();
    socket.removeAllListeners();
  }

  return {
    socket,
    connect: () => socket.connect(),
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
