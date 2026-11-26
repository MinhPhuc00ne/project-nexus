import {
  BadRequestException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthCheck } from '@nexus/contracts';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/core/health/health.controller';
import type { HealthService } from '../src/core/health/health.service';
import type { MailService } from '../src/core/mail/mail.service';
import type { PrismaService } from '../src/core/prisma/prisma.service';
import { ProviderConfigService } from '../src/core/providers/provider-config.service';
import type { RedisService } from '../src/core/redis/redis.service';
import type { TokenAuthService } from '../src/core/security/token-auth.service';
import type { CloudinaryStorageService } from '../src/core/storage/cloudinary.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import type { InventoryService } from '../src/modules/catalog/services/inventory.service';
import type { AfterSalesStoreService } from '../src/modules/commerce/services/after-sales-store.service';
import { OrderReturnService } from '../src/modules/commerce/services/order-return.service';
import type { RefundService } from '../src/modules/commerce/services/refund.service';
import type { GhnOrderActionService } from '../src/modules/fulfillment/services/ghn-order-action.service';
import type { GhnOrderApiService } from '../src/modules/fulfillment/services/ghn-order-api.service';
import { MediaService } from '../src/modules/media/services/media.service';

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function makeImageFile(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'sample.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: VALID_PNG_BUFFER,
    size: VALID_PNG_BUFFER.length,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  };
}

describe('M2 Sanity Defect Fixes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fix 1: OrderReturnService uses ProviderConfigService instead of NODE_ENV', () => {
    function makeOrderReturnService(shippingProvider: 'sandbox' | 'ghn') {
      const orderRecord = {
        id: 'order-1',
        sellerId: 'seller-1',
        buyerId: 'buyer-1',
        afterSales: {
          orderId: 'order-1',
          kind: 'RETURN',
          status: 'APPROVED',
          returnWaybillCode: null,
          refundToWallet: false,
        },
        shipment: {
          waybillCode: 'GHN-123',
          status: 'RETURNED',
          metadata: { ghnShopId: 123, ghnEnvironment: 'SANDBOX' },
        },
      };

      const tx = {
        afterSalesRequest: {
          update: vi.fn().mockResolvedValue({ ...orderRecord.afterSales, status: 'RECEIVED' }),
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({ ...orderRecord.afterSales, status: 'RECEIVED' }),
        },
      };

      const prisma = {
        $transaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
      } as unknown as PrismaService;

      const store = {
        view: vi.fn().mockResolvedValue(orderRecord),
        lock: vi.fn().mockResolvedValue(orderRecord),
        audit: vi.fn().mockResolvedValue(undefined),
      } as unknown as AfterSalesStoreService;

      const ghn = {
        detail: vi
          .fn()
          .mockResolvedValue({ status: 'delivering', client_order_code: 'NX-order-1' }),
      } as unknown as GhnOrderApiService;

      const actions = {} as GhnOrderActionService;
      const inventory = {
        restoreCommitted: vi.fn().mockResolvedValue(undefined),
      } as unknown as InventoryService;
      const refunds = {
        issue: vi.fn().mockResolvedValue(undefined),
      } as unknown as RefundService;

      const providers = new ProviderConfigService(
        new ConfigService({ SHIPPING_PROVIDER: shippingProvider }),
      );

      return {
        service: new OrderReturnService(prisma, store, ghn, actions, inventory, refunds, providers),
        ghn,
      };
    }

    it('simulates returned status when SHIPPING_PROVIDER=sandbox even if NODE_ENV=production', async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const { service, ghn } = makeOrderReturnService('sandbox');
        const res = await service.receive(
          'order-1',
          { id: 'seller-1', role: 'SELLER' },
          { restock: false, reason: 'Received return' },
        );
        expect(res.status).toBe('RECEIVED');
        expect(ghn.detail).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = prevNodeEnv;
      }
    });

    it('queries GHN instead of simulating when SHIPPING_PROVIDER=ghn even in development', async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const { service, ghn } = makeOrderReturnService('ghn');
        await expect(
          service.receive(
            'order-1',
            { id: 'seller-1', role: 'SELLER' },
            { restock: false, reason: 'Received return' },
          ),
        ).rejects.toThrow(BadRequestException);
        expect(ghn.detail).toHaveBeenCalledWith('GHN-123', 123, 'SANDBOX');
      } finally {
        process.env.NODE_ENV = prevNodeEnv;
      }
    });
  });

  describe('Fix 2: MediaService respects STORAGE_PROVIDER without silent local fallback', () => {
    it('routes directly to local storage when STORAGE_PROVIDER=local even if Cloudinary keys exist', async () => {
      const configService = new ConfigService({
        STORAGE_PROVIDER: 'local',
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: 'demo-key',
        CLOUDINARY_API_SECRET: 'demo-secret',
        APP_PUBLIC_URL: 'https://cdn.nexus.test',
      });
      const cloudinary = {
        uploadFile: vi.fn(),
      } as unknown as CloudinaryStorageService;
      const service = new MediaService(
        configService,
        cloudinary,
        new ProviderConfigService(configService),
      );

      const res = await service.uploadMedia(makeImageFile());
      const savedPath = path.join(process.cwd(), 'uploads', 'media', res.fileName);
      try {
        expect(cloudinary.uploadFile).not.toHaveBeenCalled();
        expect(res.publicId).toMatch(/^local-/);
        expect(res.url).toBe(`https://cdn.nexus.test/uploads/media/${res.fileName}`);
        expect(fs.existsSync(savedPath)).toBe(true);
      } finally {
        if (fs.existsSync(savedPath)) {
          fs.unlinkSync(savedPath);
        }
      }
    });

    it('throws ServiceUnavailableException without writing local disk files when STORAGE_PROVIDER=cloudinary fails', async () => {
      const configService = new ConfigService({
        STORAGE_PROVIDER: 'cloudinary',
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: 'demo-key',
        CLOUDINARY_API_SECRET: 'demo-secret',
      });
      const cloudinary = {
        uploadFile: vi.fn().mockRejectedValue(new Error('Cloudinary outage')),
      } as unknown as CloudinaryStorageService;
      const service = new MediaService(
        configService,
        cloudinary,
        new ProviderConfigService(configService),
      );

      const mediaDir = path.join(process.cwd(), 'uploads', 'media');
      const beforeFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];

      await expect(service.uploadMedia(makeImageFile())).rejects.toThrow(
        ServiceUnavailableException,
      );

      const afterFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];
      expect(afterFiles).toEqual(beforeFiles);
    });
  });

  describe('Fix 4: AuthService transactional refresh rotation & MailService delegation', () => {
    function makeAuthHarness() {
      const state = {
        revokedIds: new Set<string>(),
        createdTokens: [] as Array<{ id: string }>,
        updateManyCalls: 0,
      };
      const rawToken = 'valid.refresh.token';
      const tokenHash = bcrypt.hashSync(
        crypto.createHash('sha256').update(rawToken).digest('hex'),
        4,
      );
      const tokenRecord = {
        id: 'jti-1',
        userId: 'user-1',
        tokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'user-1',
          email: 'buyer@nexus.test',
          role: 'BUYER',
          isSellerActive: false,
          trustLevel: 'PROBATION',
        },
      };

      const txRefreshToken = {
        updateMany: vi.fn(async ({ where }: { where: { id: string; isRevoked: boolean } }) => {
          state.updateManyCalls += 1;
          if (state.revokedIds.has(where.id)) {
            return { count: 0 };
          }
          state.revokedIds.add(where.id);
          return { count: 1 };
        }),
        create: vi.fn(async ({ data }: { data: { id: string } }) => {
          state.createdTokens.push(data);
          return data;
        }),
      };

      const prisma = {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(tokenRecord),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'buyer@nexus.test',
            personalEmail: null,
            role: 'BUYER',
            isVerified: true,
            codeExpiresAt: null,
          }),
          update: vi.fn().mockResolvedValue({ id: 'user-1' }),
        },
        $transaction: vi.fn(
          async (cb: (tx: { refreshToken: typeof txRefreshToken }) => Promise<unknown>) => {
            const snapshotRevoked = new Set(state.revokedIds);
            const snapshotCreated = [...state.createdTokens];
            try {
              return await cb({ refreshToken: txRefreshToken });
            } catch (err) {
              state.revokedIds = snapshotRevoked;
              state.createdTokens = snapshotCreated;
              throw err;
            }
          },
        ),
      } as unknown as PrismaService;

      const config = new ConfigService({
        JWT_SECRET: 'test-jwt-secret-at-least-16',
        REFRESH_TOKEN_SECRET: 'test-refresh-secret-at-least-16',
      });

      const jwt = {
        verifyAsync: vi.fn().mockResolvedValue({ jti: 'jti-1', sub: 'user-1' }),
        sign: vi.fn().mockReturnValue('new.refresh.token'),
      };

      const tokenAuth = {
        signAccessToken: vi.fn().mockResolvedValue('new.access.token'),
        revokeAllSessions: vi.fn().mockResolvedValue(undefined),
      } as unknown as TokenAuthService;

      const mail = {
        sendEmail: vi.fn().mockResolvedValue(true),
      } as unknown as MailService;

      const authService = new AuthService(
        prisma,
        config,
        jwt as never,
        tokenAuth,
        {} as unknown as RedisService,
        mail,
      );

      return { authService, prisma, txRefreshToken, state, mail, rawToken };
    }

    it('rotates refresh token inside $transaction and rejects concurrent replay when count === 0', async () => {
      const { authService, prisma, state, rawToken } = makeAuthHarness();

      const first = await authService.refreshToken({ refreshToken: rawToken });
      expect(first.accessToken).toBe('new.access.token');
      expect(first.refreshToken).toBe('new.refresh.token');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(state.createdTokens).toHaveLength(1);

      await expect(authService.refreshToken({ refreshToken: rawToken })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(state.createdTokens).toHaveLength(1);
    });

    it('rolls back revocation when refreshToken.create fails mid-flight inside $transaction', async () => {
      const { authService, txRefreshToken, state, rawToken } = makeAuthHarness();
      txRefreshToken.create.mockRejectedValueOnce(new Error('DB write error'));

      await expect(authService.refreshToken({ refreshToken: rawToken })).rejects.toThrow(
        'DB write error',
      );
      expect(state.revokedIds.has('jti-1')).toBe(false);
      expect(state.createdTokens).toHaveLength(0);
    });

    it('delegates forgotPassword strictly to MailService and throws when delivery returns false regardless of NODE_ENV', async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const { authService, mail, prisma } = makeAuthHarness();
        expect('transporter' in authService).toBe(false);

        vi.mocked(mail.sendEmail).mockResolvedValueOnce(false);
        await expect(authService.forgotPassword({ email: 'buyer@nexus.test' })).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = prevNodeEnv;
      }
    });
  });

  describe('Fix 5: HealthController HTTP status mapping', () => {
    function makeHealthResponse(status: HealthCheck['status']): HealthCheck {
      return {
        status,
        db: { status: status === 'down' ? 'down' : 'ok', latencyMs: 4 },
        redis: { status: 'ok', latencyMs: 2 },
        sockets: { connectedClients: 0 },
        outbox: { pendingCount: 0 },
        uptimeSeconds: 120,
        timestamp: new Date().toISOString(),
      };
    }

    it('returns HTTP 200 when health status is ok or degraded, and HTTP 503 when down', async () => {
      const checkMock = vi.fn<() => Promise<HealthCheck>>();
      const controller = new HealthController({ check: checkMock } as unknown as HealthService);
      const res = { status: vi.fn() } as unknown as Response;

      checkMock.mockResolvedValueOnce(makeHealthResponse('ok'));
      const okBody = await controller.check(res);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(okBody.status).toBe('ok');

      checkMock.mockResolvedValueOnce(makeHealthResponse('degraded'));
      const degradedBody = await controller.check(res);
      expect(res.status).toHaveBeenLastCalledWith(HttpStatus.OK);
      expect(degradedBody.status).toBe('degraded');

      checkMock.mockResolvedValueOnce(makeHealthResponse('down'));
      const downBody = await controller.check(res);
      expect(res.status).toHaveBeenLastCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(downBody.status).toBe('down');
      expect(downBody.db.status).toBe('down');
    });
  });
});
