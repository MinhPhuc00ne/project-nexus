export type ChatConversationType =
  'BUYER_SELLER' | 'STAFF_SELLER' | 'STAFF_BUYER' | 'SUPPORT_TICKET' | 'GENERAL';

export interface ChatParticipant {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  storeName?: string | null;
}

export interface ChatConversation {
  id: string;
  type: ChatConversationType;
  title: string | null;
  contextId: string | null;
  contextType: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  partner: ChatParticipant;
  assignedStaffId?: string | null;
  assignedStaff?: ChatParticipant | null;
  waitingTimeSeconds?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar: string | null;
  senderRole?: string;
  body: string;
  attachments: string[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  isMe: boolean;
}

export interface CreateChatConversation {
  participantId: string;
  type?: ChatConversationType;
  title?: string;
  contextId?: string;
  contextType?: 'ORDER' | 'PRODUCT' | 'DISPUTE' | 'TICKET';
  initialMessage?: string;
}

export interface ChatConversationQuery {
  page?: number;
  limit?: number;
  type?: ChatConversationType;
  search?: string;
}

export interface ChatConversationList {
  items: ChatConversation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ChatMessageQuery {
  limit?: number;
  before?: string;
}

export interface ChatMessageList {
  conversationId: string;
  limit: number;
  count: number;
  messages: ChatMessage[];
}

export interface SendChatMessage {
  body: string;
  attachments?: string[];
}

export interface ChatReadResult {
  success: boolean;
  conversationId: string;
  message: string;
}

export interface RequestChatSupport {
  subject?: string;
  message: string;
  contextId?: string;
  contextType?: 'ORDER' | 'GENERAL';
  attachments?: string[];
}

export interface ChatSupportQueue {
  items: ChatConversation[];
  onlineStaffCount: number;
  pagination: ChatConversationList['pagination'];
}

export type SupportConversationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
