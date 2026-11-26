import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object used by Admin to create a new auction session/event.
 * Note: Real date constraint (startTime > now) is omitted per demo requirements.
 */
const adminCreateAuctionFields = {
  title: z
    .string()
    .trim()
    .min(1)
    .describe('Public title of the auction session')
    .meta({ example: 'Audemars Piguet & Swiss Luxury Watches November Session' }),
  description: nullAsAbsent(
    z.string().describe('Detailed description, guidelines, and rules of the auction session').meta({
      example:
        'Curated auction event for certified luxury timepieces and fine jewelry with authenticated certificates.',
    }),
  ),
  imageUrl: nullAsAbsent(
    z.string().describe('Public banner or avatar image URL of the auction session').meta({
      example:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
    }),
  ),
  startTime: z.iso
    .datetime()
    .describe('Scheduled start timestamp in ISO 8601 format')
    .meta({ example: '2026-11-08T20:00:00.000Z' }),
  consignmentDeadline: z.iso
    .datetime()
    .describe(
      'Consignment deadline timestamp in ISO 8601 format when seller product submissions close. Must be after startTime and before endTime.',
    )
    .meta({ example: '2026-11-08T21:00:00.000Z' }),
  endTime: z.iso
    .datetime()
    .describe('Scheduled conclusion timestamp in ISO 8601 format')
    .meta({ example: '2026-11-08T22:00:00.000Z' }),
  minBuyerReputation: z.coerce
    .number()
    .int()
    .min(0)
    .describe('Minimum buyer reputation score required to place bids')
    .meta({ example: 40 })
    .default(40),
  minSellerReputation: z.coerce
    .number()
    .int()
    .min(0)
    .describe('Minimum seller reputation score required to consign items')
    .meta({ example: 50 })
    .default(50),
};

export const AdminCreateAuctionSchema = z.object(adminCreateAuctionFields).strict();

export type AdminCreateAuctionInput = z.infer<typeof AdminCreateAuctionSchema>;
