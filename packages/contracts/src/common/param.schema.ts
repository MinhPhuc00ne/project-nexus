import { z } from 'zod';

/**
 * Shared route parameter validation schemas for NestJS 12 Standard Schema (@ZodParam).
 */
export const UuidParamSchema = z.uuid();

export const PositiveIntParamSchema = z.coerce.number().int().positive();

export const NumericCodeParamSchema = z.string().trim().regex(/^\d+$/, 'Must be a numeric code');

export const NonEmptyParamSchema = z.string().trim().min(1);
