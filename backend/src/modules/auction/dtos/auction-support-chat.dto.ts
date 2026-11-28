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
      example: 'Please help verify eligibility and the 30% deposit process for lot #1.',
    }),
};

export const AuctionSupportChatSchema = z.object(auctionSupportChatFields).strict();

export type AuctionSupportChatInput = z.infer<typeof AuctionSupportChatSchema>;
