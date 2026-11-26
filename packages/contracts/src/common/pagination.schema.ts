import { z } from 'zod';

/**
 * Standard pagination query parameters.
 * Guardrail: Never attach `.meta({ id })` so NestJS Swagger expands query parameters inline.
 */
export const PaginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginatedQuery = z.infer<typeof PaginatedQuerySchema>;

/**
 * Standard pagination metadata returned inside paginated responses.
 */
export const PaginationMetaSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Builds a standard paginated list payload schema (`{ items, meta }`).
 * Note: Do not attach `.transform()` to response schemas used with `@ApiOkResponse({ standardSchema })`.
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
