import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
};

const parseOptionalBoolean = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') {
      return undefined;
    }
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }
  return value;
};

const optionalNonEmptyString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());

const optionalUrlString = () => z.preprocess(emptyToUndefined, z.string().url().optional());

const PLACEHOLDER_PATTERN =
  /^(?:your[-_].*|changeme|replace[-_]?me|placeholder|example[-_]?key|xxx+)$/i;

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  return PLACEHOLDER_PATTERN.test(trimmed) || /^your[-_]/i.test(trimmed);
}

const baseObjectSchema = z.object({
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
  APP_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'demo', 'production']).default('development'),
  ),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).optional()),
  PORT_BACKEND: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65535).default(3000),
  ),
  SWAGGER_ENABLED: z.preprocess(parseOptionalBoolean, z.boolean().optional()),

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
  REDIS_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url()
      .refine(
        (url) => url.startsWith('redis://') || url.startsWith('rediss://'),
        'REDIS_URL must start with redis:// or rediss://',
      )
      .optional(),
  ),
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
  PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['payos', 'sandbox']).default('sandbox')),
  SHIPPING_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['ghn', 'sandbox']).default('sandbox')),
  STORAGE_PROVIDER: z.preprocess(
    emptyToUndefined,
    z.enum(['cloudinary', 'local']).default('local'),
  ),
  MAIL_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['smtp', 'console']).default('console')),

  PAYOS_CLIENT_ID: optionalNonEmptyString(),
  PAYOS_API_KEY: optionalNonEmptyString(),
  PAYOS_CHECKSUM_KEY: optionalNonEmptyString(),

  GHN_API_URL: optionalUrlString(),
  GHN_TOKEN: optionalNonEmptyString(),
  GHN_SHOP_ID: optionalNonEmptyString(),
  GHN_CLIENT_ID: optionalNonEmptyString(),
  GHN_WEBHOOK_SECRET: optionalNonEmptyString(),

  CLOUDINARY_CLOUD_NAME: optionalNonEmptyString(),
  CLOUDINARY_API_KEY: optionalNonEmptyString(),
  CLOUDINARY_API_SECRET: optionalNonEmptyString(),

  SMTP_HOST: optionalNonEmptyString(),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(587)),
  SMTP_USER: optionalNonEmptyString(),
  SMTP_PASS: optionalNonEmptyString(),
  SMTP_FROM: optionalNonEmptyString(),

  GOOGLE_CLIENT_ID: optionalNonEmptyString(),
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString(),
  GOOGLE_CALLBACK_URL: optionalUrlString(),

  CHATBOT_AI_ENABLED: z.preprocess(parseOptionalBoolean, z.boolean().default(false)),
  GEMINI_API_KEY: optionalNonEmptyString(),
  CHATBOT_GEMINI_MODEL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^gemini-[a-z0-9.-]+$/, 'CHATBOT_GEMINI_MODEL must match /^gemini-[a-z0-9.-]+$/')
      .default('gemini-3.1-flash-lite'),
  ),
});

type RawBackendEnv = z.infer<typeof baseObjectSchema>;

function addCustomIssue(ctx: z.RefinementCtx, pathKey: string, message: string): void {
  ctx.addIssue({ code: 'custom', path: [pathKey], message });
}

function validateProductionMode(env: RawBackendEnv, ctx: z.RefinementCtx): void {
  if (env.APP_ENV !== 'production') return;

  if (!env.APP_PUBLIC_URL) {
    addCustomIssue(ctx, 'APP_PUBLIC_URL', 'APP_PUBLIC_URL is required when APP_ENV is production');
  }

  // Production never runs on a stub. Naming one is treated as a
  // misconfiguration rather than silently accepted.
  const stubs: Array<[string, string, string]> = [
    ['PAYMENT_PROVIDER', env.PAYMENT_PROVIDER, 'sandbox'],
    ['SHIPPING_PROVIDER', env.SHIPPING_PROVIDER, 'sandbox'],
    ['STORAGE_PROVIDER', env.STORAGE_PROVIDER, 'local'],
    ['MAIL_PROVIDER', env.MAIL_PROVIDER, 'console'],
  ];
  for (const [name, value, stub] of stubs) {
    if (value === stub) {
      addCustomIssue(ctx, name, `${name} cannot be "${stub}" when APP_ENV is production`);
    }
  }
}

function validateProviderCredentials(env: RawBackendEnv, ctx: z.RefinementCtx): void {
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
        addCustomIssue(ctx, name, `${name} is required by the selected provider`);
      } else if (isPlaceholderValue(value)) {
        addCustomIssue(
          ctx,
          name,
          `${name} must not use a placeholder value when the provider is enabled`,
        );
      }
    }
  }

  if (env.SHIPPING_PROVIDER === 'ghn' && isPlaceholderValue(env.GHN_CLIENT_ID)) {
    addCustomIssue(
      ctx,
      'GHN_CLIENT_ID',
      'GHN_CLIENT_ID must not use a placeholder value when SHIPPING_PROVIDER is ghn',
    );
  }
  if (env.MAIL_PROVIDER === 'smtp' && isPlaceholderValue(env.SMTP_FROM)) {
    addCustomIssue(
      ctx,
      'SMTP_FROM',
      'SMTP_FROM must not use a placeholder value when MAIL_PROVIDER is smtp',
    );
  }
}

function validateGeminiConfig(env: RawBackendEnv, ctx: z.RefinementCtx): void {
  if (!env.CHATBOT_AI_ENABLED) return;
  if (!env.GEMINI_API_KEY) {
    addCustomIssue(
      ctx,
      'GEMINI_API_KEY',
      'GEMINI_API_KEY is required when CHATBOT_AI_ENABLED is true',
    );
  } else if (isPlaceholderValue(env.GEMINI_API_KEY)) {
    addCustomIssue(
      ctx,
      'GEMINI_API_KEY',
      'GEMINI_API_KEY must not use a placeholder value when CHATBOT_AI_ENABLED is true',
    );
  }
}

function validateGoogleOAuthConfig(env: RawBackendEnv, ctx: z.RefinementCtx): void {
  const googleFields: Array<[string, string | undefined]> = [
    ['GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID],
    ['GOOGLE_CLIENT_SECRET', env.GOOGLE_CLIENT_SECRET],
    ['GOOGLE_CALLBACK_URL', env.GOOGLE_CALLBACK_URL],
  ];
  const configuredCount = googleFields.filter(([, value]) => Boolean(value)).length;
  if (configuredCount > 0 && configuredCount < googleFields.length) {
    for (const [name, value] of googleFields) {
      if (!value) {
        addCustomIssue(ctx, name, `${name} is required when Google OAuth is partially configured`);
      }
    }
    return;
  }
  if (configuredCount !== googleFields.length) return;
  for (const [name, value] of [
    ['GOOGLE_CLIENT_ID', env.GOOGLE_CLIENT_ID],
    ['GOOGLE_CLIENT_SECRET', env.GOOGLE_CLIENT_SECRET],
  ] as const) {
    if (isPlaceholderValue(value)) {
      addCustomIssue(
        ctx,
        name,
        `${name} must not use a placeholder value when Google OAuth is configured`,
      );
    }
  }
}

const baseBackendEnvSchema = baseObjectSchema.superRefine((env, ctx) => {
  validateProductionMode(env, ctx);
  validateProviderCredentials(env, ctx);
  validateGeminiConfig(env, ctx);
  validateGoogleOAuthConfig(env, ctx);
});

export const backendEnvSchema = baseBackendEnvSchema.transform((env) => ({
  ...env,
  SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.APP_ENV !== 'production',
}));

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
  APP_ENV?: string;
  NODE_ENV?: string;
  PORT?: number | string;
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
  if (env.APP_ENV === 'production') {
    throw new Error('APP_PUBLIC_URL is required when APP_ENV is production');
  }
  const port = Number(env.PORT) || Number(env.PORT_BACKEND) || 3000;
  return `http://localhost:${port}`;
}
