import type { ChatConversation } from '@/features/chat/types/chat.types';

export const MAX_SEEN_CHAT_MESSAGE_IDS = 1_000;

export function orderByLastMessage(items: ChatConversation[]): ChatConversation[] {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.lastMessageAt ?? left.createdAt) || 0;
    const rightTime = Date.parse(right.lastMessageAt ?? right.createdAt) || 0;
    return rightTime - leftTime || left.id.localeCompare(right.id);
  });
}

export function unreadBadgeLabel(count: number): string {
  if (count > 99) return '99+';
  return String(Math.max(0, count));
}

export function rememberChatMessageId(seen: Set<string>, messageId: string): boolean {
  if (seen.has(messageId)) return false;
  seen.add(messageId);
  if (seen.size > MAX_SEEN_CHAT_MESSAGE_IDS) {
    const oldestMessageId = seen.values().next().value;
    if (oldestMessageId) seen.delete(oldestMessageId);
  }
  return true;
}
