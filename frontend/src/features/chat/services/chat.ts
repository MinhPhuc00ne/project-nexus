import { type AxiosRequestConfig } from 'axios';
import i18n from '@/i18n';
import { request } from '@/services/api';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import type {
  ChatParticipant,
  ChatConversation,
  ChatConversationList,
  ChatConversationQuery,
  ChatMessage,
  ChatMessageList,
  ChatMessageQuery,
  ChatReadResult,
  CreateChatConversation,
  ChatSupportQueue,
  RequestChatSupport,
  SendChatMessage,
  SupportConversationStatus,
} from '@/types/chat.types';

/**
 * Calls a chat endpoint, refusing early when nobody is signed in.
 *
 * @param config - The request, as Axios describes it.
 * @param nestedData - True for the endpoints that wrap their payload in a
 *   second `data`, which the conversation detail and message list do.
 * @returns The payload.
 */
async function chatRequest<T>(config: AxiosRequestConfig, nestedData = false): Promise<T> {
  if (!getStoredToken()) throw new Error(i18n.t('errors:services.chatAuthRequired'));
  return request<T>(config, {
    nested: nestedData,
    fallbackMessage: i18n.t('errors:services.chatConnectFailed'),
  });
}

const conversationPath = (id: string) => `/chat/conversations/${encodeURIComponent(id)}`;

interface RawChatParticipant {
  id?: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  storeName?: string | null;
}

type RawChatConversation = Omit<Partial<ChatConversation>, 'assignedStaff'> & {
  participant1Id?: string;
  participant2Id?: string;
  participant1?: RawChatParticipant | null;
  participant2?: RawChatParticipant | null;
  assignedStaff?: RawChatParticipant | null;
  unreadCountUser1?: number;
  unreadCountUser2?: number;
  messages?: Array<{ body?: string | null }>;
};

type RawChatMessage = Omit<Partial<ChatMessage>, 'attachments'> & {
  content?: string;
  sender?: RawChatParticipant | null;
  attachments?: unknown;
};

function normalizeParticipant(participant?: RawChatParticipant | null): ChatParticipant {
  return {
    id: participant?.id ?? '',
    fullName:
      participant?.fullName || participant?.email || i18n.t('errors:services.fallbackAccount'),
    email: participant?.email ?? '',
    avatarUrl: participant?.avatarUrl ?? null,
    role: participant?.role ?? 'UNKNOWN',
    ...(participant?.storeName ? { storeName: participant.storeName } : {}),
  };
}

function normalizeConversation(
  value: unknown,
  userId = getStoredUser()?.id ?? '',
): ChatConversation {
  const raw = value as RawChatConversation;
  const firstId = raw.participant1Id ?? raw.participant1?.id;
  const secondId = raw.participant2Id ?? raw.participant2?.id;
  const isFirstParticipant = Boolean(userId && firstId === userId);
  const isSecondParticipant = Boolean(userId && secondId === userId);
  const partner =
    raw.partner ??
    (isFirstParticipant
      ? raw.participant2
      : isSecondParticipant
        ? raw.participant1
        : [raw.participant1, raw.participant2].find(
            (participant) => participant && participant.role !== 'SUPPORT_STAFF',
          )) ??
    raw.participant2 ??
    raw.participant1;

  return {
    id: raw.id ?? '',
    type: raw.type ?? 'GENERAL',
    title: raw.title ?? null,
    contextId: raw.contextId ?? null,
    contextType: raw.contextType ?? null,
    lastMessage: raw.lastMessage ?? raw.messages?.[0]?.body ?? null,
    lastMessageAt: raw.lastMessageAt ?? null,
    unreadCount:
      raw.unreadCount ??
      (isFirstParticipant
        ? (raw.unreadCountUser1 ?? 0)
        : isSecondParticipant
          ? (raw.unreadCountUser2 ?? 0)
          : (raw.unreadCountUser1 ?? 0) + (raw.unreadCountUser2 ?? 0)),
    status: raw.status ?? 'ACTIVE',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
    partner: normalizeParticipant(partner),
    assignedStaffId: raw.assignedStaffId ?? null,
    assignedStaff: raw.assignedStaff ? normalizeParticipant(raw.assignedStaff) : null,
    ...(typeof raw.waitingTimeSeconds === 'number'
      ? { waitingTimeSeconds: raw.waitingTimeSeconds }
      : {}),
  };
}

export function normalizeChatMessage(
  value: unknown,
  userId = getStoredUser()?.id ?? '',
): ChatMessage {
  const raw = value as RawChatMessage;
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.filter((attachment): attachment is string => typeof attachment === 'string')
    : [];
  const senderId = raw.senderId ?? raw.sender?.id ?? '';

  return {
    id: raw.id ?? '',
    conversationId: raw.conversationId ?? '',
    senderId,
    senderName: raw.senderName ?? raw.sender?.fullName ?? raw.sender?.email ?? '',
    senderAvatar: raw.senderAvatar ?? raw.sender?.avatarUrl ?? null,
    senderRole: raw.senderRole ?? raw.sender?.role ?? undefined,
    body: raw.body ?? raw.content ?? '',
    attachments,
    isRead: raw.isRead ?? false,
    readAt: raw.readAt ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    isMe:
      raw.isMe ??
      (senderId === userId ||
        (getStoredUser()?.role === 'SUPPORT_STAFF' && raw.sender?.role === 'SUPPORT_STAFF')),
  };
}

//Create a conversation or reopen an existing one with another user.
export async function createChatConversation(
  body: CreateChatConversation,
): Promise<ChatConversation> {
  const result = await chatRequest<unknown>({
    method: 'POST',
    url: '/chat/conversations',
    data: body,
  });
  return normalizeConversation(result);
}

// Submit a support request; the backend chooses or queues the responsible staff member.
export async function requestChatSupport(body: RequestChatSupport): Promise<ChatConversation> {
  const result = await chatRequest<unknown>({
    method: 'POST',
    url: '/chat/request-support',
    data: body,
  });
  return normalizeConversation(result);
}

// Retrieve or initialize the single unique dispute conversation.
export async function getDisputeChatConversation(disputeId: string): Promise<ChatConversation> {
  const result = await chatRequest<unknown>({
    method: 'POST',
    url: `/chat/disputes/${encodeURIComponent(disputeId)}/conversation`,
  });
  return normalizeConversation(result);
}

// Retrieve open support tickets waiting for a staff member.
export async function getChatSupportQueue(
  params: {
    page?: number;
    limit?: number;
    contextType?: string;
  } = {},
): Promise<ChatSupportQueue> {
  const result = await chatRequest<{
    items: unknown[];
    onlineStaffCount: number;
    pagination: ChatConversationList['pagination'];
  }>({ method: 'GET', url: '/chat/queue', params });
  return {
    ...result,
    items: (result.items ?? []).map((conversation) => normalizeConversation(conversation)),
  };
}

// Claim a ticket from the support queue.
export async function claimChatConversation(id: string): Promise<ChatConversation> {
  const result = await chatRequest<unknown>({
    method: 'POST',
    url: `${conversationPath(id)}/claim`,
  });
  return normalizeConversation(result);
}

// Update the lifecycle status of an assigned support ticket.
export async function updateChatConversationStatus(
  id: string,
  status: SupportConversationStatus,
): Promise<ChatConversation> {
  const result = await chatRequest<unknown>({
    method: 'PATCH',
    url: `${conversationPath(id)}/status`,
    data: { status },
  });
  return normalizeConversation(result);
}

//Retrieve conversations with search and pagination support.
export async function getChatConversations(
  params: ChatConversationQuery = {},
): Promise<ChatConversationList> {
  const result = await chatRequest<{
    items: unknown[];
    pagination: ChatConversationList['pagination'];
  }>({ method: 'GET', url: '/chat/conversations', params });
  return {
    ...result,
    items: (result.items ?? []).map((conversation) => normalizeConversation(conversation)),
  };
}
//Retrieve details of a specific conversation.
export async function getChatConversation(id: string): Promise<ChatConversation> {
  const result = await chatRequest<unknown>(
    {
      method: 'GET',
      url: conversationPath(id),
    },
    true,
  );
  return normalizeConversation(result);
}
//Retrieve message history; use before to load older messages.
export async function getChatMessages(
  id: string,
  params: ChatMessageQuery = {},
): Promise<ChatMessageList> {
  const result = await chatRequest<{
    conversationId: string;
    count: number;
    limit?: number;
    messages: unknown[];
  }>({ method: 'GET', url: `${conversationPath(id)}/messages`, params }, true);
  return {
    conversationId: result.conversationId,
    count: result.count,
    limit: result.limit ?? params.limit ?? 50,
    messages: (result.messages ?? []).map((message) => normalizeChatMessage(message)),
  };
}
//Send a message with optional attachment URLs.
export async function sendChatMessage(id: string, body: SendChatMessage): Promise<ChatMessage> {
  const result = await chatRequest<unknown>({
    method: 'POST',
    url: `${conversationPath(id)}/messages`,
    data: body,
  });
  return normalizeChatMessage(result);
}
//Mark messages in a conversation as read.
export function markChatAsRead(id: string): Promise<ChatReadResult> {
  return chatRequest({ method: 'PATCH', url: `${conversationPath(id)}/read` });
}
// Retrieve the total unread message count for the chat badge.
export async function getChatUnreadCount(): Promise<number> {
  const result = await chatRequest<{ unreadCount: number }>({
    method: 'GET',
    url: '/chat/unread-count',
  });
  return result.unreadCount;
}

// Upload up to 5 image attachments to Cloudinary.
export async function uploadChatAttachments(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.slice(0, 5).forEach((file) => formData.append('files', file));
  const result = await chatRequest<{ urls: string[] }>({
    method: 'POST',
    url: '/chat/upload',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return result.urls ?? [];
}
