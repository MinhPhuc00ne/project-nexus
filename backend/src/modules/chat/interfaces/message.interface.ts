import { UserRole } from './conversation.interface';

export type MessageType = 'TEXT' | 'IMAGE';

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: Date;
}
