export const OPEN_CHAT_WITH_USER_EVENT = 'nexus:open-chat-with-user';
export const OPEN_CHAT_CONVERSATION_EVENT = 'nexus:open-chat-conversation';

export interface OpenChatWithUserRequest {
  userId: string;
  userName?: string;
}

export function openChatWithUser(request: OpenChatWithUserRequest): void {
  window.dispatchEvent(
    new CustomEvent<OpenChatWithUserRequest>(OPEN_CHAT_WITH_USER_EVENT, { detail: request }),
  );
}

export function openChatConversation(conversationId: string): void {
  window.dispatchEvent(
    new CustomEvent<{ conversationId: string }>(OPEN_CHAT_CONVERSATION_EVENT, {
      detail: { conversationId },
    }),
  );
}
