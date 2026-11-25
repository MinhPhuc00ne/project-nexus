import { z } from 'zod';

/** Places the supplied banners first, followed by the remaining banners. */
const reorderBannersFields = {
  bannerIds: z
    .array(z.uuid())
    .min(1)
    .max(100)
    .describe('Banner UUIDs in display order; omitted banners follow with priority zero.'),
};

/**
 * A new display order for the banners named.
 *
 * The ids must be distinct: the same banner listed twice would be given two
 * priorities and the last write would win silently.
 */
export const ReorderBannersSchema = z
  .object(reorderBannersFields)
  .strict()
  .refine((value) => new Set(value.bannerIds).size === value.bannerIds.length, {
    path: ['bannerIds'],
    message: 'bannerIds must not repeat a banner',
  });

export type ReorderBannersInput = z.infer<typeof ReorderBannersSchema>;
