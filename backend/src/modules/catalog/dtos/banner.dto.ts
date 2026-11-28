import { z } from 'zod';
import { httpUrl, nullAsAbsent } from '../../../core/validation/query-schemas';
import { isAuctionTargetUrl } from '../../../core/navigation/auction-navigation';

/** Validated banner content; creator attribution is always supplied by the server. */
const bannerFields = {
  title: z.string().trim().min(2).max(150).meta({ example: 'November Promotion' }),
  imageUrl: httpUrl.meta({ example: 'https://example.com/banner.png' }),
  /**
   * Where the banner sends a visitor.
   *
   * Either an absolute http(s) link or one of this app's own canonical auction
   * routes, which is why it is not simply a URL: `/auction/<id>` has no scheme.
   * The class said this with a hand-written `@ValidateBy` validator.
   */
  targetUrl: z
    .string()
    .refine((value) => isAuctionTargetUrl(value) || httpUrl.safeParse(value).success, {
      message: 'targetUrl must be an HTTP(S) URL or a canonical auction route',
    })
    .nullable()
    .optional()
    .describe('HTTP(S) destination or canonical relative /auction/:uuid route'),
  auctionId: nullAsAbsent(
    z
      .uuid()
      .nullable()
      .describe('Linked auction. The server supplies /auction/:id as targetUrl when present.'),
  ),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  isActive: z.boolean().default(true),
  priority: z
    .number()
    .int()
    .min(-1000)
    .max(1000)
    .describe(
      'Higher priorities appear first. Equal priorities use creator group and creation time.',
    )
    .default(0),
};

export const BannerSchema = z.object(bannerFields).strict();

export type BannerInput = z.infer<typeof BannerSchema>;
