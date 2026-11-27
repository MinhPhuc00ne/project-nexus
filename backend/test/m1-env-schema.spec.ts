import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';
import {
  parseCorsOrigins,
  resolveAppPublicUrl,
  validateBackendEnv,
} from '../src/core/config/env.schema';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';
const PROD_PUBLIC_URL = 'https://api.nexus.example.com';
const REAL_GOOGLE_CLIENT_ID = 'real-google-client-id';

const VALID_BASE_ENV = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nexus_test',
  JWT_SECRET: 'valid-jwt-secret-at-least-16',
  REFRESH_TOKEN_SECRET: 'valid-refresh-secret-at-least-16',
};

/** A production deployment must name a real provider for every dependency. */
const PRODUCTION_PROVIDERS = {
  PAYMENT_PROVIDER: 'payos',
  PAYOS_CLIENT_ID: 'client',
  PAYOS_API_KEY: 'key',
  PAYOS_CHECKSUM_KEY: 'checksum',
  SHIPPING_PROVIDER: 'ghn',
  GHN_API_URL: 'https://ghn.example.com',
  GHN_TOKEN: 'token',
  GHN_SHOP_ID: '123456',
  GHN_WEBHOOK_SECRET: 'webhook-secret',
  STORAGE_PROVIDER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: 'nexus',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  MAIL_PROVIDER: 'smtp',
  SMTP_HOST: 'smtp.example.com',
  SMTP_USER: 'mailer@example.com',
  SMTP_PASS: 'app-password',
};

describe('M1/M7 Backend environment validation & URL/CORS helpers', () => {
  it('validates complete development config and applies defaults + numeric coercion', () => {
    const parsed = validateBackendEnv({
      ...VALID_BASE_ENV,
      PORT: '4200',
      PORT_BACKEND: '4100',
      REDIS_PORT: '6380',
      CORS_ORIGINS: '',
      APP_PUBLIC_URL: '',
    });

    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.APP_ENV).toBe('development');
    expect(parsed.PORT).toBe(4200);
    expect(parsed.PORT_BACKEND).toBe(4100);
    expect(parsed.SWAGGER_ENABLED).toBe(true);
    expect(parsed.CHATBOT_AI_ENABLED).toBe(false);
    expect(parsed.CHATBOT_GEMINI_MODEL).toBe('gemini-3.1-flash-lite');
    expect(parsed.SMTP_PORT).toBe(587);
    expect(parsed.JWT_EXPIRES_IN).toBe('15m');
    expect(parsed.REDIS_HOST).toBe('localhost');
    expect(parsed.REDIS_PORT).toBe(6380);
    expect(parsed.CORS_ORIGINS).toBeUndefined();
    expect(parsed.APP_PUBLIC_URL).toBeUndefined();
  });

  it('fails fast when DATABASE_URL is missing or empty', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        DATABASE_URL: '',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('fails fast when JWT_SECRET or REFRESH_TOKEN_SECRET is missing or shorter than 16 chars', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT_SECRET/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        REFRESH_TOKEN_SECRET: 'too-short',
      }),
    ).toThrow(/REFRESH_TOKEN_SECRET/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        JWT_SECRET: '                ',
      }),
    ).toThrow(/JWT_SECRET/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        REFRESH_TOKEN_SECRET: '                ',
      }),
    ).toThrow(/REFRESH_TOKEN_SECRET/);
  });

  it('requires APP_PUBLIC_URL when APP_ENV=production and allows valid production URL', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        ...PRODUCTION_PROVIDERS,
        NODE_ENV: 'production',
        APP_ENV: 'production',
      }),
    ).toThrow(/APP_PUBLIC_URL/);

    const prod = validateBackendEnv({
      ...VALID_BASE_ENV,
      ...PRODUCTION_PROVIDERS,
      NODE_ENV: 'production',
      APP_ENV: 'production',
      APP_PUBLIC_URL: PROD_PUBLIC_URL,
    });
    expect(prod.APP_PUBLIC_URL).toBe(PROD_PUBLIC_URL);
    expect(prod.SWAGGER_ENABLED).toBe(false);
  });

  it('forbids every stub provider when APP_ENV=production', () => {
    for (const [override, key] of [
      [{ PAYMENT_PROVIDER: 'sandbox' }, 'PAYMENT_PROVIDER'],
      [{ SHIPPING_PROVIDER: 'sandbox' }, 'SHIPPING_PROVIDER'],
      [{ STORAGE_PROVIDER: 'local' }, 'STORAGE_PROVIDER'],
      [{ MAIL_PROVIDER: 'console' }, 'MAIL_PROVIDER'],
    ] as const) {
      expect(() =>
        validateBackendEnv({
          ...VALID_BASE_ENV,
          ...PRODUCTION_PROVIDERS,
          NODE_ENV: 'production',
          APP_ENV: 'production',
          APP_PUBLIC_URL: PROD_PUBLIC_URL,
          ...override,
        }),
      ).toThrow(new RegExp(key));
    }
  });

  it('allows NODE_ENV=production with stub providers when APP_ENV=demo', () => {
    const demo = validateBackendEnv({
      ...VALID_BASE_ENV,
      NODE_ENV: 'production',
      APP_ENV: 'demo',
      PAYMENT_PROVIDER: 'sandbox',
      SHIPPING_PROVIDER: 'sandbox',
      STORAGE_PROVIDER: 'local',
      MAIL_PROVIDER: 'console',
    });

    expect(demo.NODE_ENV).toBe('production');
    expect(demo.APP_ENV).toBe('demo');
    expect(demo.SWAGGER_ENABLED).toBe(true);
  });

  it('handles SWAGGER_ENABLED defaults and explicit boolean/string overrides cleanly', () => {
    expect(
      validateBackendEnv({
        ...VALID_BASE_ENV,
        APP_ENV: 'production',
        ...PRODUCTION_PROVIDERS,
        APP_PUBLIC_URL: PROD_PUBLIC_URL,
        SWAGGER_ENABLED: 'true',
      }).SWAGGER_ENABLED,
    ).toBe(true);

    expect(
      validateBackendEnv({ ...VALID_BASE_ENV, APP_ENV: 'development', SWAGGER_ENABLED: 'false' })
        .SWAGGER_ENABLED,
    ).toBe(false);

    expect(
      validateBackendEnv({ ...VALID_BASE_ENV, APP_ENV: 'demo', SWAGGER_ENABLED: false })
        .SWAGGER_ENABLED,
    ).toBe(false);

    expect(() => validateBackendEnv({ ...VALID_BASE_ENV, SWAGGER_ENABLED: 'not-a-bool' })).toThrow(
      /SWAGGER_ENABLED/,
    );
  });

  it('validates CHATBOT_AI_ENABLED, GEMINI_API_KEY, and CHATBOT_GEMINI_MODEL', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        CHATBOT_AI_ENABLED: 'true',
      }),
    ).toThrow(/GEMINI_API_KEY/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        CHATBOT_AI_ENABLED: 'true',
        GEMINI_API_KEY: 'real-gemini-key-value',
        CHATBOT_GEMINI_MODEL: 'gpt-4o',
      }),
    ).toThrow(/CHATBOT_GEMINI_MODEL/);

    const enabled = validateBackendEnv({
      ...VALID_BASE_ENV,
      CHATBOT_AI_ENABLED: 'true',
      GEMINI_API_KEY: 'real-gemini-key-value',
      CHATBOT_GEMINI_MODEL: 'gemini-2.5-flash',
    });
    expect(enabled.CHATBOT_AI_ENABLED).toBe(true);
    expect(enabled.CHATBOT_GEMINI_MODEL).toBe('gemini-2.5-flash');
  });

  it('enforces all-or-nothing validation for Google OAuth variables', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        GOOGLE_CLIENT_ID: REAL_GOOGLE_CLIENT_ID,
      }),
    ).toThrow(/GOOGLE_CLIENT_SECRET/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        GOOGLE_CLIENT_ID: REAL_GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: 'real-google-client-secret',
      }),
    ).toThrow(/GOOGLE_CALLBACK_URL/);

    const oauth = validateBackendEnv({
      ...VALID_BASE_ENV,
      GOOGLE_CLIENT_ID: REAL_GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: 'real-google-client-secret',
      GOOGLE_CALLBACK_URL: 'https://api.nexus.example.com/api/v1/auth/google/callback',
    });
    expect(oauth.GOOGLE_CLIENT_ID).toBe(REAL_GOOGLE_CLIENT_ID);
  });

  it('rejects obvious placeholder values when real providers or integrations are enabled', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        PAYMENT_PROVIDER: 'payos',
        PAYOS_CLIENT_ID: 'your-payos-client-id',
        PAYOS_API_KEY: 'real-key',
        PAYOS_CHECKSUM_KEY: 'real-checksum',
      }),
    ).toThrow(/PAYOS_CLIENT_ID/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        CHATBOT_AI_ENABLED: 'true',
        GEMINI_API_KEY: 'your-gemini-api-key',
      }),
    ).toThrow(/GEMINI_API_KEY/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        GOOGLE_CLIENT_ID: 'your-google-client-id',
        GOOGLE_CLIENT_SECRET: 'real-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/google/callback',
      }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('requires the selected provider to carry its credentials', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        PAYMENT_PROVIDER: 'payos',
      }),
    ).toThrow(/PAYOS_CLIENT_ID/);

    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        SHIPPING_PROVIDER: 'ghn',
        GHN_API_URL: 'https://ghn.example.com',
        GHN_TOKEN: 'token',
        GHN_SHOP_ID: '123456',
      }),
    ).toThrow(/GHN_WEBHOOK_SECRET/);
  });

  it('validates root .env.example out of the box with zero external secrets', () => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    const raw = fs.readFileSync(envExamplePath, 'utf8');
    const parsedFile = dotenv.parse(raw);

    expect(raw).not.toMatch(/your-[a-z0-9-]+/i);
    expect(raw).not.toContain('PLATFORM_FEE_PERCENTAGE');
    expect(raw).not.toContain('AUCTION_ANTI_SNIPING_');
    expect(raw).not.toContain('VITE_API_URL');

    const validated = validateBackendEnv(parsedFile);
    expect(validated.APP_ENV).toBe('development');
    expect(validated.PAYMENT_PROVIDER).toBe('sandbox');
    expect(validated.SHIPPING_PROVIDER).toBe('sandbox');
    expect(validated.STORAGE_PROVIDER).toBe('local');
    expect(validated.MAIL_PROVIDER).toBe('console');
    expect(validated.CHATBOT_AI_ENABLED).toBe(false);
    expect(validated.SWAGGER_ENABLED).toBe(true);
  });

  it('parses comma-separated CORS_ORIGINS and falls back cleanly', () => {
    expect(parseCorsOrigins('https://a.example.com, https://b.example.com ,')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(parseCorsOrigins(undefined, DEFAULT_FRONTEND_ORIGIN)).toEqual([DEFAULT_FRONTEND_ORIGIN]);
    expect(parseCorsOrigins('   ', DEFAULT_FRONTEND_ORIGIN)).toEqual([DEFAULT_FRONTEND_ORIGIN]);
  });

  it('resolves APP_PUBLIC_URL preferring PORT over PORT_BACKEND and fails closed in production', () => {
    expect(
      resolveAppPublicUrl({
        APP_PUBLIC_URL: 'https://cdn.nexus.example.com///',
        APP_ENV: 'production',
      }),
    ).toBe('https://cdn.nexus.example.com');

    expect(
      resolveAppPublicUrl({
        APP_ENV: 'development',
        PORT: 4500,
        PORT_BACKEND: 3500,
      }),
    ).toBe('http://localhost:4500');

    expect(
      resolveAppPublicUrl({
        APP_ENV: 'development',
        PORT_BACKEND: 3500,
      }),
    ).toBe('http://localhost:3500');

    expect(
      resolveAppPublicUrl({
        APP_ENV: 'demo',
        NODE_ENV: 'production',
        PORT: 8080,
      }),
    ).toBe('http://localhost:8080');

    expect(() =>
      resolveAppPublicUrl({
        APP_ENV: 'production',
      }),
    ).toThrow(/APP_PUBLIC_URL is required when APP_ENV is production/);
  });
});
