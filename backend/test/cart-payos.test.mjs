import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { CartService } = load('../src/modules/commerce/services/cart.service.ts');
const { PayosService } = load('../src/modules/commerce/services/payos.service.ts');

test('CartService prevents seller from adding their own product to cart', async () => {
  const tx = {
    cart: {
      upsert: mock.fn(async () => ({ id: 'cart-1' })),
    },
    $queryRaw: mock.fn(async () => []),
    product: {
      findUnique: mock.fn(async () => ({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: 'ACTIVE',
        seller: { isShopSuspended: false },
        inventories: [{ availableQty: 5 }],
        options: [],
      })),
    },
  };

  const prisma = {
    $transaction: async (run) => run(tx),
  };

  const cartService = new CartService(prisma);
  await assert.rejects(
    cartService.addToCart('seller-1', { productId: 'prod-1', quantity: 1 }),
    (err) => err.getStatus() === 400,
  );
});

test('CartService rejects quantities exceeding available warehouse inventory', async () => {
  const tx = {
    cart: {
      upsert: mock.fn(async () => ({ id: 'cart-1' })),
    },
    $queryRaw: mock.fn(async () => []),
    product: {
      findUnique: mock.fn(async () => ({
        id: 'prod-1',
        sellerId: 'seller-1',
        status: 'ACTIVE',
        basePrice: 100000,
        seller: { isShopSuspended: false },
        inventories: [{ availableQty: 2 }],
        options: [],
      })),
    },
    cartItem: {
      aggregate: mock.fn(async () => ({ _sum: { quantity: 1 } })),
    },
  };

  const prisma = {
    $transaction: async (run) => run(tx),
  };

  const cartService = new CartService(prisma);
  await assert.rejects(
    cartService.addToCart('buyer-1', { productId: 'prod-1', quantity: 2 }),
    (err) => err.getStatus() === 400,
  );
});

test('PayosService verifies webhook signatures and wraps invalid signature errors cleanly', async () => {
  const configService = {
    get: () => 'dummy-key',
  };
  const payosService = new PayosService(configService);

  payosService.payOS = {
    webhooks: {
      verify: mock.fn(async (body) => {
        if (body.signature === 'valid') {
          return { orderCode: 12345, amount: 50000 };
        }
        throw new Error('Invalid checksum');
      }),
      confirm: mock.fn(async (url) => ({ webhookUrl: url })),
    },
    paymentRequests: {
      create: mock.fn(async () => ({ checkoutUrl: 'https://pay.payos.vn/web/123' })),
      get: mock.fn(async (id) => ({ id, status: 'PAID' })),
    },
  };

  const verified = await payosService.verifyWebhook({ signature: 'valid' });
  assert.equal(verified.orderCode, 12345);

  await assert.rejects(
    payosService.verifyWebhook({ signature: 'tampered' }),
    (err) => err.getStatus() === 400,
  );

  const link = await payosService.createPaymentLink({ orderCode: 12345, amount: 50000 });
  assert.equal(link.checkoutUrl, 'https://pay.payos.vn/web/123');
});
