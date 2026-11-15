import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function loadSource(relativePath, dependencies = {}) {
  const filename = path.join(fileURLToPath(new URL('../src/', import.meta.url)), relativePath);
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '({})');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require: (name) => {
        if (name in dependencies) return dependencies[name];
        throw new Error(`Unexpected import: ${name}`);
      },
      URLSearchParams,
    },
    { filename },
  );
  return module.exports;
}

const policy = loadSource('types/admin-auction-operations.types.ts');
const deadline = Date.parse('2026-11-16T10:00:00Z');
const award = {
  status: 'AWAITING_CHECKOUT',
  tier: 'PRIMARY_WINNER',
  expiresAt: new Date(deadline).toISOString(),
  canConfirmPaymentDefault: true,
  canMarkNotBuying: false,
};

test('payment default is unavailable before the deadline and after payment', () => {
  assert.equal(policy.canConfirmAwardAction(award, 'payment-default', deadline - 1), false);
  assert.equal(policy.canConfirmAwardAction(award, 'payment-default', deadline), true);
  assert.equal(
    policy.canConfirmAwardAction({ ...award, status: 'PAID' }, 'payment-default', deadline),
    false,
  );
  assert.equal(
    policy.canConfirmAwardAction(
      { ...award, canConfirmPaymentDefault: false },
      'payment-default',
      deadline,
    ),
    false,
  );
});
test('withdrawal only applies to a live second-chance offer', () => {
  const second = { ...award, tier: 'SECOND_CHANCE', canMarkNotBuying: true };
  for (const status of ['AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT'])
    assert.equal(policy.canConfirmAwardAction({ ...second, status }, 'not-buying', deadline), true);
  for (const status of ['PAID', 'DECLINED', 'BUYER_WITHDRAWN', 'EXPIRED', 'PAYMENT_DEFAULT'])
    assert.equal(
      policy.canConfirmAwardAction({ ...second, status }, 'not-buying', deadline),
      false,
    );
  assert.equal(
    policy.canConfirmAwardAction({ ...second, tier: 'PRIMARY_WINNER' }, 'not-buying', deadline),
    false,
  );
});
test('only active or extended lots can be ended', () => {
  for (const lotStatus of ['ACTIVE', 'EXTENDED'])
    assert.equal(policy.canEndAuctionLot({ lotStatus }), true);
  for (const lotStatus of ['DRAFT', 'SCHEDULED', 'ENDED', 'SETTLED', 'FAILED', 'CANCELLED'])
    assert.equal(policy.canEndAuctionLot({ lotStatus }), false);
});

function loadService(
  apiRequest,
  get = async () => ({
    data: {
      data: {
        serverTime: '2026-11-16T10:00:00Z',
        introDurationMs: 12100,
        elapsedMs: 1200,
        isIntroActive: true,
      },
    },
  }),
) {
  return loadSource('services/auction.service.ts', {
    './api': { __esModule: true, default: { get }, apiRequest, API_BASE_URL: '/api/v1' },
    './auth': { getStoredToken: () => 'test-token' },
    'socket.io-client': {},
    '@nexus/types': {},
  });
}
test('admin lot data combines protected reserve/notes/award with live bid history and server clock', async () => {
  const service = loadService(async (url) =>
    url.includes('/admin/')
      ? {
          items: [
            {
              id: 'lot-1',
              reservePrice: '90000',
              staffNote: 'Checked',
              awards: [{ id: 'award-1', status: 'PAID', buyer: { fullName: 'Buyer' } }],
            },
          ],
        }
      : { lots: [{ id: 'lot-1', bids: [{ id: 'bid-1' }], reservePrice: null }] },
  );
  const result = await service.getAdminAuctionLotsApi('auction-1');
  assert.equal(result.lots[0].reservePrice, '90000');
  assert.equal(result.lots[0].staffNote, 'Checked');
  assert.equal(result.lots[0].activeAward.id, 'award-1');
  assert.equal(result.lots[0].bids[0].id, 'bid-1');
  assert.equal(result.serverTime, '2026-11-16T10:00:00Z');
  assert.equal(result.isIntroActive, true);
});
test('admin data errors are surfaced instead of silently showing public data', async () => {
  const service = loadService(async (url) => {
    if (url.includes('/admin/')) throw new Error('Forbidden');
    return { lots: [] };
  });
  await assert.rejects(service.getAdminAuctionLotsApi('auction-1'), /Forbidden/);
});
test('mutation and filter requests match the documented payloads', async () => {
  const requests = [];
  const service = loadService(async (url, options) => {
    requests.push({ url, options });
    return [];
  });
  await service.confirmAdminAuctionAwardApi('award-1', 'payment-default', '  checked  ');
  await service.listAdminAuctionComplaintsApi('auction-1', 'OPEN');
  await service.resolveAdminAuctionComplaintApi('complaint-1', 'REJECTED', '  no evidence  ');
  await service.saveAdminAuctionLotNoteApi('lot-1', '  verified  ');
  const normalized = JSON.parse(JSON.stringify(requests));
  assert.deepEqual(normalized[0], {
    url: '/auctions/admin/awards/award-1/payment-default',
    options: { method: 'POST', body: { confirmed: true, note: 'checked' }, requireAuth: true },
  });
  assert.match(normalized[1].url, /status=OPEN/);
  assert.deepEqual(normalized[2].options.body, { status: 'REJECTED', adminNote: 'no evidence' });
  assert.deepEqual(normalized[3].options.body, { staffNote: 'verified' });
});
