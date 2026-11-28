import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ChatContextType, ChatConversationStatus } from '@prisma/client';

/**
 * The ticket lifecycle is the conversation status column, re-exported under its
 * domain name so controllers and the Swagger schema stay readable.
 */
export const TicketLifecycleStatus = ChatConversationStatus;
export type TicketLifecycleStatus = ChatConversationStatus;

const requestSupportFields = {
  subject: nullAsAbsent(
    z
      .string()
      .max(200)
      .describe('Short summary subject for the support request')
      .meta({ example: 'Order not received dispute' }),
  ),
  message: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe('Detailed support request message sent to Support Staff')
    .meta({
      example: 'I paid for order #ORD-123 but the seller has not shipped it on time.',
    }),
  contextId: nullAsAbsent(
    z
      .string()
      .describe('Related context identifier (dispute ID, order ID)')
      .meta({ example: 'dispute-uuid-456' }),
  ),
  contextType: z
    .enum(ChatContextType)
    .describe('Context type: DISPUTE, ORDER, or GENERAL')
    .meta({ example: ChatContextType.DISPUTE })
    .default(ChatContextType.GENERAL),
  attachments: nullAsAbsent(
    z
      .array(z.string())
      .describe('List of evidence image or document URLs')
      .meta({ example: ['https://res.cloudinary.com/nexus/evidence1.jpg'] }),
  ),
};

export const RequestSupportSchema = z.object(requestSupportFields).strict();

export type RequestSupportInput = z.infer<typeof RequestSupportSchema>;

const updateConversationStatusFields = {
  status: z
    .enum(TicketLifecycleStatus)
    .describe('New status of the support conversation or ticket')
    .meta({ example: TicketLifecycleStatus.RESOLVED }),
  resolutionNotes: nullAsAbsent(
    z
      .string()
      .max(1000)
      .describe('Resolution notes or reason for closing the conversation')
      .meta({ example: 'Refunded the buyer successfully.' }),
  ),
};

export const UpdateConversationStatusSchema = z.object(updateConversationStatusFields).strict();

export type UpdateConversationStatusInput = z.infer<typeof UpdateConversationStatusSchema>;

const queryQueueFields = {
  page: z.coerce.number().int().min(1).describe('Current page (1-based)').default(1),
  limit: z.coerce.number().int().min(1).describe('Requests per page').default(20),
  contextType: nullAsAbsent(z.string().describe('Filter by context type: DISPUTE, ORDER, GENERAL')),
};

export const QueryQueueSchema = z.object(queryQueueFields).strict();

export type QueryQueueInput = z.infer<typeof QueryQueueSchema>;
