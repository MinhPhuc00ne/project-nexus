import { z } from 'zod';

/**
 * Standard response envelope metadata returned by all HTTP endpoints.
 */
export const ApiResponseMetaSchema = z.object({
  requestId: z.string(),
  timestamp: z.iso.datetime(),
});

export type ApiResponseMeta = z.infer<typeof ApiResponseMetaSchema>;

/**
 * Builds a standard HTTP success envelope schema wrapping `dataSchema`.
 * Note: Do not attach `.transform()` to response schemas used with `@ApiOkResponse({ standardSchema })`.
 */
export function createApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ApiResponseMetaSchema,
  });
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}
