import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';
import bcrypt from 'bcrypt';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { AuthService } = load('../src/modules/auth/services/auth.service.ts');

function createAuthHarness(userRecord = null) {
  const users = new Map();
  if (userRecord) {
    users.set(userRecord.email, userRecord);
  }

  const tx = {
    $queryRaw: mock.fn(async () => []),
    user: {
      findUnique: mock.fn(async ({ where }) => users.get(where.email) ?? null),
      update: mock.fn(async ({ where, data }) => {
        const current = [...users.values()].find((u) => u.id === where.id);
        return Object.assign(current, data);
      }),
    },
    wallet: {
      upsert: mock.fn(async () => ({ id: 'wallet-1' })),
    },
    reputationLog: {
      create: mock.fn(async () => ({ id: 'rep-1' })),
    },
    notification: {
      create: mock.fn(async () => ({ id: 'notif-1' })),
    },
  };

  const prisma = {
    user: {
      findUnique: mock.fn(async ({ where }) => users.get(where.email) ?? null),
      findFirst: mock.fn(async ({ where }) => {
        const target = where?.OR?.[0]?.email?.equals?.toLowerCase();
        return [...users.values()].find((u) => u.email.toLowerCase() === target) ?? null;
      }),
      upsert: mock.fn(async ({ where, create, update }) => {
        const existing = users.get(where.email);
        if (existing) {
          return Object.assign(existing, update);
        }
        const created = {
          id: 'user-new',
          role: 'BUYER',
          isShopSuspended: false,
          isSellerActive: false,
          ...create,
        };
        users.set(where.email, created);
        return created;
      }),
    },
    refreshToken: {
      create: mock.fn(async ({ data }) => data),
      findFirst: mock.fn(async () => null),
      update: mock.fn(async () => ({})),
    },
    $transaction: async (run) => run(tx),
  };

  const configService = {
    get: (key) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret-key-16';
      if (key === 'REFRESH_TOKEN_SECRET') return 'test-refresh-secret-key-16';
      return undefined;
    },
  };

  const jwtService = {
    sign: mock.fn((_payload, opts) =>
      opts?.expiresIn === '30d' ? 'mock-refresh-token' : 'mock-access-token',
    ),
    signAsync: mock.fn(async (_payload, opts) =>
      opts?.expiresIn === '30d' ? 'mock-refresh-token' : 'mock-access-token',
    ),
  };

  const redisService = {
    set: mock.fn(async () => 'OK'),
  };

  const mailService = {
    sendEmail: mock.fn(async () => ({ accepted: ['buyer@nexus.local'] })),
  };

  const service = new AuthService(
    prisma,
    configService,
    jwtService,
    { signAccessToken: async () => 'mock-access-token', revokeAllSessions: async () => {} },
    redisService,
    mailService,
  );
  return { service, prisma, tx, mailService, users };
}

test('register creates unverified user with initial reputation 50 and sends OTP email', async () => {
  const { service, mailService, users } = createAuthHarness();
  const result = await service.register({
    email: 'buyer@nexus.local',
    password: 'StrongPassword123!',
    fullName: 'Buyer Test',
  });

  assert.equal(result.email, 'buyer@nexus.local');
  assert.equal(mailService.sendEmail.mock.callCount(), 1);
  const stored = users.get('buyer@nexus.local');
  assert.equal(stored.isVerified, false);
  assert.equal(stored.reputationScore, 50);
  assert.equal(stored.trustLevel, 'PROBATION');
});

test('register rejects already verified email', async () => {
  const { service } = createAuthHarness({
    id: 'u1',
    email: 'verified@nexus.local',
    isVerified: true,
  });

  await assert.rejects(
    service.register({
      email: 'verified@nexus.local',
      password: 'StrongPassword123!',
      fullName: 'Verified User',
    }),
    (err) => err.getStatus() === 400,
  );
});

test('verifyEmail activates account, creates wallet, logs initial reputation, and notifies user', async () => {
  const { service, tx, users } = createAuthHarness({
    id: 'u1',
    email: 'otp@nexus.local',
    isVerified: false,
    verificationCode: '123456',
    codeExpiresAt: new Date(Date.now() + 60_000),
  });

  const res = await service.verifyEmail({ email: 'otp@nexus.local', code: '123456' });
  assert.match(res.message, /Account verified successfully/);
  assert.equal(users.get('otp@nexus.local').isVerified, true);
  assert.equal(tx.wallet.upsert.mock.callCount(), 1);
  assert.equal(tx.reputationLog.create.mock.callCount(), 1);
  assert.equal(tx.notification.create.mock.callCount(), 1);
});

test('verifyEmail rejects expired or mismatched OTP codes', async () => {
  const { service } = createAuthHarness({
    id: 'u1',
    email: 'otp@nexus.local',
    isVerified: false,
    verificationCode: '123456',
    codeExpiresAt: new Date(Date.now() - 1000),
  });

  await assert.rejects(
    service.verifyEmail({ email: 'otp@nexus.local', code: '000000' }),
    (err) => err.getStatus() === 400,
  );
  await assert.rejects(
    service.verifyEmail({ email: 'otp@nexus.local', code: '123456' }),
    (err) => err.getStatus() === 400,
  );
});

test('login issues access and refresh tokens for verified user and blocks suspended accounts', async () => {
  const passwordHash = await bcrypt.hash('Secret123!', 4);
  const { service } = createAuthHarness({
    id: 'u1',
    email: 'active@nexus.local',
    passwordHash,
    fullName: 'Active Buyer',
    role: 'BUYER',
    isVerified: true,
    isSellerActive: false,
    isShopSuspended: false,
    trustLevel: 'PROBATION',
  });

  const loginRes = await service.login({ email: 'active@nexus.local', password: 'Secret123!' });
  assert.equal(loginRes.accessToken, 'mock-access-token');
  assert.equal(loginRes.refreshToken, 'mock-refresh-token');
  assert.equal(loginRes.user.email, 'active@nexus.local');

  const suspendedHarness = createAuthHarness({
    id: 'u2',
    email: 'suspended@nexus.local',
    passwordHash,
    fullName: 'Suspended User',
    role: 'BUYER',
    isVerified: true,
    isSellerActive: false,
    isShopSuspended: false,
    trustLevel: 'SUSPENDED',
  });

  await assert.rejects(
    suspendedHarness.service.login({ email: 'suspended@nexus.local', password: 'Secret123!' }),
    (err) => err.getStatus() === 403,
  );
});
