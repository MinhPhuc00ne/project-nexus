import assert from 'node:assert/strict';
import { test } from './helpers/vitest-node-compat.mjs';
import { load } from './staff-fixture.mjs';

const { AuthService } = load('../src/modules/auth/services/auth.service.ts');

test('email verification starts at 50 PROBATION and replay preserves earned points', async () => {
  const user = {
    id: 'buyer',
    email: 'fixture@example.invalid',
    isVerified: false,
    verificationCode: '123456',
    codeExpiresAt: new Date(Date.now() + 60000),
    reputationScore: 50,
  };
  const logs = [],
    notices = [];
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async () => user, update: async ({ data }) => Object.assign(user, data) },
    wallet: { upsert: async () => ({}) },
    reputationLog: { create: async ({ data }) => logs.push(data) },
    notification: { create: async ({ data }) => notices.push(data) },
  };
  const auth = new AuthService(
    { $transaction: (run) => run(tx) },
    {},
    {},
    { signAccessToken: async () => 'test-access-token', revokeAllSessions: async () => {} },
    {},
    {},
  );
  await auth.verifyEmail({ email: user.email, code: '123456' });
  assert.equal(user.reputationScore, 50);
  assert.equal(user.trustLevel, 'PROBATION');
  assert.equal(logs[0].balanceAfter, 50);
  assert.ok(notices[0].content.includes('50 (PROBATION)'));
  user.reputationScore = 65;
  await auth.verifyEmail({ email: user.email, code: '123456' });
  assert.equal(user.reputationScore, 65);
  assert.equal(logs.length, 1);
});

test('registration and Google initialize new accounts at 50 without overwriting existing scores', async () => {
  const requests = [];
  const prisma = {
    user: {
      findUnique: async () => null,
      upsert: async (request) => {
        requests.push(request);
        return { id: 'buyer', role: 'BUYER', ...request.create };
      },
    },
    wallet: { upsert: async () => ({}) },
  };
  const auth = new AuthService(
    prisma,
    {},
    {},
    { signAccessToken: async () => 'test-access-token', revokeAllSessions: async () => {} },
    {},
    { sendEmail: async () => undefined },
  );
  auth.generateTokens = async () => ({ accessToken: 'fixture', refreshToken: 'fixture' });
  await auth.register({
    email: 'fixture@example.invalid',
    fullName: 'Fixture',
    password: 'FixturePassword!1',
  });
  await auth.googleLogin({ email: 'google@example.invalid', firstName: 'Fixture' });
  for (const request of requests) {
    assert.equal(request.create.reputationScore, 50);
    assert.equal(request.create.trustLevel, 'PROBATION');
    assert.equal(request.update.reputationScore, undefined);
    assert.equal(request.update.trustLevel, undefined);
  }
});
