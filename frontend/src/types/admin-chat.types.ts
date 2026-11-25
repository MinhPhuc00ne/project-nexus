export type AdminAutoReplyScope = 'SYSTEM' | 'SHOP';
export type AdminAutoReplyStatus = 'ACTIVE' | 'CANCELLED_BY_ADMIN';
export type AdminAutoReplyTrigger = 'WELCOME' | 'OFFLINE' | 'KEYWORD' | 'DEFAULT';

export interface AdminAutoReply {
  id: string;
  scope: AdminAutoReplyScope;
  shopId: string | null;
  name: string | null;
  triggerType: AdminAutoReplyTrigger;
  keyword: string | null;
  content: string;
  isActive: boolean;
  status: AdminAutoReplyStatus;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: { id: string; fullName: string; email: string; shopAvatarUrl?: string | null } | null;
  cancelledByUser?: { id: string; fullName: string; email: string } | null;
}

export interface AdminAutoReplyPage {
  items: AdminAutoReply[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminAutoReplyQuery {
  page?: number;
  limit?: number;
  scope?: AdminAutoReplyScope;
  status?: AdminAutoReplyStatus;
  shopId?: string;
}

export interface CreateSystemAutoReplyDto {
  name?: string;
  triggerType: AdminAutoReplyTrigger;
  keyword?: string;
  content: string;
  isActive: boolean;
}

export interface AdminChatParticipant {
  id: string;
  fullName: string;
  email?: string | null;
  role?: string;
  avatarUrl?: string | null;
}

export interface AdminChatConversation {
  id: string;
  type: string;
  title?: string | null;
  status: string;
  updatedAt: string;
  lastMessage?: string | null;
  participant1?: AdminChatParticipant | null;
  participant2?: AdminChatParticipant | null;
  assignedStaff?: AdminChatParticipant | null;
}

export interface AdminChatConversationPage {
  items: AdminChatConversation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminChatAuditMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender: AdminChatParticipant | null;
  body: string;
  attachments: string[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface AdminChatAuditPage {
  conversationId: string;
  count: number;
  messages: AdminChatAuditMessage[];
}

export interface AdminAutoReplyHistory {
  id: string;
  name: string | null;
  content: string;
  status: AdminAutoReplyStatus;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledBy: { id: string; fullName: string; email: string } | null;
  shop: { id: string; fullName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
