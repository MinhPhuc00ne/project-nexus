import { z } from 'zod';

/**
 * Data transfer object for requesting live Support Staff assistance inside an auction room.
 */
const auctionSupportChatFields = {
  message: z
    .string()
    .trim()
    .min(1)
    .max(1500)
    .describe('Initial question or support message sent to Support Staff')
    .meta({
      example: 'Xin hỗ trợ kiểm tra điều kiện tham gia và quy trình đặt cọc 30% của lô #1.',
    }),
};

export const AuctionSupportChatSchema = z.object(auctionSupportChatFields).strict();

export type AuctionSupportChatInput = z.infer<typeof AuctionSupportChatSchema>;
