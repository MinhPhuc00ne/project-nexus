import { z } from 'zod';
import { ApiResponseMetaSchema } from './api-response.schema.js';

/**
 * Structured application error detail payload.
 */
export const AppErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type AppErrorDetail = z.infer<typeof AppErrorDetailSchema>;

/**
 * Standard HTTP error envelope returned by GlobalHttpExceptionFilter.
 */
export const AppErrorSchema = z.object({
  success: z.literal(false),
  error: AppErrorDetailSchema,
  meta: ApiResponseMetaSchema,
});

export type AppError = z.infer<typeof AppErrorSchema>;
