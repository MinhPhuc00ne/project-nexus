import { adminRequest } from '@/features/admin/services/adminRequest';
import type {
  AdminAutoReply,
  AdminAutoReplyHistory,
  AdminAutoReplyPage,
  AdminAutoReplyQuery,
  AdminChatAuditPage,
  AdminChatConversationPage,
  CreateSystemAutoReplyDto,
} from '@/features/admin/types/admin-chat.types';

export function listAdminAutoReplies(
  params: AdminAutoReplyQuery,
  signal?: AbortSignal,
): Promise<AdminAutoReplyPage> {
  return adminRequest({ url: '/admin/chat/auto-replies', method: 'GET', params, signal });
}

export function createSystemAutoReply(
  dto: CreateSystemAutoReplyDto,
): Promise<{ message: string; data: AdminAutoReply }> {
  return adminRequest({ url: '/admin/chat/auto-replies/system', method: 'POST', data: dto });
}

export function cancelSellerAutoReply(
  id: string,
  cancelReason: string,
): Promise<{ message: string; data: AdminAutoReply }> {
  return adminRequest({
    url: `/admin/chat/auto-replies/${encodeURIComponent(id)}/cancel`,
    method: 'PATCH',
    data: { cancelReason },
  });
}

export function getAdminAutoReplyHistory(
  id: string,
  signal?: AbortSignal,
): Promise<{ data: AdminAutoReplyHistory }> {
  return adminRequest({
    url: `/admin/chat/auto-replies/${encodeURIComponent(id)}/history`,
    method: 'GET',
    signal,
  });
}

export function listAdminChatConversations(
  params: { page?: number; limit?: number; type?: string; search?: string },
  signal?: AbortSignal,
): Promise<AdminChatConversationPage> {
  return adminRequest({ url: '/chat/conversations', method: 'GET', params, signal });
}

export function auditAdminChatConversation(
  id: string,
  params: { limit?: number; before?: string } = {},
  signal?: AbortSignal,
): Promise<{ message: string; data: AdminChatAuditPage }> {
  return adminRequest({
    url: `/admin/chat/conversations/${encodeURIComponent(id)}/audit`,
    method: 'GET',
    params,
    signal,
  });
}
