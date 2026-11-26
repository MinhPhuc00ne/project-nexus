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
    JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().min(1).default('15m')),
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

    // Every external dependency is chosen by name, never inferred. A missing
    // key used to make the service quietly swap in a stub, which is how a
    // deployment could look healthy while sending no email and charging no
    // card. Local and demo runs opt into the stubs explicitly.
    PAYMENT_PROVIDER: z.preprocess(
      emptyToUndefined,
      z.enum(['payos', 'sandbox']).default('sandbox'),
    ),
    SHIPPING_PROVIDER: z.preprocess(
      emptyToUndefined,
      z.enum(['ghn', 'sandbox']).default('sandbox'),
    ),
    STORAGE_PROVIDER: z.preprocess(
      emptyToUndefined,
      z.enum(['cloudinary', 'local']).default('local'),
    ),
    MAIL_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['smtp', 'console']).default('console')),

    PAYOS_CLIENT_ID: optionalNonEmptyString(),
    PAYOS_API_KEY: optionalNonEmptyString(),
    PAYOS_CHECKSUM_KEY: optionalNonEmptyString(),

    GHN_API_URL: optionalNonEmptyString(),
    GHN_TOKEN: optionalNonEmptyString(),
    GHN_SHOP_ID: optionalNonEmptyString(),
    GHN_WEBHOOK_SECRET: optionalNonEmptyString(),

    CLOUDINARY_CLOUD_NAME: optionalNonEmptyString(),
    CLOUDINARY_API_KEY: optionalNonEmptyString(),
    CLOUDINARY_API_SECRET: optionalNonEmptyString(),

    SMTP_HOST: optionalNonEmptyString(),
    SMTP_USER: optionalNonEmptyString(),
    SMTP_PASS: optionalNonEmptyString(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.APP_PUBLIC_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_PUBLIC_URL'],
        message: 'APP_PUBLIC_URL is required when NODE_ENV is production',
      });
    }

    // Production never runs on a stub. Naming one is treated as a
    // misconfiguration rather than silently accepted.
    if (env.NODE_ENV === 'production') {
      const stubs: Array<[string, string, string]> = [
        ['PAYMENT_PROVIDER', env.PAYMENT_PROVIDER, 'sandbox'],
        ['SHIPPING_PROVIDER', env.SHIPPING_PROVIDER, 'sandbox'],
        ['STORAGE_PROVIDER', env.STORAGE_PROVIDER, 'local'],
        ['MAIL_PROVIDER', env.MAIL_PROVIDER, 'console'],
      ];
      for (const [name, value, stub] of stubs) {
        if (value === stub) {
          ctx.addIssue({
            code: 'custom',
            path: [name],
            message: `${name} cannot be "${stub}" when NODE_ENV is production`,
          });
        }
      }
    }

    // A real provider needs its credentials up front, so the failure happens
    // at boot rather than on the first customer request.
    const requirements: Array<[boolean, Array<[string, string | undefined]>]> = [
      [
        env.PAYMENT_PROVIDER === 'payos',
        [
          ['PAYOS_CLIENT_ID', env.PAYOS_CLIENT_ID],
          ['PAYOS_API_KEY', env.PAYOS_API_KEY],
          ['PAYOS_CHECKSUM_KEY', env.PAYOS_CHECKSUM_KEY],
        ],
      ],
      [
        env.SHIPPING_PROVIDER === 'ghn',
        [
          ['GHN_API_URL', env.GHN_API_URL],
          ['GHN_TOKEN', env.GHN_TOKEN],
          ['GHN_SHOP_ID', env.GHN_SHOP_ID],
          ['GHN_WEBHOOK_SECRET', env.GHN_WEBHOOK_SECRET],
        ],
      ],
      [
        env.STORAGE_PROVIDER === 'cloudinary',
        [
          ['CLOUDINARY_CLOUD_NAME', env.CLOUDINARY_CLOUD_NAME],
          ['CLOUDINARY_API_KEY', env.CLOUDINARY_API_KEY],
          ['CLOUDINARY_API_SECRET', env.CLOUDINARY_API_SECRET],
        ],
      ],
      [
        env.MAIL_PROVIDER === 'smtp',
        [
          ['SMTP_HOST', env.SMTP_HOST],
          ['SMTP_USER', env.SMTP_USER],
          ['SMTP_PASS', env.SMTP_PASS],
        ],
      ],
    ];
    for (const [selected, keys] of requirements) {
      if (!selected) continue;
      for (const [name, value] of keys) {
        if (!value) {
          ctx.addIssue({
            code: 'custom',
            path: [name],
            message: `${name} is required by the selected provider`,
          });
        }
      }
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
