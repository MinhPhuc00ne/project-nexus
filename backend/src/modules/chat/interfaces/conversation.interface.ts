export type ConversationType = 'STAFF_SELLER' | 'SELLER_BUYER';
export type UserRole = 'BUYER' | 'SELLER' | 'STAFF' | 'ADMIN';

export interface IConversation {
  id: string;
  type: ConversationType;
  buyerId?: string;
  sellerId: string;
  staffId?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
