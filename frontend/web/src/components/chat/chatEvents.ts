export const OPEN_CHAT_WITH_USER_EVENT = 'nexus:open-chat-with-user';

export interface OpenChatWithUserRequest {
  userId: string;
  userName?: string;
}

export function openChatWithUser(request: OpenChatWithUserRequest): void {
  window.dispatchEvent(
    new CustomEvent<OpenChatWithUserRequest>(OPEN_CHAT_WITH_USER_EVENT, { detail: request }),
  );
}
