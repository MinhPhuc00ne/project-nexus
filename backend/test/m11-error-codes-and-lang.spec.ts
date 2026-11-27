import * as fs from 'node:fs';
import * as path from 'node:path';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import { assertCleanContent } from '../src/core/moderation/content-moderation.util';

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
});
