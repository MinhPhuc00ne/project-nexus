import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { BannerCreatorRole, Role } from '@prisma/client';

/** Bounded audit filters shared by all authorized administrators and support staff. */
const queryBannerHistoryFields = {
  bannerId: nullAsAbsent(z.uuid()),
  actorId: nullAsAbsent(z.uuid().describe('Account that disabled the banner')),
  from: nullAsAbsent(z.iso.datetime().describe('Inclusive lower timestamp')),
  to: nullAsAbsent(z.iso.datetime().describe('Inclusive upper timestamp')),
  page: z.coerce.number().int().min(1).max(21474836).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const QueryBannerHistorySchema = z.object(queryBannerHistoryFields).strict();

export type QueryBannerHistoryInput = z.infer<typeof QueryBannerHistorySchema>;

export const BannerDisableHistorySchema = z.object({
  id: z.uuid(),
  bannerId: z.uuid(),
  bannerTitle: z.string(),
  creatorId: z.uuid(),
  creatorName: z.string(),
  creatorRole: z.enum(BannerCreatorRole),
  actorId: z.uuid(),
  actorName: z.string(),
  actorRole: z.enum(Role),
  source: z.enum(['UPDATE', 'DELETE', 'DISABLE']),
  wasActive: z.boolean().meta({ example: true }),
  isActive: z.boolean().meta({ example: false }),
  createdAt: z.iso.datetime(),
});

export type BannerDisableHistoryDto = Omit<
  z.infer<typeof BannerDisableHistorySchema>,
  'createdAt' | 'source'
> & {
  source: string;
  createdAt: Date | string;
};

export const BannerHistoryPageSchema = z.object({
  items: z.array(BannerDisableHistorySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type BannerHistoryPageDto = {
  items: BannerDisableHistoryDto[];
  total: number;
  page: number;
  limit: number;
};
