import axios, { type AxiosRequestConfig } from 'axios';
import api, { ApiRequestError } from './api';
import { getStoredToken } from './auth';
import type {
  ChatConversation,
  ChatConversationList,
  ChatConversationQuery,
  ChatMessage,
  ChatMessageList,
  ChatMessageQuery,
  ChatReadResult,
  CreateChatConversation,
  SendChatMessage,
} from '../types/chat.types';

// The controller wraps detail/messages in { data }, inside the global envelope.
async function chatRequest<T>(config: AxiosRequestConfig, nestedData = false): Promise<T> {
  if (!getStoredToken()) throw new Error('Vui lòng đăng nhập để sử dụng chat.');
  try {
    const response = await api.request<{ data: T | { data: T } }>(config);
    const payload = response.data.data;
    return nestedData ? (payload as { data: T }).data : (payload as T);
  } catch (error) {
    if (axios.isAxiosError<{ message?: string | string[]; errors?: string[] }>(error)) {
      const payload = error.response?.data;
      const message = payload?.errors ?? payload?.message;
      throw new ApiRequestError(
        Array.isArray(message)
          ? message.join(' · ')
          : message || 'Không thể kết nối dịch vụ chat. Vui lòng thử lại.',
        error.response?.status ?? 0,
      );
    }
    throw error;
  }
}

const conversationPath = (id: string) => `/chat/conversations/${encodeURIComponent(id)}`;
//Create a conversation or reopen an existing one with another user.
export function createChatConversation(body: CreateChatConversation): Promise<ChatConversation> {
  return chatRequest({ method: 'POST', url: '/chat/conversations', data: body });
}
//Retrieve conversations with search and pagination support.
export function getChatConversations(params: ChatConversationQuery = {}): Promise<ChatConversationList> {
  return chatRequest({ method: 'GET', url: '/chat/conversations', params });
}
//Retrieve details of a specific conversation.
export function getChatConversation(id: string): Promise<ChatConversation> {
  return chatRequest({ method: 'GET', url: conversationPath(id) }, true);
}
//Retrieve message history; use before to load older messages.
export function getChatMessages(id: string, params: ChatMessageQuery = {}): Promise<ChatMessageList> {
  return chatRequest({ method: 'GET', url: `${conversationPath(id)}/messages`, params }, true);
}
//Send a message with optional attachment URLs.
export function sendChatMessage(id: string, body: SendChatMessage): Promise<ChatMessage> {
  return chatRequest({ method: 'POST', url: `${conversationPath(id)}/messages`, data: body });
}
//Mark messages in a conversation as read.
export function markChatAsRead(id: string): Promise<ChatReadResult> {
  return chatRequest({ method: 'PATCH', url: `${conversationPath(id)}/read` });
}
//Retrieve the total unread message count for the chat badge.
export async function getChatUnreadCount(): Promise<number> {
  const result = await chatRequest<{ unreadCount: number }>({ method: 'GET', url: '/chat/unread-count' });
  return result.unreadCount;
}
