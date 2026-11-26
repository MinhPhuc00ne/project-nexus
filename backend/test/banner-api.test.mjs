import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import tsNode from 'ts-node';
import { requestBodySchema } from './helpers/openapi.mjs';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const source = (path) => load(`../src/${path}.ts`);

test('banner endpoints validate JWT roles, operator identity, filters and Swagger contracts', async () => {
  const { PrismaService } = source('core/prisma/prisma.service');
  const { TokenAuthService } = source('core/security/token-auth.service');
  const { BannerController } = source('modules/catalog/controllers/banner.controller');
  const { BannerService } = source('modules/catalog/services/banner.service');
  const { BannerHistoryService } = source('modules/catalog/services/banner-history.service');
  const { NotificationsController } = source(
    'modules/notifications/controllers/notifications.controller',
  );
  const { NotificationsService } = source('modules/notifications/services/notifications.service');
  const accounts = new Map(['ADMIN', 'SUPPORT_STAFF', 'BUYER'].map((role) => [role, randomUUID()]));
  const jwt = new JwtService({ secret: 'banner-api-fixture-secret' });
  const calls = [];
  const bannerId = randomUUID(),
    auctionId = randomUUID();
  const services = {
    list: async () => [],
    createFromAuction: async (actorId, sourceAuctionId) => {
      calls.push({ actorId, sourceAuctionId });
      return { id: bannerId, auctionId: sourceAuctionId };
    },
    reorder: async (actorId, bannerIds) => {
      calls.push({ actorId, bannerIds });
      return { success: true };
    },
    save: async (actorId, dto, id) => {
      calls.push({ actorId, dto, id });
      return { id: id ?? bannerId, ...dto };
    },
    remove: async (id, actorId, source) => {
      calls.push({ id, actorId, source });
      return { success: true };
    },
  };
  const fixtureHistory = {
    id: randomUUID(),
    actorId: randomUUID(),
    actorName: 'Different staff',
    bannerId,
  };
  class BannerApiModule {}
  Module({
    controllers: [BannerController, NotificationsController],
    providers: [
      {
        // The bearer value is the account id, so a fixture states who it is
        // calling as without minting a verifiable token.
        provide: TokenAuthService,
        useValue: {
          authenticate: async (token) => {
            const role = [...accounts].find(([, id]) => id === token)?.[0];
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
      { provide: ConfigService, useValue: { get: () => 'banner-api-fixture-secret' } },
      {
        provide: PrismaService,
        useValue: {
          user: {
            findUnique: async ({ where }) => {
              const role = [...accounts].find(([, id]) => id === where.id)?.[0];
              return role ? { role, email: 'fixture@example.invalid', trustLevel: 'GOOD' } : null;
            },
          },
        },
      },
      { provide: BannerService, useValue: services },
      {
        provide: BannerHistoryService,
        useValue: {
          list: async (query) => {
            calls.push({ query });
            return { items: [fixtureHistory], total: 1, page: query.page, limit: query.limit };
          },
        },
      },
      { provide: NotificationsService, useValue: {} },
    ],
  })(BannerApiModule);
  const app = await NestFactory.create(BannerApiModule, { logger: false, abortOnError: false });
  // The same filter `main.ts` registers. Without it these routes fall to
  // Nest's default handling, which is not what the app does and answered a
  // rejected query with 500 instead of 400 whenever the machine was busy.
  app.useGlobalFilters(
    new (source('core/filters/global-http-exception.filter').GlobalHttpExceptionFilter)(),
  );
  try {
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    const base = (await app.getUrl()) + '/api/v1';
    const request = (path, role, options = {}) =>
      fetch(base + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(role ? { Authorization: 'Bearer ' + accounts.get(role) } : {}),
        },
      });
    const body = {
      title: 'Auction banner',
      imageUrl: 'https://example.invalid/banner.png',
      auctionId,
      targetUrl: `/auction/${auctionId}`,
    };
    assert.equal((await request('/catalog/banners')).status, 200);
    for (const role of ['ADMIN', 'SUPPORT_STAFF']) {
      const response = await request(`/staff/banners/from-auction/${auctionId}`, role, {
        method: 'POST',
      });
      assert.equal(response.status, 201);
      assert.equal((await response.json()).auctionId, auctionId);
      assert.deepEqual(calls.at(-1), { actorId: accounts.get(role), sourceAuctionId: auctionId });
    }
    for (const [role, expected] of [
      ['BUYER', 403],
      [undefined, 401],
    ]) {
      assert.equal(
        (await request(`/staff/banners/from-auction/${auctionId}`, role, { method: 'POST' }))
          .status,
        expected,
      );
    }
    assert.equal(
      (await request('/staff/banners/from-auction/invalid', 'ADMIN', { method: 'POST' })).status,
      400,
    );
    assert.equal((await request('/staff/banner-disable-history')).status, 401);
    assert.equal((await request('/staff/banner-disable-history', 'BUYER')).status, 403);
    for (const role of ['ADMIN', 'SUPPORT_STAFF']) {
      const response = await request('/staff/banner-disable-history?limit=1', role);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).items[0].actorId, fixtureHistory.actorId);
    }
    assert.equal((await request('/staff/banner-disable-history?limit=1000', 'ADMIN')).status, 400);
    assert.equal(
      (await request('/staff/banner-disable-history?actorId=invalid', 'ADMIN')).status,
      400,
    );
    assert.equal(
      (await request('/staff/banner-disable-history?from=invalid', 'ADMIN')).status,
      400,
    );
    const disabled = await request(`/staff/banners/${bannerId}/disable`, 'SUPPORT_STAFF', {
      method: 'PATCH',
    });
    assert.equal(disabled.status, 200);
    assert.deepEqual(calls.at(-1), {
      id: bannerId,
      actorId: accounts.get('SUPPORT_STAFF'),
      source: 'DISABLE',
    });
    assert.equal(
      (await request(`/staff/banners/${bannerId}`, 'SUPPORT_STAFF', { method: 'DELETE' })).status,
      200,
    );
    assert.equal(calls.at(-1).actorId, accounts.get('SUPPORT_STAFF'));
    assert.equal(
      (await request(`/staff/banners/${bannerId}`, 'BUYER', { method: 'DELETE' })).status,
      403,
    );
    assert.equal(
      (await request('/staff/banners/invalid/disable', 'ADMIN', { method: 'PATCH' })).status,
      400,
    );
    assert.equal(
      (
        await request('/staff/banners', 'SUPPORT_STAFF', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      ).status,
      201,
    );
    assert.equal(calls.at(-1).actorId, accounts.get('SUPPORT_STAFF'));
    assert.equal(
      (
        await request('/staff/banners', 'ADMIN', {
          method: 'POST',
          body: JSON.stringify({ ...body, creatorRole: 'ADMIN' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/staff/banners', 'ADMIN', {
          method: 'POST',
          body: JSON.stringify({ ...body, targetUrl: 'javascript:alert(1)' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (await request('/staff/banner-disable-history', 'ADMIN', { method: 'DELETE' })).status,
      404,
    );
    for (const role of ['ADMIN', 'SUPPORT_STAFF']) {
      const response = await request('/staff/banners/order', role, {
        method: 'PATCH',
        body: JSON.stringify({ bannerIds: [bannerId] }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(calls.at(-1), { actorId: accounts.get(role), bannerIds: [bannerId] });
    }
    for (const bannerIds of [
      [],
      [bannerId, bannerId],
      ['invalid'],
      Array.from({ length: 101 }, () => randomUUID()),
    ]) {
      assert.equal(
        (
          await request('/staff/banners/order', 'ADMIN', {
            method: 'PATCH',
            body: JSON.stringify({ bannerIds }),
          })
        ).status,
        400,
      );
    }
    assert.equal(
      (
        await request('/staff/banners/order', 'BUYER', {
          method: 'PATCH',
          body: JSON.stringify({ bannerIds: [bannerId] }),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('/staff/banners/order', undefined, {
          method: 'PATCH',
          body: JSON.stringify({ bannerIds: [bannerId] }),
        })
      ).status,
      401,
    );
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Banner API').setVersion('1').build(),
    );
    assert.ok(
      document.paths['/api/v1/staff/banner-disable-history'].get.parameters.find(
        (param) => param.name === 'actorId',
      ),
    );
    assert.ok(document.paths['/api/v1/staff/banners/{id}/disable'].patch.responses['200']);
    for (const schema of [
      'BannerResponseDto',
      'BannerHistoryPageDto',
      'BannerDisableHistoryDto',
      'NotificationResponseDto',
    ])
      assert.ok(document.components.schemas[schema], schema);
    assert.ok(document.components.schemas.NotificationResponseDto.properties.targetUrl);
    assert.ok(document.components.schemas.BannerDisableHistoryDto.properties.creatorRole);
    assert.equal(
      requestBodySchema(document, '/api/v1/staff/banners', 'post').properties.priority.deprecated,
      undefined,
    );
  } finally {
    await app.close();
  }
});
