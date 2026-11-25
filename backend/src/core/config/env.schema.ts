import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
};

const optionalNonEmptyString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());

const optionalUrlString = () => z.preprocess(emptyToUndefined, z.string().url().optional());

export const backendEnvSchema = z
  .object({
    NODE_ENV: z.preprocess(
      emptyToUndefined,
      z.enum(['development', 'test', 'production']).default('development'),
    ),
    PORT_BACKEND: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(65535).default(3000),
    ),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().trim().min(16, 'JWT_SECRET must be at least 16 characters'),
    REFRESH_TOKEN_SECRET: z
      .string()
      .trim()
      .min(16, 'REFRESH_TOKEN_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().min(1).default('7d')),
    REFRESH_TOKEN_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().min(1).default('30d')),
    FRONTEND_URL: z.preprocess(emptyToUndefined, z.string().url().default('http://localhost:5173')),
    CORS_ORIGINS: optionalNonEmptyString(),
    APP_PUBLIC_URL: optionalUrlString(),
    REDIS_URL: optionalNonEmptyString(),
    REDIS_HOST: z.preprocess(emptyToUndefined, z.string().min(1).default('localhost')),
    REDIS_PORT: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(65535).default(6379),
    ),
    REDIS_PASSWORD: optionalNonEmptyString(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.APP_PUBLIC_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_PUBLIC_URL'],
        message: 'APP_PUBLIC_URL is required when NODE_ENV is production',
      });
    }
  });

export type BackendEnv = z.infer<typeof backendEnvSchema>;

export function validateBackendEnv(config: Record<string, unknown>): BackendEnv {
  const result = backendEnvSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid backend environment configuration: ${details}`);
  }
  return result.data;
}

export function parseCorsOrigins(raw?: string, fallback = 'http://localhost:5173'): string[] {
  const source = raw?.trim() ? raw : fallback;
  return source
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function resolveAppPublicUrl(env: {
  APP_PUBLIC_URL?: string;
  NODE_ENV?: string;
  PORT_BACKEND?: number | string;
}): string {
  const explicit = env.APP_PUBLIC_URL?.trim();
  if (explicit) {
    let normalized = explicit;
    while (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('APP_PUBLIC_URL is required in production');
  }
  const port = Number(env.PORT_BACKEND) || 3000;
  return `http://localhost:${port}`;
}
