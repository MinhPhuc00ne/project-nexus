import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { PrismaService } = load('../src/core/prisma/prisma.service.ts');
const { TokenAuthService } = load('../src/core/security/token-auth.service.ts');
const { AuctionImageController } = load(
  '../src/modules/auction/controllers/auction-image.controller.ts',
);
const { AuctionImageService } = load('../src/modules/auction/services/auction-image.service.ts');
const { AuctionController } = load('../src/modules/auction/controllers/auction.controller.ts');
const { AuctionService } = load('../src/modules/auction/services/auction.service.ts');

test('auction images accept uploaded URLs for staff without exposing auction management privileges', async () => {
  const identities = new Map(
    ['ADMIN', 'SUPPORT_STAFF', 'SELLER', 'BUYER'].map((role) => [role, randomUUID()]),
  );
  const auction = {
    id: randomUUID(),
    status: 'SCHEDULED',
    startTime: new Date(Date.now() + 3600000),
    imageUrl: null,
    startingPrice: 123000,
  };
  const db = {
    $queryRaw: async () => [],
    user: {
      findUnique: async ({ where }) => {
        const role = [...identities].find(([, id]) => id === where.id)?.[0];
        return role ? { role, email: 'fixture@example.invalid', trustLevel: 'GOOD' } : null;
      },
    },
    auction: {
      findUnique: async ({ where }) => (where.id === auction.id ? { ...auction } : null),
      update: async ({ data }) => {
        Object.assign(auction, data);
        return { id: auction.id, imageUrl: auction.imageUrl };
      },
    },
  };
  db.$transaction = (run) => run(db);
  class FixtureModule {}
  Module({
    controllers: [AuctionImageController, AuctionController],
    providers: [
      {
        // The bearer value is the account id, so the fixture states who it is
        // calling as without minting a verifiable token.
        provide: TokenAuthService,
        useValue: {
          authenticate: async (token) => {
            const role = [...identities].find(([, id]) => id === token)?.[0];
            if (!role) throw new Error('unknown fixture identity');
            return {
              id: token,
              sub: token,
              email: 'fixture@example.invalid',
              role,
              accountRole: role,
              activeRole: role,
              currentMode: 'BUYER',
              isSellerActive: false,
            };
          },
        },
      },
      AuctionImageService,
      { provide: PrismaService, useValue: db },
      { provide: ConfigService, useValue: { get: () => 'image-test-secret' } },
      { provide: AuctionService, useValue: {} },
    ],
  })(FixtureModule);
  const app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
  const jwt = new JwtService({ secret: 'image-test-secret' });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const request = (role, body, path = `/auctions/${auction.id}/image`) =>
      fetch(base + path, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(role ? { Authorization: 'Bearer ' + identities.get(role) } : {}),
        },
        body: JSON.stringify(body),
      });
    const body = { imageUrl: 'https://example.invalid/uploads/image.png' };
    for (const role of ['ADMIN', 'SUPPORT_STAFF']) {
      const response = await request(role, body);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).imageUrl, body.imageUrl);
    }
    assert.equal(auction.startingPrice, 123000);
    for (const role of ['SELLER', 'BUYER']) assert.equal((await request(role, body)).status, 403);
    assert.equal((await request(undefined, body)).status, 401);
    for (const payload of [
      {},
      { imageUrl: null },
      { imageUrl: 'javascript:alert(1)' },
      { ...body, startingPrice: 1 },
      { ...body, startTime: '2099-01-01' },
    ])
      assert.equal((await request('SUPPORT_STAFF', payload)).status, 400);
    assert.equal((await request('SUPPORT_STAFF', body, '/auctions/invalid/image')).status, 400);
    assert.equal(
      (await request('SUPPORT_STAFF', body, `/auctions/${randomUUID()}/image`)).status,
      404,
    );
    assert.equal(
      (await request('SUPPORT_STAFF', { title: 'Forbidden' }, `/auctions/admin/${auction.id}`))
        .status,
      403,
    );
    for (const status of ['ACTIVE', 'EXTENDED', 'ENDED', 'CANCELLED', 'FAILED']) {
      auction.status = status;
      assert.equal((await request('SUPPORT_STAFF', body)).status, 400);
    }
    auction.status = 'SCHEDULED';
    auction.startTime = new Date(Date.now() - 1000);
    assert.equal((await request('SUPPORT_STAFF', body)).status, 400);
  } finally {
    await app.close();
  }
});
