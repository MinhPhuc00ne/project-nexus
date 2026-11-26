import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object used by Admin to update an upcoming auction session.
 */
const adminUpdateAuctionFields = {
  title: nullAsAbsent(
    z
      .string()
      .describe('Updated title of the auction session')
      .meta({ example: 'Audemars Piguet & Swiss Luxury Watches Session (Updated)' }),
  ),
  description: nullAsAbsent(z.string().describe('Updated session rules and description')),
  imageUrl: nullAsAbsent(
    z.string().describe('Updated public banner or avatar image URL of the auction session').meta({
      example:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
    }),
  ),
  startTime: nullAsAbsent(
    z.iso
      .datetime()
      .describe('Updated start timestamp in ISO 8601 format')
      .meta({ example: '2026-11-08T20:30:00.000Z' }),
  ),
  consignmentDeadline: nullAsAbsent(
    z.iso
      .datetime()
      .describe(
        'Updated consignment deadline timestamp in ISO 8601 format when seller product submissions close. Must be after startTime and before endTime.',
      )
      .meta({ example: '2026-11-08T21:15:00.000Z' }),
  ),
  endTime: nullAsAbsent(
    z.iso
      .datetime()
      .describe('Updated conclusion timestamp in ISO 8601 format')
      .meta({ example: '2026-11-08T23:00:00.000Z' }),
  ),
  minBuyerReputation: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(0)
      .describe('Updated minimum buyer reputation score required to place bids')
      .meta({ example: 40 }),
  ),
  minSellerReputation: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(0)
      .describe('Updated minimum seller reputation score required to consign items')
      .meta({ example: 50 }),
  ),
};

export const AdminUpdateAuctionSchema = z.object(adminUpdateAuctionFields).strict();

export type AdminUpdateAuctionInput = z.infer<typeof AdminUpdateAuctionSchema>;
