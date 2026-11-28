import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ArgumentsHost,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppErrorCode, UuidParamSchema } from '@nexus/contracts';
import { ZodParam } from '@nexus/contracts/nest';
import { Role } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import { assertCleanContent } from '../src/core/moderation/content-moderation.util';
import type { PrismaService } from '../src/core/prisma/prisma.service';
import { WithdrawalService } from '../src/modules/wallet/services/withdrawal.service';

@Controller('m11-validation-probe')
class ValidationProbeController {
  @Get(':id')
  getItem(@ZodParam('id', UuidParamSchema) id: string) {
    return { id };
  }
}

describe('M11 Canonical AppErrorCode & i18n Parity', () => {
  it('maps every AppErrorCode in both en and vi errors.json locales', () => {
    const enErrors = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../frontend/src/i18n/locales/en/errors.json'),
        'utf8',
      ),
    ) as { codes: Record<string, string> };
    const viErrors = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../frontend/src/i18n/locales/vi/errors.json'),
        'utf8',
      ),
    ) as { codes: Record<string, string> };

    const allCodes = Object.values(AppErrorCode);
    expect(allCodes.length).toBeGreaterThanOrEqual(25);

    for (const code of allCodes) {
      expect(typeof enErrors.codes[code]).toBe('string');
      expect(enErrors.codes[code].length).toBeGreaterThan(0);
      expect(typeof viErrors.codes[code]).toBe('string');
      expect(viErrors.codes[code].length).toBeGreaterThan(0);
    }
  });

  it('GlobalHttpExceptionFilter emits structured errorCode when exception carries AppErrorCode', () => {
    const filter = new GlobalHttpExceptionFilter();
    const jsonMock = vi.fn();
    const statusMock = vi.fn(() => ({ json: jsonMock }));
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ id: 'req-m11', headers: {}, url: '/api/v1/cart' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(
      new BadRequestException({
        message: 'Self purchase blocked',
        errorCode: AppErrorCode.CANNOT_PURCHASE_OWN_PRODUCT,
      }),
      host,
    );

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: AppErrorCode.CANNOT_PURCHASE_OWN_PRODUCT,
        message: 'Self purchase blocked',
      }),
    );
  });

  it('assertCleanContent throws BadRequestException with PROFANITY_DETECTED errorCode', () => {
    expect(() => assertCleanContent('sell shotgun', 'Comment')).toThrow(BadRequestException);
    try {
      assertCleanContent('sell shotgun', 'Comment');
    } catch (err) {
      const response = (err as BadRequestException).getResponse() as Record<string, unknown>;
      expect(response.errorCode).toBe(AppErrorCode.PROFANITY_DETECTED);
    }
  });

  it('references every canonical AppErrorCode in backend/src', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const collectTsFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectTsFiles(fullPath);
        return entry.name.endsWith('.ts') ? [fullPath] : [];
      });
    const sourceCorpus = collectTsFiles(srcDir)
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    for (const code of Object.values(AppErrorCode)) {
      expect(sourceCorpus).toContain(`AppErrorCode.${code}`);
    }
  });

  it('GlobalHttpExceptionFilter maps HTTP 429 without errorCode to RATE_LIMIT_EXCEEDED', () => {
    const filter = new GlobalHttpExceptionFilter();
    const jsonMock = vi.fn();
    const statusMock = vi.fn(() => ({ json: jsonMock }));
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ id: 'req-429', headers: {}, url: '/api/v1/auth/login' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(
      new HttpException('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
      host,
    );

    expect(statusMock).toHaveBeenCalledWith(429);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        errorCode: AppErrorCode.RATE_LIMIT_EXCEEDED,
      }),
    );
  });

  it('StandardSchemaValidationPipe emits VALIDATION_ERROR on invalid route params', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ValidationProbeController],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    try {
      const res = await request(app.getHttpServer())
        .get('/m11-validation-probe/not-a-uuid')
        .expect(400);
      expect(res.body.errorCode).toBe(AppErrorCode.VALIDATION_ERROR);
    } finally {
      await app.close();
    }
  });

  it('WithdrawalService enforces WITHDRAWAL_MIN_AMOUNT and SHOP_SUSPENDED error codes', async () => {
    const prismaMock = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'seller-1',
            role: Role.SELLER,
            isShopSuspended: false,
            suspensionReason: null,
            wallet: { id: 'w-1', balance: 500_000, lockedBalance: 0, currency: 'VND' },
            sellerUpgradeRequests: [{ storeName: 'Watch Shop' }],
          })
          .mockResolvedValueOnce({
            id: 'buyer-1',
            role: Role.BUYER,
            isShopSuspended: false,
            suspensionReason: null,
            wallet: { id: 'w-2', balance: 500_000, lockedBalance: 0, currency: 'VND' },
            sellerUpgradeRequests: [],
          })
          .mockResolvedValueOnce({
            id: 'seller-suspended',
            role: Role.SELLER,
            isShopSuspended: true,
            suspensionReason: 'Policy violation',
            wallet: { id: 'w-3', balance: 500_000, lockedBalance: 0, currency: 'VND' },
            sellerUpgradeRequests: [{ storeName: 'Suspended Shop' }],
          }),
      },
    } as unknown as PrismaService;

    const service = new WithdrawalService(prismaMock);

    try {
      await service.createWithdrawal('seller-1', { amount: 25_000 }, { requireSellerRole: true });
      throw new Error('Expected seller minimum withdrawal failure');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(
        ((err as BadRequestException).getResponse() as Record<string, unknown>).errorCode,
      ).toBe(AppErrorCode.WITHDRAWAL_MIN_AMOUNT);
    }

    try {
      await service.createWithdrawal('buyer-1', { amount: 0 });
      throw new Error('Expected buyer non-positive withdrawal failure');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(
        ((err as BadRequestException).getResponse() as Record<string, unknown>).errorCode,
      ).toBe(AppErrorCode.WITHDRAWAL_MIN_AMOUNT);
    }

    try {
      await service.createWithdrawal(
        'seller-suspended',
        { amount: 100_000 },
        { requireSellerRole: true },
      );
      throw new Error('Expected suspended shop failure');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(((err as ForbiddenException).getResponse() as Record<string, unknown>).errorCode).toBe(
        AppErrorCode.SHOP_SUSPENDED,
      );
    }
  });
});
