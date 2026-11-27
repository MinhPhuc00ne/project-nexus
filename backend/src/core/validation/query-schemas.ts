import { z } from 'zod';

/**
 * The query-string idioms the modules' schemas share.
 *
 * A query string carries only text, so every non-string field needs a rule for
 * reading one. `z.coerce` is the obvious answer and the wrong one for booleans:
 * `Boolean('false')` is true, so `?isRead=false` would filter for read items.
 * The DTOs these replace each solved that with their own `@Transform`, and each
 * solved it slightly differently.
 */

/**
 * A boolean as a query string carries it.
 *
 * Accepts a real boolean (a JSON body may send one) and the two strings a query
 * string can; anything else is rejected rather than quietly read as true.
 */
export const booleanFromQuery = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
]);

/** A link that a browser can open, http or https. */
export const httpUrl = z.url({ protocol: /^https?$/ });

/** A link served over TLS only. */
export const httpsUrl = z.url({ protocol: /^https$/ });

/**
 * A list of media links that also accepts a single link.
 *
 * Clients post one URL as a bare string and several as an array, and an empty
 * string where they mean none. The DTOs normalised that in a `@Transform`
 * shared by three classes; it is the same rule, said once.
 *
 * The result is already optional, and must be: `.optional()` outside a
 * `preprocess` is checked against the input, so an empty string would reach the
 * array rule as undefined and be rejected rather than read as "none".
 *
 * @param max - How many links the field accepts.
 */
export function mediaUrlList(max: number) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Array.isArray(value) ? value : [value];
  }, z.array(httpUrl).max(max).optional());
}

/**
 * Page and page size, floored and capped.
 *
 * @param defaultLimit - The page size when the request omits one.
 * @param maxLimit - The largest page size a caller may ask for.
 */
export function pageFields(defaultLimit: number, maxLimit = 100) {
  return {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  };
}

/**
 * An optional field that also accepts null for "not given".
 *
 * `@IsOptional()` skipped validation for null as well as undefined, so clients
 * built against it send `null` for a field they are leaving out — this app's own
 * front end posts `targetUrl: null` and `proposedReservePrice: null`. Plain
 * `.optional()` accepts only undefined and would answer those with a 400.
 *
 * Null is normalised to undefined rather than kept, so the inferred type stays
 * `T | undefined` and handlers have one absent value to check instead of two.
 * A field where null means something — clear this, as opposed to leave it — is
 * `.nullable()` instead, and keeps the null.
 *
 * @param schema - The rule that applies when a value is given.
 */
export function nullAsAbsent<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === null ? undefined : value), schema.optional());
}

/** Standard paginated list query (`page` & `limit`). */
export const StandardPaginationQuerySchema = z.object({
  ...pageFields(10, 100),
});
export type StandardPaginationQuery = z.infer<typeof StandardPaginationQuerySchema>;

/** Shop detail paginated query (`limit` defaults to 20). */
export const ShopDetailPaginationQuerySchema = z.object({
  ...pageFields(20, 100),
});
export type ShopDetailPaginationQuery = z.infer<typeof ShopDetailPaginationQuerySchema>;

/** Optional positive integer `limit` query for trending endpoints. */
export const TrendingLimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type TrendingLimitQuery = z.infer<typeof TrendingLimitQuerySchema>;

/** Admin withdrawal list filter & pagination query. */
export const AdminWithdrawalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
  ...pageFields(10, 100),
});
export type AdminWithdrawalsQuery = z.infer<typeof AdminWithdrawalsQuerySchema>;

/** Admin shop orders filter & pagination query. */
export const AdminShopOrdersQuerySchema = z.object({
  status: z
    .enum([
      'PENDING_PAYMENT',
      'PAID',
      'PREPARING',
      'SHIPPING',
      'DELIVERED',
      'CONFIRMED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
  ...pageFields(10, 100),
});
export type AdminShopOrdersQuery = z.infer<typeof AdminShopOrdersQuerySchema>;

/** Auction complaint list filter query. */
export const AuctionComplaintsQuerySchema = z.object({
  auctionId: z.uuid().optional(),
  status: z.enum(['OPEN', 'ACCEPTED', 'REJECTED']).optional(),
});
export type AuctionComplaintsQuery = z.infer<typeof AuctionComplaintsQuerySchema>;

/** Optional auctionId filter query. */
export const OptionalAuctionIdQuerySchema = z.object({
  auctionId: z.uuid().optional(),
});
export type OptionalAuctionIdQuery = z.infer<typeof OptionalAuctionIdQuerySchema>;

/** Staff invitation info query. */
export const StaffInvitationQuerySchema = z.object({
  token: z.string().trim().optional(),
});
export type StaffInvitationQuery = z.infer<typeof StaffInvitationQuerySchema>;

/** GHN available services district pair query. */
export const AvailableServicesQuerySchema = z.object({
  fromDistrictId: z.coerce.number().int().positive(),
  toDistrictId: z.coerce.number().int().positive(),
});
export type AvailableServicesQuery = z.infer<typeof AvailableServicesQuerySchema>;

/** Address search query (`q`). */
export const AddressSearchQuerySchema = z.object({
  q: z.string().trim().min(1),
});
export type AddressSearchQuery = z.infer<typeof AddressSearchQuerySchema>;

/** Reverse geocoding coordinate query (`lat`, `lng`). */
export const ReverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});
export type ReverseGeocodeQuery = z.infer<typeof ReverseGeocodeQuerySchema>;
