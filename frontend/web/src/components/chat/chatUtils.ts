import type { ChatMessage } from '../../types/chat.types';

export const getChatErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Không thể tải tin nhắn.';

export const formatChatTime = (value: string): string =>
  new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const mergeMessages = (old: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] =>
  [...new Map([...old, ...incoming].map((message) => [message.id, message])).values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

