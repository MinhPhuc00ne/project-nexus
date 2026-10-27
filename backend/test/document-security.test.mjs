import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tsNode from 'ts-node';
tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { JwtService } = load('@nestjs/jwt');
const bcrypt = load('bcrypt');
const { ProfileReauthService, recentReauthentication } = load(
  '../src/core/security/profile-reauth.service.ts',
);
const { JwtAuthGuard } = load('../src/core/security/jwt-auth.guard.ts');
const { toggleSellerState, userMode } = load('../src/core/security/user-mode.ts');
const { AuthProfileService } = load('../src/modules/auth/services/auth-profile.service.ts');
const { UsersService } = load('../src/modules/users/services/users.service.ts');

test('profile proof is short-lived, user/password-bound and cannot be used as an access token', async () => {
  const jwt = new JwtService({ secret: 'test-access-secret' });
  const service = new ProfileReauthService({ get: async () => null }, jwt, {
    get: () => 'test-access-secret',
  });
  const user = {
    id: 'seller',
    role: 'SELLER',
    passwordHash: await bcrypt.hash('correct-password', 4),
  };
  const proof = await service.issue(user, 'correct-password');
  assert.equal(proof.expiresIn, 300);
  await service.assert(user, proof);
  await assert.rejects(service.issue(user, 'wrong'), /không chính xác/);
  await assert.rejects(service.assert({ ...user, id: 'other' }, proof), /xác minh/);
  await assert.rejects(
    service.assert({ ...user, passwordHash: await bcrypt.hash('new-password', 4) }, proof),
    /xác minh/,
  );
  await assert.rejects(jwt.verifyAsync(proof.verificationToken));
  const access = jwt.sign({ sub: user.id, role: 'SELLER' });
  await assert.rejects(service.assert(user, { verificationToken: access }), /xác minh/);
  await assert.rejects(
    service.assert(user, { verificationToken: 'revoked-refresh-token' }),
    /xác minh/,
  );
});

test('recent login proof fails closed on expiry, password rotation and Redis failure', async () => {
  const user = { id: 'seller', role: 'SELLER', passwordHash: await bcrypt.hash('secret', 4) };
  let cache = recentReauthentication(user.passwordHash);
  const service = new ProfileReauthService({ get: async () => cache }, new JwtService(), {
    get: () => 'secret',
  });
  await service.assert(user);
  await assert.rejects(service.assert({ ...user, passwordHash: 'rotated' }), /xác minh/);
  cache = JSON.stringify({ ...JSON.parse(cache), verifiedAt: Date.now() - 301000 });
  await assert.rejects(service.assert(user), /xác minh/);
  cache = String(Date.now());
  await assert.rejects(service.assert(user), /xác minh/);
  const down = new ProfileReauthService(
    {
      get: async () => {
        throw Error('Redis down');
      },
    },
    new JwtService(),
    { get: () => 'secret' },
  );
  await assert.rejects(down.assert(user), /xác minh/);
  await down.assert(user, { password: 'secret' });
});

test('both profile update routes enforce seller reauthentication from actual DB role', async () => {
  let writes = 0;
  const user = { id: 'seller', role: 'SELLER', passwordHash: 'hash' };
  const prisma = {
    user: {
      findUnique: async () => user,
      update: async () => {
        writes++;
      },
    },
  };
  const proof = {
    assert: async () => {
      throw Error('reauth-required');
    },
  };
  const root = new AuthProfileService(prisma, { get: () => undefined }, proof);
  const buyer = new UsersService(prisma, {}, proof);
  await assert.rejects(root.updateProfile(user.id, { fullName: 'New Name' }), /reauth-required/);
  await assert.rejects(
    buyer.updateProfile(user.id, { fullName: 'New Name' }, 'BUYER'),
    /reauth-required/,
  );
  assert.equal(writes, 0);
  user.role = 'SUPPORT_STAFF';
  await assert.rejects(root.updateProfile(user.id, { fullName: 'New Name' }), /Buyer và Seller/);
  await assert.rejects(
    buyer.updateProfile(user.id, { fullName: 'New Name' }, 'BUYER'),
    /Buyer và Seller/,
  );
});

test('existing access tokens read canonical role and current mode from DB', async () => {
  const secret = 'test-secret';
  const token = new JwtService({ secret }).sign({
    sub: 'seller',
    role: 'BUYER',
    isSellerActive: false,
  });
  const account = {
    id: 'seller',
    email: 'seller@test',
    role: 'SELLER',
    isSellerActive: true,
    isShopSuspended: false,
  };
  const guard = new JwtAuthGuard(
    { getAllAndOverride: () => false },
    { get: () => secret },
    { user: { findUnique: async () => account } },
  );
  const request = { headers: { authorization: `Bearer ${token}` } };
  const context = {
    getHandler() {},
    getClass() {},
    switchToHttp: () => ({ getRequest: () => request }),
  };
  await guard.canActivate(context);
  assert.equal(request.user.role, 'SELLER');
  assert.equal(request.user.currentMode, 'SELLER');
  account.isShopSuspended = true;
  await guard.canActivate(context);
  assert.equal(request.user.isSellerActive, false);
  assert.equal(request.user.activeRole, 'BUYER');
  account.trustLevel = 'SUSPENDED';
  await assert.rejects(guard.canActivate(context), /unavailable/);
});

test('seller toggle cannot undo suspension and manual buyer mode keeps seller identity', async () => {
  let updated = false;
  const user = { id: 'seller', role: 'SELLER', isSellerActive: false, isShopSuspended: true };
  const tx = {
    $queryRaw: async () => [],
    user: {
      findUnique: async () => user,
      update: async ({ data }) => {
        updated = true;
        return { ...user, ...data };
      },
    },
  };
  const prisma = { $transaction: async (fn) => fn(tx) };
  await assert.rejects(toggleSellerState(prisma, user.id, true), /đình chỉ/);
  assert.equal(updated, false);
  const result = await toggleSellerState(prisma, user.id, false);
  assert.equal(result.isShopSuspended, true);
  assert.deepEqual(userMode(result), {
    accountRole: 'SELLER',
    activeRole: 'BUYER',
    currentMode: 'BUYER',
    isSellerActive: false,
  });
});

test('authenticated password change consumes an OTP only once and revokes refresh tokens atomically', async () => {
  const user = {
    id: 'staff',
    passwordHash: await bcrypt.hash('old-password', 4),
    verificationCode: '123456',
    codeExpiresAt: new Date(Date.now() + 60000),
  };
  let consumed = false;
  let revoked = 0;
  const tx = {
    user: {
      updateMany: async ({ where }) => {
        assert.equal(where.verificationCode, '123456');
        assert.equal(where.passwordHash, user.passwordHash);
        if (consumed) return { count: 0 };
        consumed = true;
        return { count: 1 };
      },
    },
    refreshToken: {
      updateMany: async () => {
        revoked++;
      },
    },
  };
  const prisma = {
    user: { findUnique: async () => structuredClone(user) },
    $transaction: (fn) => fn(tx),
  };
  const service = new AuthProfileService(prisma, { get: () => undefined }, {});
  const results = await Promise.allSettled([
    service.confirmChangePasswordWithOtp('staff', { otp: '123456', newPassword: 'new-password-1' }),
    service.confirmChangePasswordWithOtp('staff', { otp: '123456', newPassword: 'new-password-2' }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(revoked, 1);
});

test('shop avatar and contact updates leave the personal profile and recipient address unchanged', async () => {
  const writes = [];
  const request = { id: 'request', storeName: 'Shop', phone: '0901234567' };
  const user = {
    id: 'seller',
    role: 'SELLER',
    isSellerActive: true,
    isShopSuspended: false,
    fullName: 'Seller',
    avatarUrl: 'personal.png',
    shopAvatarUrl: 'old-shop.png',
    sellerUpgradeRequests: [request],
    addresses: [],
  };
  const tx = {
    $queryRaw: async () => [],
    user: {
      findUniqueOrThrow: async () => user,
      update: async ({ data }) => writes.push(data),
    },
    sellerUpgradeRequest: { update: async ({ data }) => ({ ...request, ...data }) },
  };
  const prisma = { user: { findUnique: async () => user }, $transaction: (fn) => fn(tx) };
  const result = await new UsersService(prisma, {}, {}).updateShopProfile('seller', {
    shopAvatarUrl: 'https://example.test/shop.png',
    phone: '0912345678',
    street: 'New Street',
    city: 'HCM',
  });
  assert.deepEqual(writes, [{ shopAvatarUrl: 'https://example.test/shop.png' }]);
  assert.equal(result.shop.avatarUrl, 'https://example.test/shop.png');
  assert.equal(user.avatarUrl, 'personal.png');
});
