import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { BannerService } = load('../src/modules/catalog/services/banner.service.ts');

test('creating a banner from an auction copies its content and applies existing role and destination rules', async () => {
  const auctionId = randomUUID();
  const actorId = randomUUID();
  let auction = {
    title: 'Upcoming auction',
    imageUrl: 'http://localhost:3000/uploads/media/auction.png',
    status: 'SCHEDULED',
  };
  let role = 'ADMIN';
  const created = [];
  const db = {
    auction: { findUnique: async () => auction },
    user: { findUnique: async () => ({ id: actorId, role, fullName: 'Banner operator' }) },
    $executeRaw: async () => 0,
    eventBanner: {
      create: async ({ data }) => {
        created.push(data);
        return { id: randomUUID(), ...data };
      },
    },
  };
  db.$transaction = (run) => run(db);
  const service = new BannerService(db, {});
  for (const operator of ['ADMIN', 'SUPPORT_STAFF']) {
    role = operator;
    const result = await service.createFromAuction(actorId, auctionId);
    assert.equal(result.title, auction.title);
    assert.equal(result.imageUrl, auction.imageUrl);
    assert.equal(result.auctionId, auctionId);
    assert.equal(result.targetUrl, `/auction/${auctionId}`);
    assert.equal(result.creatorId, actorId);
    assert.equal(result.creatorRole, operator === 'ADMIN' ? 'ADMIN' : 'STAFF');
    assert.equal(result.isActive, true);
    assert.equal(result.startsAt, null);
    assert.equal(result.endsAt, null);
  }
  role = 'BUYER';
  await assert.rejects(service.createFromAuction(actorId, auctionId), { status: 403 });
  role = 'ADMIN';
  for (const status of ['DRAFT', 'CANCELLED']) {
    auction.status = status;
    await assert.rejects(service.createFromAuction(actorId, auctionId), { status: 400 });
  }
  auction.status = 'SCHEDULED';
  auction.imageUrl = '   ';
  await assert.rejects(service.createFromAuction(actorId, auctionId), { status: 400 });
  auction = null;
  await assert.rejects(service.createFromAuction(actorId, auctionId), { status: 404 });
  assert.equal(created.length, 2);
});
