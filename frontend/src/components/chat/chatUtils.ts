import i18n from '../../i18n';
import { getIntlLocale } from '../../i18n/config';
import type { ChatMessage } from '@/features/chat/types/chat.types';

export const getChatErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : i18n.t('common:chat.loadMessagesError');

export const formatChatTime = (value: string): string =>
  new Date(value).toLocaleTimeString(getIntlLocale(i18n.language), {
    hour: '2-digit',
    minute: '2-digit',
  });

export const mergeMessages = (old: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] =>
  [...new Map([...old, ...incoming].map((message) => [message.id, message])).values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
