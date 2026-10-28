import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { AfterSalesStoreService } = load(
  '../src/modules/commerce/services/after-sales-store.service.ts',
);
const { CancelOrderDto, QueryAfterSalesDto, QueryRefundsDto, ReceiveReturnDto } = load(
  '../src/modules/commerce/dtos/after-sales.dto.ts',
);

test('request and refund queues scope user data and restrict financial queue to staff', async () => {
  const seen = [];
  const model = {
    findMany: async (query) => {
      seen.push(query);
      return [];
    },
    count: async () => 0,
  };
  const service = new AfterSalesStoreService({ afterSalesRequest: model, orderRefund: model });
  await service.listRequests({ id: 'buyer', role: 'BUYER' }, new QueryAfterSalesDto());
  assert.deepEqual(seen[0].where.order, { OR: [{ buyerId: 'buyer' }, { sellerId: 'buyer' }] });
  assert.equal(seen[0].take, 20);
  await assert.rejects(
    service.listRefunds({ id: 'buyer', role: 'BUYER' }, new QueryRefundsDto()),
    (e) => e.getStatus() === 403,
  );
  await service.listRefunds({ id: 'staff', role: 'SUPPORT_STAFF' }, new QueryRefundsDto());
  assert.equal(seen[1].where.status, 'PENDING');
});

test('DTOs reject whitespace reasons, oversized pages, fake booleans and missing inspection decision', async () => {
  for (const [type, body] of [
    [CancelOrderDto, { reason: '   ' }],
    [CancelOrderDto, { reason: 'Cancel', refundToWallet: 'true' }],
    [QueryAfterSalesDto, { page: 0, limit: 10000 }],
    [ReceiveReturnDto, { reason: 'Received' }],
  ])
    assert.ok((await validate(plainToInstance(type, body))).length > 0);
  assert.equal(
    (
      await validate(
        plainToInstance(CancelOrderDto, { reason: 'Buyer request', refundToWallet: true }),
      )
    ).length,
    0,
  );
});
