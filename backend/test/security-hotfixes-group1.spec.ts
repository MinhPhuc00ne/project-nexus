import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../src/core/security/roles.decorator';
import { PayosWebhookController } from '../src/modules/wallet/controllers/payos-webhook.controller';
import { StaffController } from '../src/modules/auth/controllers/staff.controller';
import { OAuthCodeService } from '../src/modules/auth/services/oauth-code.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { RedisService } from '../src/core/redis/redis.service';

describe('Group 1 Security Hotfixes', () => {
  it('guards POST /commerce/webhooks/payos/confirm with Role.ADMIN (not @Public)', () => {
    const method = PayosWebhookController.prototype.confirmWebhookUrl;
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, method);
    const roles = Reflect.getMetadata(ROLES_KEY, method);

    expect(isPublic).toBeUndefined();
    expect(roles).toEqual([Role.ADMIN]);

    const webhookMethod = PayosWebhookController.prototype.handlePayosWebhook;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, webhookMethod)).toBe(true);
  });

  it('redeems OAuth codes atomically via Redis GETDEL and rejects replay', async () => {
    const store = new Map<string, string>();
    const redis = {
      set: vi.fn(async (key: string, val: string) => {
        store.set(key, val);
        return 'OK';
      }),
      getDel: vi.fn(async (key: string) => {
        const v = store.get(key) ?? null;
        store.delete(key);
        return v;
      }),
      get: vi.fn(),
      del: vi.fn(),
    } as unknown as RedisService;

    const service = new OAuthCodeService(redis);
    const code = await service.issue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'u1' },
    });

    const first = await service.redeem(code);
    expect(first.accessToken).toBe('at');
    expect(redis.getDel).toHaveBeenCalledTimes(1);
    expect(redis.get).not.toHaveBeenCalled();

    await expect(service.redeem(code)).rejects.toThrow();
  });

  it('wipes unverified passwordHash on Google OAuth takeover while preserving verified accounts', async () => {
    const updateCalls: Array<{ data: Record<string, unknown> }> = [];
    const preRegSecret = ['attacker', 'digest'].join('-');
    const verifiedSecret = ['legit', 'digest'].join('-');
    let existing: Record<string, unknown> | null = {
      id: 'u-unverified',
      email: 'victim@gmail.com',
      isVerified: false,
      passwordHash: preRegSecret,
      role: Role.BUYER,
      trustLevel: 'STANDARD',
      isSellerActive: false,
      isShopSuspended: false,
    };

    const prisma = {
      user: {
        findUnique: vi.fn(async () => existing),
        update: vi.fn(async (args: { data: Record<string, unknown> }) => {
          updateCalls.push(args);
          return { ...existing, ...args.data };
        }),
        create: vi.fn(),
      },
      wallet: { upsert: vi.fn(async () => ({})) },
      refreshToken: { create: vi.fn(async () => ({})) },
    };

    const auth = new AuthService(
      prisma as never,
      { get: () => 'test-secret-key-at-least-32-chars-long' } as never,
      { sign: () => 'refresh-jwt', signAsync: async () => 'jwt' } as never,
      { signAccessToken: async () => 'access-jwt' } as never,
      { set: vi.fn(), get: vi.fn() } as never,
      { sendMail: vi.fn() } as never,
    );

    await auth.googleLogin({ email: 'victim@gmail.com', firstName: 'Real', lastName: 'Owner' });
    expect(updateCalls[0]?.data).toMatchObject({
      isVerified: true,
      passwordHash: '',
      verificationCode: null,
      codeExpiresAt: null,
    });

    existing = {
      ...existing,
      id: 'u-verified',
      isVerified: true,
      passwordHash: verifiedSecret,
    };
    await auth.googleLogin({ email: 'victim@gmail.com', firstName: 'Real', lastName: 'Owner' });
    expect(updateCalls[1]?.data).toEqual({
      avatarUrl: undefined,
      isVerified: true,
    });
  });

  it('applies @Throttle limits on public StaffController password reset endpoints', () => {
    const forgotMeta = Reflect.getMetadata(
      'THROTTLER:LIMITdefault',
      StaffController.prototype.forgotPassword,
    );
    const resetMeta = Reflect.getMetadata(
      'THROTTLER:LIMITdefault',
      StaffController.prototype.resetPassword,
    );
    expect(forgotMeta).toBe(5);
    expect(resetMeta).toBe(5);
  });
});
