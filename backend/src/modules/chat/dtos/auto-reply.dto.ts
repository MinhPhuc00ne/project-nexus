import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ChatAutoReplyScope, ChatAutoReplyStatus, ChatAutoReplyTriggerType } from '@prisma/client';

const createAutoReplyFields = {
  name: nullAsAbsent(
    z.string().max(100).describe('Auto-reply template name').meta({ example: 'Welcome greeting' }),
  ),
  triggerType: z
    .enum(ChatAutoReplyTriggerType)
    .describe('Trigger type: WELCOME (first message), OFFLINE (after hours), KEYWORD, DEFAULT')
    .default(ChatAutoReplyTriggerType.WELCOME),
  keyword: nullAsAbsent(
    z
      .string()
      .max(100)
      .describe('Trigger keyword (when triggerType is KEYWORD)')
      .meta({ example: 'warranty' }),
  ),
  content: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe('Auto-reply message content sent to customers')
    .meta({
      example: 'Hello! Thank you for messaging our shop. We will reply shortly.',
    }),
  isActive: z.boolean().describe('Active state (defaults to true)').default(true),
};

export const CreateAutoReplySchema = z.object(createAutoReplyFields).strict();

export type CreateAutoReplyInput = z.infer<typeof CreateAutoReplySchema>;

const updateAutoReplyFields = {
  name: nullAsAbsent(z.string().max(100).describe('Auto-reply template name')),
  triggerType: nullAsAbsent(
    z.enum(ChatAutoReplyTriggerType).describe('Trigger type: WELCOME, OFFLINE, KEYWORD, DEFAULT'),
  ),
  keyword: nullAsAbsent(z.string().max(100).describe('Trigger keyword')),
  content: nullAsAbsent(z.string().max(1000).describe('Auto-reply message content')),
  isActive: nullAsAbsent(z.boolean().describe('Active state')),
};

export const UpdateAutoReplySchema = z.object(updateAutoReplyFields).strict();

export type UpdateAutoReplyInput = z.infer<typeof UpdateAutoReplySchema>;

const cancelAutoReplyFields = {
  cancelReason: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe('Reason for Admin canceling or locking the seller auto-reply')
    .meta({ example: 'Content contains misleading claims or violates platform policy.' }),
};

export const CancelAutoReplySchema = z.object(cancelAutoReplyFields).strict();

export type CancelAutoReplyInput = z.infer<typeof CancelAutoReplySchema>;

const queryAutoRepliesFields = {
  page: z.coerce.number().int().min(1).describe('Current page (1-based)').default(1),
  limit: z.coerce.number().int().min(1).describe('Items per page').default(20),
  scope: nullAsAbsent(
    z.enum(ChatAutoReplyScope).describe('Scope: SYSTEM (platform/staff) or SHOP (seller)'),
  ),
  status: nullAsAbsent(
    z.enum(ChatAutoReplyStatus).describe('Status: ACTIVE or CANCELLED_BY_ADMIN'),
  ),
  shopId: nullAsAbsent(z.string().describe('Specific shop or seller ID filter (Admin)')),
};

export const QueryAutoRepliesSchema = z.object(queryAutoRepliesFields).strict();

export type QueryAutoRepliesInput = z.infer<typeof QueryAutoRepliesSchema>;
