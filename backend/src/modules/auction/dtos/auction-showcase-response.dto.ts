import { AuctionStatus } from '@prisma/client';
import { z } from 'zod';

export const AuctionShowcaseSellerSchema = z.object({
  id: z.string().meta({ example: '7b52c1b0-4e1a-4f38-8d2e-9a0b12345678' }),
  fullName: z.string().meta({ example: 'Huy Luxury Timepieces' }),
  avatarUrl: z.string().nullable().optional(),
  shopAvatarUrl: z.string().nullable().optional(),
});

export type AuctionShowcaseSellerDto = z.infer<typeof AuctionShowcaseSellerSchema>;

export const AuctionShowcaseItemSchema = z.object({
  id: z.string().meta({ example: 'd18d71c0-3b2a-4c6f-a51b-1f2e3d4c5b6a' }),
  title: z.string().meta({ example: 'Patek Philippe Calatrava Skeleton 18K' }),
  description: z
    .string()
    .meta({ example: 'Handcrafted 18K rose gold mechanical timepiece with box and papers.' }),
  images: z.array(z.string()),
  threeModelKey: z.string().nullable().optional().meta({ example: 'preset_watch' }),
  lotNumber: z.number().nullable().optional().meta({ example: 1 }),
  startingPrice: z
    .number()
    .describe('Official starting price (fallback to seller proposedStartingPrice)')
    .meta({ example: 350000000 }),
  proposedStartingPrice: z
    .number()
    .describe('Seller originally proposed starting price')
    .meta({ example: 350000000 }),
  reservePrice: z.number().nullable().optional().meta({ example: 420000000 }),
  proposedReservePrice: z.number().nullable().optional().meta({ example: 420000000 }),
  bidIncrement: z
    .number()
    .describe('Official bid increment (fallback to seller proposedBidIncrement)')
    .meta({ example: 5000000 }),
  proposedBidIncrement: z
    .number()
    .describe('Seller originally proposed bid increment')
    .meta({ example: 5000000 }),
  appraisalCertificateNumber: z.string().nullable().optional().meta({ example: 'GIA-2026-88412' }),
  appraisalAgency: z.string().nullable().optional().meta({ example: 'GIA Gemological Institute' }),
  certificateImages: z.array(z.string()).describe('Seller-uploaded appraisal certificate images'),
  certificateIssueDate: z
    .string()
    .nullable()
    .optional()
    .meta({ example: '2026-04-15T00:00:00.000Z' }),
  seller: AuctionShowcaseSellerSchema.optional(),
  lotStatus: z.enum(AuctionStatus).optional(),
  currentHighestBid: z.number().optional().meta({ example: 355000000 }),
  currentHighestBidderId: z.string().nullable().optional(),
  totalBidsCount: z.number().optional().meta({ example: 4 }),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
});

export type AuctionShowcaseItemDto = z.infer<typeof AuctionShowcaseItemSchema>;

export const AuctionIntroShowcaseResponseSchema = z.object({
  auctionId: z.string().meta({ example: 'a442d1a0-7f8a-4e21-9b1c-8c1e4d5f6a7b' }),
  title: z.string().meta({ example: 'NEXUS Grand Heritage Auction 2026' }),
  description: z.string().nullable().optional(),
  status: z.enum(AuctionStatus).meta({ example: AuctionStatus.ACTIVE }),
  startedAt: z.string().meta({ example: '2026-11-11T08:00:00.000Z' }),
  endTime: z.string().meta({ example: '2026-11-11T10:00:00.000Z' }),
  serverTime: z
    .string()
    .describe('Current server UTC timestamp for client clock synchronization')
    .meta({ example: '2026-11-11T08:00:05.240Z' }),
  introDurationMs: z
    .number()
    .describe('Total intro broadcast duration in milliseconds')
    .meta({ example: 31300 }),
  isIntroActive: z
    .boolean()
    .describe(
      'True while the live intro broadcast is actively airing (elapsedMs < introDurationMs)',
    )
    .meta({ example: true }),
  elapsedMs: z
    .number()
    .describe(
      'Elapsed milliseconds since startedAt (0 when not active yet, clamped to [0, introDurationMs])',
    )
    .meta({ example: 5240 }),
  items: z.array(AuctionShowcaseItemSchema),
});

export type AuctionIntroShowcaseResponseDto = z.infer<typeof AuctionIntroShowcaseResponseSchema>;
