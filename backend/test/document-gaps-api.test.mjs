import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const source = (path) => load(`../src/${path}.ts`);

test('document gap endpoints enforce JWT roles, validate DTOs and preserve authenticated identities', async () => {
  const { PrismaService } = source('core/prisma/prisma.service');
  const { TokenAuthService } = source('core/security/token-auth.service');
  const { ReportModerationController } = source(
    'modules/commerce/controllers/report-moderation.controller',
  );
  const { ReportModerationService } = source('modules/commerce/services/report-moderation.service');
  const { AuctionCheckoutController } = source(
    'modules/commerce/controllers/auction-checkout.controller',
  );
  const { AuctionCheckoutService } = source('modules/commerce/services/auction-checkout.service');
  const { AdminReputationController } = source(
    'modules/admin/controllers/admin-reputation.controller',
  );
  const { ReputationService } = source('modules/users/services/reputation.service');
  const identities = new Map(
    ['ADMIN', 'SUPPORT_STAFF', 'BUYER'].map((role) => [role, randomUUID()]),
  );
  const jwt = new JwtService({ secret: 'isolated-api-test-secret' });
  const calls = [];
  const reports = {
    list: async (query, reporterId) => {
      calls.push({ query, reporterId });
      return { items: [], total: 0 };
    },
    review: async (id, actor, dto) => ({ id, actor, ...dto }),
  };
  class GapApiModule {}
  Module({
    controllers: [ReportModerationController, AuctionCheckoutController, AdminReputationController],
    providers: [
      {
        // The bearer value is the account id, so a fixture states who it is
        // calling as without minting a verifiable token.
        provide: TokenAuthService,
        useValue: {
          authenticate: async (token) => {
            const role = [...identities].find(([, id]) => id === token)?.[0];
            if (!role) throw new Error('unknown fixture identity');
            return {
              id: token,
              sub: token,
              email: `${token}@example.invalid`,
              role,
              accountRole: role,
              activeRole: role,
              currentMode: 'BUYER',
              isSellerActive: false,
            };
          },
        },
      },
      { provide: ConfigService, useValue: { get: () => 'isolated-api-test-secret' } },
      {
        provide: PrismaService,
        useValue: {
          user: {
            findUnique: async ({ where }) => {
              const role = [...identities].find(([, id]) => id === where.id)?.[0];
              return role ? { role, trustLevel: 'GOOD', email: 'fixture@example.invalid' } : null;
            },
          },
        },
      },
      { provide: ReportModerationService, useValue: reports },
      {
        provide: AuctionCheckoutService,
        useValue: {
          list: async (buyerId) => [{ buyerId }],
          checkout: async (id, buyerId, address) => ({ id, buyerId, address }),
          expire: async () => undefined,
        },
      },
      {
        provide: ReputationService,
        useValue: {
          adjustByAdmin: async (id, adminId, dto) => ({ id, adminId, ...dto }),
        },
      },
    ],
  })(GapApiModule);
  const app = await NestFactory.create(GapApiModule, { logger: false, abortOnError: false });
  try {
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const request = (path, role, options = {}) =>
      fetch(base + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          ...(role ? { Authorization: 'Bearer ' + identities.get(role) } : {}),
        },
      });
    const reportId = randomUUID();
    const reputationPath = `/admin/users/${randomUUID()}/reputation`;
    assert.equal((await request('/admin/reports')).status, 401);
    assert.equal((await request('/admin/reports', 'BUYER')).status, 403);
    assert.equal((await request('/admin/reports', 'SUPPORT_STAFF')).status, 200);
    assert.equal((await request('/admin/reports?limit=1000', 'ADMIN')).status, 400);
    assert.equal((await request('/commerce/reports/my', 'BUYER')).status, 200);
    assert.equal(calls.at(-1).reporterId, identities.get('BUYER'));
    assert.equal(calls.at(-1).query.page, 1);
    const reviewed = await request(`/admin/reports/${reportId}/review`, 'ADMIN', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INVESTIGATING', reason: 'Checking evidence' }),
    });
    assert.equal(reviewed.status, 200);
    assert.equal((await reviewed.json()).actor.id, identities.get('ADMIN'));
    assert.equal(
      (
        await request(reputationPath, 'SUPPORT_STAFF', {
          method: 'PATCH',
          body: JSON.stringify({ deltaPoints: 2, reason: 'Correction' }),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(reputationPath, 'ADMIN', {
          method: 'PATCH',
          body: JSON.stringify({ deltaPoints: 1.5, reason: 'Correction' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(reputationPath, 'ADMIN', {
          method: 'PATCH',
          body: JSON.stringify({ deltaPoints: 2, reason: 'Correction', userId: randomUUID() }),
        })
      ).status,
      400,
    );
    const awards = await request('/commerce/auction-awards', 'BUYER');
    assert.equal((await awards.json())[0].buyerId, identities.get('BUYER'));
    assert.equal(
      (
        await request(`/commerce/auction-awards/${randomUUID()}/checkout`, 'BUYER', {
          method: 'POST',
          body: JSON.stringify({ recipientName: 'Fixture' }),
        })
      ).status,
      400,
    );
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Gap endpoints').setVersion('1').build(),
    );
    assert.ok(doc.paths['/commerce/auction-awards/{id}/checkout'].post);
    assert.ok(doc.components.schemas.ReviewReportDto.properties.status);
    assert.ok(doc.components.schemas.AdminAdjustReputationDto.properties.deltaPoints);
  } finally {
    await app.close();
  }
});
