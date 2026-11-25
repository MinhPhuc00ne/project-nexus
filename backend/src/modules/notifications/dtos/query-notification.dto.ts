import { z } from 'zod';
import { booleanFromQuery, nullAsAbsent } from '../../../core/validation/query-schemas';
import { NotificationType } from '@prisma/client';

const queryNotificationFields = {
  page: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Page number (default: 1)').meta({ example: 1 }),
  ),
  limit: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .describe('Number of notifications per page (default: 10, max: 50)')
      .meta({ example: 10 }),
  ),
  isRead: nullAsAbsent(
    booleanFromQuery
      .describe('Filter by read status (true = read, false = unread)')
      .meta({ example: false }),
  ),
  type: nullAsAbsent(
    z
      .enum(NotificationType)
      .describe(
        'Optional filter by notification category (SYSTEM, AUCTION, PAYMENT, DISPUTE, ORDER)',
      ),
  ),
};

export const QueryNotificationSchema = z.object(queryNotificationFields).strict();

export type QueryNotificationInput = z.infer<typeof QueryNotificationSchema>;
