import { describe, expect, it } from 'vitest';
import {
  parseCorsOrigins,
  resolveAppPublicUrl,
  validateBackendEnv,
} from '../src/core/config/env.schema';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';

const VALID_BASE_ENV = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nexus_test',
  JWT_SECRET: 'valid-jwt-secret-at-least-16',
  REFRESH_TOKEN_SECRET: 'valid-refresh-secret-at-least-16',
};

describe('M1 Backend environment validation & URL/CORS helpers', () => {
  it('validates complete development config and applies defaults + numeric coercion', () => {
    const parsed = validateBackendEnv({
      ...VALID_BASE_ENV,
      PORT_BACKEND: '4100',
      REDIS_PORT: '6380',
      CORS_ORIGINS: '',
      APP_PUBLIC_URL: '',
    });

    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT_BACKEND).toBe(4100);
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
    STORAGE_PROVIDER: 'cloudinary',
    CLOUDINARY_CLOUD_NAME: 'nexus',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
    MAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'mailer@example.com',
    SMTP_PASS: 'app-password',
  };

  it('requires APP_PUBLIC_URL in production and allows valid production URL', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        ...PRODUCTION_PROVIDERS,
        NODE_ENV: 'production',
      }),
    ).toThrow(/APP_PUBLIC_URL/);

    const prod = validateBackendEnv({
      ...VALID_BASE_ENV,
      ...PRODUCTION_PROVIDERS,
      NODE_ENV: 'production',
      APP_PUBLIC_URL: 'https://api.nexus.example.com',
    });
    expect(prod.APP_PUBLIC_URL).toBe('https://api.nexus.example.com');
  });

  it('refuses to run production on a stub provider', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        ...PRODUCTION_PROVIDERS,
        NODE_ENV: 'production',
        APP_PUBLIC_URL: 'https://api.nexus.example.com',
        MAIL_PROVIDER: 'console',
      }),
    ).toThrow(/MAIL_PROVIDER/);
  });

  it('requires the selected provider to carry its credentials', () => {
    expect(() =>
      validateBackendEnv({
        ...VALID_BASE_ENV,
        PAYMENT_PROVIDER: 'payos',
      }),
    ).toThrow(/PAYOS_CLIENT_ID/);
  });

  it('parses comma-separated CORS_ORIGINS and falls back cleanly', () => {
    expect(parseCorsOrigins('https://a.example.com, https://b.example.com ,')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(parseCorsOrigins(undefined, DEFAULT_FRONTEND_ORIGIN)).toEqual([DEFAULT_FRONTEND_ORIGIN]);
    expect(parseCorsOrigins('   ', DEFAULT_FRONTEND_ORIGIN)).toEqual([DEFAULT_FRONTEND_ORIGIN]);
  });

  it('resolves APP_PUBLIC_URL without trailing slashes and fails closed in production', () => {
    expect(
      resolveAppPublicUrl({
        APP_PUBLIC_URL: 'https://cdn.nexus.example.com///',
        NODE_ENV: 'production',
      }),
    ).toBe('https://cdn.nexus.example.com');

    expect(
      resolveAppPublicUrl({
        NODE_ENV: 'development',
        PORT_BACKEND: 3500,
      }),
    ).toBe('http://localhost:3500');

    expect(() =>
      resolveAppPublicUrl({
        NODE_ENV: 'production',
      }),
    ).toThrow(/APP_PUBLIC_URL is required in production/);
  });
});
