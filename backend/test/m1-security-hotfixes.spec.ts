import {
  ArgumentsHost,
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { TokenAuthService } from '../src/core/security/token-auth.service';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Role } from '@nexus/types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import { RBAC_PRIVILEGES_MAP, RolesGuard } from '../src/core/security/roles.guard';
import type { CloudinaryStorageService } from '../src/core/storage/cloudinary.service';
import type { MailService } from '../src/core/mail/mail.service';
import type { PrismaService } from '../src/core/prisma/prisma.service';
import type { RedisService } from '../src/core/redis/redis.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { MediaService } from '../src/modules/media/services/media.service';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function collectControllerFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectControllerFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function createMockExecutionContext(user?: { role: Role }): ExecutionContext {
  return {
    getHandler: () => (() => undefined) as never,
    getClass: () => class TestController {} as never,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('M1 Security Hotfixes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RolesGuard fail-closed enforcement & controller privilege coverage', () => {
    it('fails closed when @RequirePrivilege references an unknown privilege key', () => {
      const reflector = {
        getAllAndOverride: vi
          .fn()
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce('UNKNOWN.PRIVILEGE'),
      } as unknown as Reflector;

      const guard = new RolesGuard(reflector);
      const ctx = createMockExecutionContext({ role: Role.ADMIN });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('fails closed when user context is missing', () => {
      const reflector = {
        getAllAndOverride: vi.fn().mockReturnValueOnce([Role.BUYER]).mockReturnValueOnce(undefined),
      } as unknown as Reflector;

      const guard = new RolesGuard(reflector);
      expect(() => guard.canActivate(createMockExecutionContext(undefined))).toThrow(
        ForbiddenException,
      );
    });

    it('allows granted role and denies ungranted role for defined privilege', () => {
      const makeGuard = () => {
        const reflector = {
          getAllAndOverride: vi
            .fn()
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce('CATEGORY.MANAGE'),
        } as unknown as Reflector;
        return new RolesGuard(reflector);
      };

      expect(makeGuard().canActivate(createMockExecutionContext({ role: Role.ADMIN }))).toBe(true);
      expect(() =>
        makeGuard().canActivate(createMockExecutionContext({ role: Role.BUYER })),
      ).toThrow(ForbiddenException);
    });

    it('fails closed when @Roles() is empty array or @RequirePrivilege is empty string', () => {
      const emptyRolesReflector = {
        getAllAndOverride: vi.fn().mockReturnValueOnce([]).mockReturnValueOnce(undefined),
      } as unknown as Reflector;
      const emptyRolesGuard = new RolesGuard(emptyRolesReflector);
      expect(() =>
        emptyRolesGuard.canActivate(createMockExecutionContext({ role: Role.ADMIN })),
      ).toThrow(ForbiddenException);

      const emptyPrivilegeReflector = {
        getAllAndOverride: vi.fn().mockReturnValueOnce(undefined).mockReturnValueOnce(''),
      } as unknown as Reflector;
      const emptyPrivilegeGuard = new RolesGuard(emptyPrivilegeReflector);
      expect(() =>
        emptyPrivilegeGuard.canActivate(createMockExecutionContext({ role: Role.ADMIN })),
      ).toThrow(ForbiddenException);
    });

    it('ensures every @RequirePrivilege key in all backend controllers exists in RBAC_PRIVILEGES_MAP', () => {
      const controllerFiles = collectControllerFiles(path.resolve(__dirname, '../src'));
      expect(controllerFiles.length).toBeGreaterThan(0);

      const privilegePattern = /@RequirePrivilege\(\s*['"]([^'"]+)['"]\s*\)/g;
      const discoveredPrivileges = new Set<string>();

      for (const filePath of controllerFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const match of content.matchAll(privilegePattern)) {
          discoveredPrivileges.add(match[1]);
        }
      }

      expect(discoveredPrivileges.size).toBeGreaterThan(0);
      for (const key of discoveredPrivileges) {
        expect(Object.prototype.hasOwnProperty.call(RBAC_PRIVILEGES_MAP, key)).toBe(true);
        expect(RBAC_PRIVILEGES_MAP[key].length).toBeGreaterThan(0);
      }
    });
  });

  describe('GlobalHttpExceptionFilter error sanitization & UUID traceId', () => {
    it('hides raw 500 Error.message and emits a UUID v4 traceId', () => {
      const filter = new GlobalHttpExceptionFilter();
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock }),
          getRequest: () => ({ url: '/api/v1/test', headers: {} }),
        }),
      } as unknown as ArgumentsHost;

      filter.catch(new Error('FATAL: password=supersecret leaked'), host);

      expect(statusMock).toHaveBeenCalledWith(500);
      const body = jsonMock.mock.calls[0][0] as {
        statusCode: number;
        message: string;
        traceId: string;
      };
      expect(body.statusCode).toBe(500);
      expect(body.message).toBe('Internal server error occurred');
      expect(body.message).not.toContain('supersecret');
      expect(body.traceId).toMatch(UUID_V4_PATTERN);
    });

    it('preserves explicit HttpException status and message', () => {
      const filter = new GlobalHttpExceptionFilter();
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock }),
          getRequest: () => ({
            url: '/api/v1/items',
            headers: { 'x-request-id': 'custom-req-123' },
          }),
        }),
      } as unknown as ArgumentsHost;

      filter.catch(new HttpException('Not permitted', 403), host);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Not permitted',
          traceId: 'custom-req-123',
        }),
      );
    });

    it('honours an HTTP error thrown by another copy of Nest', () => {
      // A monorepo can end up with the request pipeline and whatever threw
      // holding different module instances of `@nestjs/common`, and then a
      // BadRequestException raised by a validation pipe is not an
      // `HttpException` to this filter. The symptom was the worst kind: a
      // rejected request answered as 500, intermittently, with the real reason
      // swallowed. The filter checks the shape as well as the class.
      const filter = new GlobalHttpExceptionFilter();
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock }),
          getRequest: () => ({ url: '/api/v1/items', headers: {} }),
        }),
      } as unknown as ArgumentsHost;

      const foreign = {
        message: 'Validation failed',
        getStatus: () => 400,
        getResponse: () => ({ message: ['limit must not exceed 100'], error: 'Bad Request' }),
      };

      filter.catch(foreign, host);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          errorCode: 'Bad Request',
          message: ['limit must not exceed 100'],
        }),
      );
    });

    it('does not mistake an ordinary object for an HTTP error', () => {
      const filter = new GlobalHttpExceptionFilter();
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusMock }),
          getRequest: () => ({ url: '/api/v1/items', headers: {} }),
        }),
      } as unknown as ArgumentsHost;

      // Shape alone is not enough: a status outside the error range, or no way
      // to report one, is not something to answer the client with.
      for (const thrown of [
        { getStatus: () => 200, getResponse: () => ({}) },
        { getStatus: () => 'teapot', getResponse: () => ({}) },
        { message: 'looks like an error' },
        'a bare string',
      ]) {
        statusMock.mockClear();
        jsonMock.mockClear();
        filter.catch(thrown, host);
        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock.mock.calls[0][0].message).toBe('Internal server error occurred');
      }
    });
  });

  describe('MediaService SVG blocking, magic bytes, orphan file prevention & APP_PUBLIC_URL', () => {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
      0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
      0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    function createMediaFile(overrides: Partial<Express.Multer.File>): Express.Multer.File {
      return {
        fieldname: 'file',
        originalname: 'photo.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: validPngBuffer,
        size: validPngBuffer.length,
        destination: '',
        filename: '',
        path: '',
        stream: undefined as never,
        ...overrides,
      };
    }

    it('rejects .svg uploads and spoofed magic bytes', async () => {
      const configService = new ConfigService({});
      const cloudinary = {
        uploadFile: vi.fn(),
      } as unknown as CloudinaryStorageService;
      const service = new MediaService(configService, cloudinary);

      const svgFile = createMediaFile({
        originalname: 'xss.svg',
        mimetype: 'image/svg+xml',
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ),
      });
      await expect(service.uploadMedia(svgFile)).rejects.toThrow(
        /Định dạng file không được hỗ trợ/,
      );

      const spoofedPng = createMediaFile({
        originalname: 'fake.png',
        mimetype: 'image/png',
        buffer: Buffer.from('MZ\x90\x00not-really-a-png-file-payload'),
      });
      await expect(service.uploadMedia(spoofedPng)).rejects.toThrow(/Nội dung file không khớp/);

      const truncatedTiff = createMediaFile({
        originalname: 'truncated.tiff',
        mimetype: 'image/tiff',
        buffer: Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00]),
      });
      await expect(service.uploadMedia(truncatedTiff)).rejects.toThrow(BadRequestException);

      const dotfileSvgWithPngBytes = createMediaFile({
        originalname: '.svg',
        mimetype: 'image/png',
        buffer: validPngBuffer,
      });
      await expect(service.uploadMedia(dotfileSvgWithPngBytes)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('writes zero local disk files when Cloudinary is configured', async () => {
      const configService = new ConfigService({
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: 'demo-key',
        CLOUDINARY_API_SECRET: 'demo-secret',
      });
      const cloudinary = {
        uploadFile: vi.fn().mockResolvedValue({
          url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.png',
          publicId: 'nexus/media/sample',
        }),
      } as unknown as CloudinaryStorageService;

      const mediaDir = path.join(process.cwd(), 'uploads', 'media');
      const beforeFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];

      const service = new MediaService(configService, cloudinary);
      const result = await service.uploadMedia(createMediaFile({}));

      const afterFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];
      expect(result.url).toBe('https://res.cloudinary.com/demo/image/upload/v1/sample.png');
      expect(result.publicId).toBe('nexus/media/sample');
      expect(afterFiles).toEqual(beforeFiles);
    });

    it('uses APP_PUBLIC_URL instead of req.get(host) when falling back to local disk', async () => {
      const configService = new ConfigService({
        APP_PUBLIC_URL: 'https://media.nexus.example.com/',
        NODE_ENV: 'production',
      });
      const cloudinary = {
        uploadFile: vi.fn(),
      } as unknown as CloudinaryStorageService;

      const service = new MediaService(configService, cloudinary);
      const spoofedReq = { get: vi.fn().mockReturnValue('evil.attacker.com') } as never;
      const result = await service.uploadMedia(createMediaFile({}), spoofedReq);
      const savedPath = path.join(process.cwd(), 'uploads', 'media', result.fileName);

      try {
        expect(result.url).toBe(`https://media.nexus.example.com/uploads/media/${result.fileName}`);
        expect(result.url).not.toContain('evil.attacker.com');
        expect(fs.existsSync(savedPath)).toBe(true);
      } finally {
        if (fs.existsSync(savedPath)) {
          fs.unlinkSync(savedPath);
        }
      }
    });
  });

  describe('AuthService OTP CSPRNG & no devOtpCode leakage', () => {
    it('omits devOtpCode from register and forgotPassword responses and avoids Math.random for OTPs', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const sentEmails: Array<{ html?: string }> = [];
      let registerOtp: string | undefined;
      let forgotOtp: string | undefined;

      const testEmail = 'buyer@nexus.test';
      const prismaMock = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          findFirst: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: testEmail,
            personalEmail: null,
            role: 'BUYER',
            isVerified: true,
            codeExpiresAt: null,
          }),
          upsert: vi
            .fn()
            .mockImplementation(async (args: { create: { verificationCode: string } }) => {
              registerOtp = args.create.verificationCode;
              return { id: 'user-1', email: testEmail };
            }),
          update: vi
            .fn()
            .mockImplementation(async (args: { data: { verificationCode: string } }) => {
              forgotOtp = args.data.verificationCode;
              return { id: 'user-1' };
            }),
        },
      } as unknown as PrismaService;

      const mailMock = {
        sendEmail: vi.fn().mockImplementation(async (opts: { html?: string }) => {
          sentEmails.push(opts);
        }),
      } as unknown as MailService;

      const configMock = new ConfigService({
        JWT_SECRET: 'test-jwt-secret-at-least-16',
        REFRESH_TOKEN_SECRET: 'test-refresh-secret-at-least-16',
      });

      // Access tokens are minted by TokenAuthService; this test only exercises
      // OTP generation and response shape, so a no-op signer is enough.
      const tokenAuthMock = {
        signAccessToken: vi.fn(async () => 'test-access-token'),
        revokeAllSessions: vi.fn(async () => undefined),
      } as unknown as TokenAuthService;

      const authService = new AuthService(
        prismaMock,
        configMock,
        {} as never,
        tokenAuthMock,
        {} as unknown as RedisService,
        mailMock,
      );

      const mathRandomSpy = vi.spyOn(Math, 'random');

      try {
        const registerRes = await authService.register({
          email: testEmail,
          password: 'Password123!',
          fullName: 'Buyer One',
        });

        expect('devOtpCode' in registerRes).toBe(false);
        expect(registerOtp).toMatch(/^\d{6}$/);
        expect(Number(registerOtp)).toBeGreaterThanOrEqual(100000);
        expect(Number(registerOtp)).toBeLessThan(1000000);
        expect(sentEmails[0]?.html).toContain(registerOtp);

        const forgotRes = await authService.forgotPassword({
          email: testEmail,
        });

        expect('devOtpCode' in forgotRes).toBe(false);
        expect(forgotOtp).toMatch(/^\d{6}$/);
        expect(Number(forgotOtp)).toBeGreaterThanOrEqual(100000);
        expect(Number(forgotOtp)).toBeLessThan(1000000);
        expect(sentEmails).toHaveLength(2);
        expect(sentEmails[1]?.html).toContain(forgotOtp);
        expect(mathRandomSpy).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = previousNodeEnv;
      }
    });
  });
});
