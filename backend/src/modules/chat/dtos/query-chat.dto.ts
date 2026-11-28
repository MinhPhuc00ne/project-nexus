import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryConversationsFields = {
  page: z.coerce.number().int().min(1).describe('Current page (1-based)').default(1),
  limit: z.coerce.number().int().min(1).describe('Items per page').default(20),
  type: nullAsAbsent(
    z.string().describe('Filter by conversation type: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER'),
  ),
  search: nullAsAbsent(z.string().describe('Search by participant name or conversation title')),
};

export const QueryConversationsSchema = z.object(queryConversationsFields).strict();

export type QueryConversationsInput = z.infer<typeof QueryConversationsSchema>;

const queryMessagesFields = {
  limit: z.coerce.number().int().min(1).describe('Number of messages to fetch').default(50),
  before: nullAsAbsent(
    z.string().describe('Fetch messages before this ISO timestamp for cursor pagination'),
  ),
};

export const QueryMessagesSchema = z.object(queryMessagesFields).strict();

export type QueryMessagesInput = z.infer<typeof QueryMessagesSchema>;
