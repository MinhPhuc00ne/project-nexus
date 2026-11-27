import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { AfterSalesStoreService } = load(
  '../src/modules/after-sales/services/after-sales-store.service.ts',
);
const { CancelOrderSchema, QueryAfterSalesSchema, QueryRefundsSchema, ReceiveReturnSchema } = load(
  '../src/modules/after-sales/dtos/after-sales.dto.ts',
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
  await service.listRequests({ id: 'buyer', role: 'BUYER' }, QueryAfterSalesSchema.parse({}));
  assert.deepEqual(seen[0].where.order, { OR: [{ buyerId: 'buyer' }, { sellerId: 'buyer' }] });
  assert.equal(seen[0].take, 20);
  await assert.rejects(
    service.listRefunds({ id: 'buyer', role: 'BUYER' }, QueryRefundsSchema.parse({})),
    (e) => e.getStatus() === 403,
  );
  await service.listRefunds({ id: 'staff', role: 'SUPPORT_STAFF' }, QueryRefundsSchema.parse({}));
  assert.equal(seen[1].where.status, 'PENDING');
});

test('schemas reject whitespace reasons, oversized pages, fake booleans and missing inspection decision', () => {
  for (const [schema, body, what] of [
    [CancelOrderSchema, { reason: '   ' }, 'a reason of nothing but spaces'],
    [CancelOrderSchema, { reason: 'Cancel', refundToWallet: 'true' }, 'a boolean sent as a string'],
    [QueryAfterSalesSchema, { page: 0, limit: 10000 }, 'a page below 1 and a page size above 100'],
    [ReceiveReturnSchema, { reason: 'Received' }, 'a receipt that omits the restock decision'],
    [CancelOrderSchema, { reason: 'Cancel', surprise: 1 }, 'a field nobody asked for'],
    [
      CancelOrderSchema,
      { reason: 'Cancel', evidenceUrls: ['http://pics.example/a.png'] },
      'evidence served over plaintext http',
    ],
  ])
    assert.equal(schema.safeParse(body).success, false, what);

  const accepted = CancelOrderSchema.safeParse({ reason: 'Buyer request', refundToWallet: true });
  assert.equal(accepted.success, true);

  // The page defaults the class carried as field initialisers are the schema's.
  assert.deepEqual(QueryAfterSalesSchema.parse({}), { page: 1, limit: 20 });
  assert.equal(QueryRefundsSchema.parse({}).status, 'PENDING');
});
