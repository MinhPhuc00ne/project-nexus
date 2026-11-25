import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChatConversations, getChatUnreadCount } from '../../../services/chat';
import { createChatConnection } from '../../../services/chatSocket';
import {
  MAX_SEEN_CHAT_MESSAGE_IDS,
  rememberChatMessageId,
  unreadBadgeLabel,
} from '../chatWidget.helpers';
import { useChatUnreadSync } from '../useChatUnreadSync';

vi.mock('../../../services/chat', () => ({
  getChatConversations: vi.fn(),
  getChatUnreadCount: vi.fn(),
}));

vi.mock('../../../services/chatSocket', () => ({
  createChatConnection: vi.fn(),
}));

describe('chatWidget helpers & useChatUnreadSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('caps unread badge at 99+ and deduplicates seen message IDs', () => {
    expect(unreadBadgeLabel(1)).toBe('1');
    expect(unreadBadgeLabel(120)).toBe('99+');
    expect(unreadBadgeLabel(-1)).toBe('0');

    const seen = new Set<string>();
    expect(rememberChatMessageId(seen, 'message-1')).toBe(true);
    expect(rememberChatMessageId(seen, 'message-1')).toBe(false);
  });

  it('keeps message deduplication cache bounded at MAX_SEEN_CHAT_MESSAGE_IDS', () => {
    const seen = new Set<string>();
    for (let index = 0; index <= MAX_SEEN_CHAT_MESSAGE_IDS; index += 1) {
      rememberChatMessageId(seen, `message-${index}`);
    }

    expect(seen.size).toBe(MAX_SEEN_CHAT_MESSAGE_IDS);
    expect(seen.has('message-0')).toBe(false);
    expect(seen.has(`message-${MAX_SEEN_CHAT_MESSAGE_IDS}`)).toBe(true);
  });

  it('rejoins previously subscribed conversation rooms on socket reconnect', async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const joinedRooms: string[] = [];
    const disconnectMock = vi.fn();

    vi.mocked(createChatConnection).mockReturnValue({
      socket: {
        on: (name: string, handler: (...args: unknown[]) => void) => handlers.set(name, handler),
        off: (name: string) => handlers.delete(name),
      },
      connect: vi.fn(),
      disconnect: disconnectMock,
      joinConversation: (id: string) => joinedRooms.push(id),
    } as never);

    const conversationId = 'conversation-1';
    vi.mocked(getChatConversations).mockResolvedValue({
      items: [
        {
          id: conversationId,
          unreadCount: 0,
          createdAt: '',
          lastMessageAt: null,
        } as never,
      ],
      pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
    vi.mocked(getChatUnreadCount).mockResolvedValue(0);

    const activeChatStateRef = { current: { isVisible: false } };
    const isPanelOpenRef = { current: false };
    const setUnread = vi.fn();
    const setConversations = vi.fn();
    const setRevision = vi.fn();

    const { unmount } = renderHook(() =>
      useChatUnreadSync({
        userId: 'user-1',
        activeChatStateRef,
        isPanelOpenRef,
        setUnread,
        setConversations,
        setRevision,
      }),
    );

    await waitFor(() => {
      expect(joinedRooms).toEqual([conversationId]);
    });

    handlers.get('connect')?.();
    expect(joinedRooms).toEqual([conversationId, conversationId]);

    unmount();
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
