import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Error,
    require: (name) => {
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}
const auction = { id: 'room-1', status: 'SCHEDULED', imageUrl: 'https://example.com/auction.png' };
const source = 'components/adminDashboard/Auctions/auctionBannerPromotion.ts';

test('promotes an eligible room using its backend identifier', async () => {
  let createdId;
  const policy = load(source, {
    '../../../services/banners.service': {
      listBanners: async () => [],
      createBannerFromAuction: async (id) => {
        createdId = id;
        return { id: 'banner-1', auctionId: id };
      },
    },
  });
  const result = await policy.promoteAuctionBanner(auction);
  assert.equal(createdId, 'room-1');
  assert.equal(result.created, true);
  assert.equal(result.banner.auctionId, 'room-1');
});

test('existing banners including inactive banners are not created again', async () => {
  for (const isActive of [true, false]) {
    const existing = { id: 'existing', auctionId: auction.id, isActive };
    const policy = load(source, {
      '../../../services/banners.service': {
        listBanners: async () => [existing],
        createBannerFromAuction: async () => {
          throw Error('Must not create a duplicate');
        },
      },
    });
    const result = await policy.promoteAuctionBanner(auction);
    assert.equal(result.created, false);
    assert.equal(result.banner, existing);
  }
});

test('draft, cancelled and missing-image rooms cannot be promoted', async () => {
  const policy = load(source, {
    '../../../services/banners.service': {
      listBanners: async () => {
        throw Error('Must not request');
      },
    },
  });
  for (const room of [
    { ...auction, status: 'DRAFT' },
    { ...auction, status: 'CANCELLED' },
    { ...auction, imageUrl: '  ' },
  ]) {
    assert.ok(policy.auctionBannerReason(room));
    await assert.rejects(
      policy.promoteAuctionBanner(room),
      new RegExp(policy.auctionBannerReason(room).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }
});

test('failed or truncated status lookups cannot create a potentially duplicate banner', async () => {
  const truncated = load(source, {
    '../../../services/banners.service': {
      listBanners: async () =>
        Array.from({ length: 100 }, (_, id) => ({ id, auctionId: `other-${id}` })),
      createBannerFromAuction: async () => {
        throw Error('Must not create');
      },
    },
  });
  await assert.rejects(truncated.promoteAuctionBanner(auction), /Quản lý banner/);
  const failing = load(source, {
    '../../../services/banners.service': {
      listBanners: async () => {
        throw Error('Cannot load banners');
      },
      createBannerFromAuction: async () => {
        throw Error('Must not create');
      },
    },
  });
  await assert.rejects(failing.promoteAuctionBanner(auction), /Cannot load banners/);
});

test('retry after a lost response discovers the previously created banner', async () => {
  const banners = [];
  let creates = 0;
  const policy = load(source, {
    '../../../services/banners.service': {
      listBanners: async () => banners,
      createBannerFromAuction: async (id) => {
        creates++;
        banners.push({ id: 'banner-1', auctionId: id });
        throw Error('Response lost');
      },
    },
  });
  await assert.rejects(policy.promoteAuctionBanner(auction), /Response lost/);
  const retried = await policy.promoteAuctionBanner(auction);
  assert.equal(creates, 1);
  assert.equal(retried.created, false);
});

test('promotion wrapper calls the existing backend endpoint without a request body', async () => {
  let args;
  const api = load('services/banners.service.ts', {
    './api': {
      post: async (...values) => {
        args = values;
        return { data: { data: { id: 'banner-1' } } };
      },
    },
    axios: { isAxiosError: () => false },
    '../lib/apiErrors': {},
  });
  const result = await api.createBannerFromAuction('room/1');
  assert.equal(args[0], '/staff/banners/from-auction/room%2F1');
  assert.equal(args.length, 1);
  assert.equal(result.id, 'banner-1');
});
