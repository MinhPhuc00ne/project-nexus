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
const { GhnOrderActionService } = load(
  '../src/modules/fulfillment/services/ghn-order-action.service.ts',
);
const shipment = { waybillCode: 'G1', metadata: { ghnShopId: 12, ghnEnvironment: 'SANDBOX' } };
const service = new GhnOrderActionService({
  get: (key) =>
    ({
      GHN_TOKEN: 'test-token',
      GHN_API_URL: 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2',
    })[key],
});

test('cancel uses saved shop context and validates the exact per-order success result', async (t) => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, options };
    return Response.json({ code: 200, data: [{ order_code: 'G1', result: true }] });
  });
  await service.change('cancel', shipment, 'Buyer requested');
  assert.equal(
    request.url,
    'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/switch-status/cancel',
  );
  assert.equal(request.options.headers.ShopId, '12');
  assert.deepEqual(JSON.parse(request.options.body).order_codes, ['G1']);
  assert.equal(JSON.parse(request.options.body).reason, 'Buyer requested');
});

test('HTTP 200 with per-order failure or mismatched code never confirms a return', async (t) => {
  for (const data of [
    [{ order_code: 'G1', result: false }],
    [{ order_code: 'OTHER', result: true }],
    null,
  ]) {
    const mocked = t.mock.method(globalThis, 'fetch', async () =>
      Response.json({ code: 200, data }),
    );
    await assert.rejects(service.change('return', shipment));
    mocked.mock.restore();
  }
});

test('carrier timeout and server failure remain uncertain; wrong environment never makes a request', async (t) => {
  const mocked = t.mock.method(globalThis, 'fetch', async () => {
    throw Error('timeout');
  });
  await assert.rejects(service.change('cancel', shipment), (e) => e.getStatus() === 502);
  await assert.rejects(
    service.change('return', {
      ...shipment,
      metadata: { ghnShopId: 12, ghnEnvironment: 'PRODUCTION' },
    }),
  );
  assert.equal(mocked.mock.callCount(), 1);
});
