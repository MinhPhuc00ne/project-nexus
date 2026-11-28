import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertNotProduction } from '../prisma/seeds/demo/index';
import { validateBackendEnv } from '../src/core/config/env.schema';

const DIST_MAIN_PATH = path.resolve(__dirname, '../dist/main.js');
const LIVE_PROD_ENABLED =
  process.env.RUN_PROD_SIM_TESTS === 'true' &&
  fs.existsSync(DIST_MAIN_PATH) &&
  Boolean(process.env.DATABASE_URL?.trim());
const describeIfLiveProd = LIVE_PROD_ENABLED ? describe : describe.skip;

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close(() => reject(new Error('Failed to allocate free port')));
        return;
      }
      const { port } = addr;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function waitForReady(
  baseUrl: string,
  proc: ChildProcess,
  timeoutMs = 25_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`Compiled production server exited early with code ${proc.exitCode}`);
    }
    try {
      const res = await fetch(`${baseUrl}/api/v1/health/live`);
      if (res.status === 200) {
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for production server at ${baseUrl}: ${lastError}`);
}

describe('M8 Production-Mode Validation & Live Compiled Runtime Simulation', () => {
  it('enforces strict APP_ENV=production validation (rejects stubs, missing APP_PUBLIC_URL, weak secrets)', () => {
    const validProd = {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      DATABASE_URL:
        'postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public',
      JWT_SECRET: 'prod-jwt-secret-key-at-least-32-chars',
      REFRESH_TOKEN_SECRET: 'prod-refresh-secret-key-at-least-32-chars',
      APP_PUBLIC_URL: 'https://api.nexus.example.com',
      FRONTEND_URL: 'https://nexus.example.com',
      CORS_ORIGINS: 'https://nexus.example.com',
      PAYMENT_PROVIDER: 'payos',
      PAYOS_CLIENT_ID: 'payos-client-id-live',
      PAYOS_API_KEY: 'payos-api-key-live',
      PAYOS_CHECKSUM_KEY: 'payos-checksum-key-live',
      SHIPPING_PROVIDER: 'ghn',
      GHN_API_URL: 'https://online-gateway.ghn.vn/shiip/public-api/v2',
      GHN_TOKEN: 'ghn-token-live',
      GHN_SHOP_ID: '123456',
      GHN_WEBHOOK_SECRET: 'ghn-webhook-secret-live',
      STORAGE_PROVIDER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'nexus-cloud',
      CLOUDINARY_API_KEY: 'cloudinary-key',
      CLOUDINARY_API_SECRET: 'cloudinary-secret',
      MAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.nexus.example.com',
      SMTP_USER: 'mailer@nexus.example.com',
      SMTP_PASS: 'smtp-app-password-live',
    };

    const parsed = validateBackendEnv(validProd);
    expect(parsed.SWAGGER_ENABLED).toBe(false);

    expect(() =>
      validateBackendEnv({
        ...validProd,
        APP_PUBLIC_URL: undefined,
      }),
    ).toThrow(/APP_PUBLIC_URL is required/);

    expect(() =>
      validateBackendEnv({
        ...validProd,
        PAYMENT_PROVIDER: 'sandbox',
      }),
    ).toThrow(/PAYMENT_PROVIDER cannot be "sandbox"/);

    expect(() =>
      validateBackendEnv({
        ...validProd,
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT_SECRET must be at least 16 characters/);

    expect(() =>
      validateBackendEnv({
        ...validProd,
        JWT_SECRET: 'your-jwt-secret-must-be-changed',
      }),
    ).toThrow(/JWT_SECRET must not use a placeholder value/);

    expect(() =>
      validateBackendEnv({
        ...validProd,
        REFRESH_TOKEN_SECRET: 'changeme-refresh-secret-value',
      }),
    ).toThrow(/REFRESH_TOKEN_SECRET must not use a placeholder value/);
  });

  it('refuses seed:demo when APP_ENV=production or NODE_ENV=production', () => {
    expect(() => assertNotProduction({ APP_ENV: 'production', NODE_ENV: 'production' })).toThrow(
      /Refusing to seed demo data/,
    );
  });

  describeIfLiveProd(
    'Live compiled dist/main.js under NODE_ENV=production & APP_ENV=production',
    () => {
      it('boots dist/main.js against Docker PG+Redis, serves health probes, disables Swagger, enforces Helmet/CORS/Redis throttling & trust proxy', async () => {
        const port = await getFreePort();
        const baseUrl = `http://127.0.0.1:${port}`;
        const logs: string[] = [];

        const childEnv: NodeJS.ProcessEnv = {
          ...process.env,
          NODE_ENV: 'production',
          APP_ENV: 'production',
          PORT: String(port),
          PORT_BACKEND: String(port),
          DATABASE_URL: process.env.DATABASE_URL,
          REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
          REDIS_PORT: process.env.REDIS_PORT || '6379',
          JWT_SECRET: 'prod-sim-jwt-secret-key-at-least-32-chars',
          REFRESH_TOKEN_SECRET: 'prod-sim-refresh-secret-key-at-least-32-chars',
          APP_PUBLIC_URL: 'https://api.nexus.example.com',
          FRONTEND_URL: 'https://nexus.example.com',
          CORS_ORIGINS: 'https://nexus.example.com',
          PAYMENT_PROVIDER: 'payos',
          PAYOS_CLIENT_ID: 'payos-client-id-sim',
          PAYOS_API_KEY: 'payos-api-key-sim',
          PAYOS_CHECKSUM_KEY: 'payos-checksum-key-sim',
          SHIPPING_PROVIDER: 'ghn',
          GHN_API_URL: 'https://online-gateway.ghn.vn/shiip/public-api/v2',
          GHN_TOKEN: 'ghn-token-sim',
          GHN_SHOP_ID: '123456',
          GHN_WEBHOOK_SECRET: 'ghn-webhook-secret-sim',
          STORAGE_PROVIDER: 'cloudinary',
          CLOUDINARY_CLOUD_NAME: 'nexus-cloud',
          CLOUDINARY_API_KEY: 'cloudinary-key',
          CLOUDINARY_API_SECRET: 'cloudinary-secret',
          MAIL_PROVIDER: 'smtp',
          SMTP_HOST: 'smtp.nexus.example.com',
          SMTP_USER: 'mailer@nexus.example.com',
          SMTP_PASS: 'smtp-app-password-sim',
        };
        delete childEnv.SWAGGER_ENABLED;

        const child = spawn(process.execPath, [DIST_MAIN_PATH], {
          cwd: path.resolve(__dirname, '..'),
          env: childEnv,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout?.on('data', (chunk) => logs.push(chunk.toString()));
        child.stderr?.on('data', (chunk) => logs.push(chunk.toString()));

        try {
          await waitForReady(baseUrl, child);

          // 1. Health probes + Helmet security headers
          const liveRes = await fetch(`${baseUrl}/api/v1/health/live`);
          expect(liveRes.status).toBe(200);
          expect(liveRes.headers.get('x-content-type-options')).toBe('nosniff');

          const readyRes = await fetch(`${baseUrl}/api/v1/health/ready`);
          expect(readyRes.status).toBe(200);
          const readyBody = (await readyRes.json()) as {
            data: { status: string; db: { status: string }; redis: { status: string } };
          };
          expect(readyBody.data.status).toBe('ok');
          expect(readyBody.data.db.status).toBe('ok');
          expect(readyBody.data.redis.status).toBe('ok');

          // 2. Swagger disabled by default in production
          const swaggerRes = await fetch(`${baseUrl}/api/docs`);
          expect(swaggerRes.status).toBe(404);

          // 3. CORS allowlist & denial
          const allowedCors = await fetch(`${baseUrl}/api/v1/health/live`, {
            headers: { Origin: 'https://nexus.example.com' },
          });
          expect(allowedCors.headers.get('access-control-allow-origin')).toBe(
            'https://nexus.example.com',
          );

          const deniedCors = await fetch(`${baseUrl}/api/v1/health/live`, {
            headers: { Origin: 'https://evil.example.com' },
          });
          expect(deniedCors.headers.get('access-control-allow-origin')).toBeNull();

          // 4. Real Redis throttling (limit 10 / 60s on POST /api/v1/auth/oauth/exchange) + trust proxy per-IP isolation
          const ipA = `198.51.100.${(port % 200) + 10}`;
          const ipB = `198.51.100.${(port % 200) + 11}`;
          for (let i = 0; i < 10; i += 1) {
            const res = await fetch(`${baseUrl}/api/v1/auth/oauth/exchange`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': ipA,
              },
              body: JSON.stringify({ code: 'invalid-oauth-code' }),
            });
            expect(res.status).toBe(401);
          }

          const throttledIpA = await fetch(`${baseUrl}/api/v1/auth/oauth/exchange`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Forwarded-For': ipA,
            },
            body: JSON.stringify({ code: 'invalid-oauth-code' }),
          });
          expect(throttledIpA.status).toBe(429);

          // Distinct forwarded IP proves `trust proxy` isolates rate-limit buckets across proxy clients
          const unthrottledIpB = await fetch(`${baseUrl}/api/v1/auth/oauth/exchange`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Forwarded-For': ipB,
            },
            body: JSON.stringify({ code: 'invalid-oauth-code' }),
          });
          expect(unthrottledIpB.status).toBe(401);
        } catch (err) {
          throw new Error(
            `Production simulation failed: ${err instanceof Error ? err.message : String(err)}\nLogs:\n${logs.join('')}`,
          );
        } finally {
          child.kill('SIGTERM');
          await new Promise((resolve) => {
            child.once('exit', resolve);
            setTimeout(resolve, 3000);
          });
        }
      }, 35_000);
    },
  );
});
