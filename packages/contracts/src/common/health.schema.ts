import { z } from 'zod';

/**
 * Operational health state for the service and individual dependencies.
 */
export const HealthStatusSchema = z.enum(['ok', 'degraded', 'down']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * Individual dependency probe status (PostgreSQL, Redis, etc.).
 */
export const DependencyHealthSchema = z.object({
  status: HealthStatusSchema,
  latencyMs: z.number().nonnegative().optional(),
  message: z.string().optional(),
});
export type DependencyHealth = z.infer<typeof DependencyHealthSchema>;

/**
 * Health check response contract returned by `GET /api/v1/health`.
 */
export const HealthCheckSchema = z.object({
  status: HealthStatusSchema,
  db: DependencyHealthSchema,
  redis: DependencyHealthSchema,
  sockets: z.object({
    connectedClients: z.number().int().nonnegative(),
  }),
  outbox: z.object({
    pendingCount: z.number().int().nonnegative(),
  }),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
