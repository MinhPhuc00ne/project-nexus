import { BannerCreatorRole, Role } from '@prisma/client';
import { z } from 'zod';

export const BannerCreatorSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  role: z.enum(Role),
});

export type BannerCreatorDto = z.infer<typeof BannerCreatorSchema>;

export const BannerResponseSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    imageUrl: z.string(),
    targetUrl: z
      .string()
      .nullable()
      .meta({ example: '/auction/00000000-0000-4000-8000-000000000001' }),
    auctionId: z.uuid().nullable(),
    creatorRole: z
      .enum(BannerCreatorRole)
      .describe('Immutable role group at creation; ADMIN precedes STAFF when priorities match'),
    startsAt: z.iso.datetime().nullable(),
    endsAt: z.iso.datetime().nullable(),
    isActive: z.boolean(),
    priority: z.number().describe('Higher priorities appear first'),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    creatorId: z.uuid().optional(),
    creator: BannerCreatorSchema.optional(),
  })
  .meta({ id: 'BannerResponseDto' });

export type BannerResponseDto = Omit<
  z.infer<typeof BannerResponseSchema>,
  'startsAt' | 'endsAt' | 'createdAt' | 'updatedAt'
> & {
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export const BannerDisabledSchema = z.object({
  success: z.literal(true).meta({ example: true }),
});

export type BannerDisabledDto = z.infer<typeof BannerDisabledSchema>;
