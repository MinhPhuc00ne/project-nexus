import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';
import { fixture as afterSalesFixture, admin } from './after-sales-fixture.mjs';
tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { OrderEscrowService } = load('../src/modules/commerce/services/order-escrow.service.ts');
const { OrderService } = load('../src/modules/commerce/services/order.service.ts');
const { SellerEngagementService } = load(
  '../src/modules/reviews/services/seller-engagement.service.ts',
);
const { OrderPaymentHelper } = load('../src/modules/commerce/services/order-payment.helper.ts');
const { PayosWebhookService } = load('../src/modules/wallet/services/payos-webhook.service.ts');

function fixture() {
  const order = {
    id: 'o1',
    sellerId: 'seller',
    buyerId: 'buyer',
    subtotal: 100000,
    shippingFee: 30000,
    totalAmount: 130000,
    status: 'DELIVERED',
    shipment: { status: 'DELIVERED', metadata: { tracking: { status: 'delivered' } } },
    dispute: null,
    escrowRecord: { status: 'HELD', totalAmount: 130000, platformFee: 7000, sellerPayout: 93000 },
  };
  const tx = {
    $queryRaw: mock.fn(async () => []),
    order: {
      findUnique: async () => order,
      update: mock.fn(async ({ data }) => Object.assign(order, data)),
    },
    escrowRecord: {
      upsert: mock.fn(async ({ create }) => order.escrowRecord ?? create),
      update: mock.fn(async ({ data }) => Object.assign(order.escrowRecord, data)),
    },
    wallet: {
      upsert: mock.fn(async ({ where }) => ({ id: `wallet-${where.userId}` })),
      update: mock.fn(async () => ({})),
    },
    walletTransaction: { create: mock.fn(async ({ data }) => data) },
    user: { update: mock.fn(async () => ({ reputationScore: 102 })) },
    reputationLog: { create: mock.fn(async () => ({})) },
    notification: { create: mock.fn(async () => ({})) },
    dispute: {
      create: mock.fn(async ({ data }) => {
        order.dispute = { status: 'OPEN', ...data };
        return order.dispute;
      }),
      update: mock.fn(async ({ data }) => Object.assign(order.dispute, data)),
    },
  };
  let queue = Promise.resolve();
  const prisma = {
    $transaction: (run) => {
      const next = queue.then(() => run(tx));
      queue = next.catch(() => {});
      return next;
    },
  };
  const service = new OrderEscrowService(
    prisma,
    { getAll: async () => ({ platformFeePercentage: 7 }) },
    { getOrCreatePrimaryAdminWallet: async () => ({ id: 'admin-wallet' }) },
  );
  return { service, tx, order };
}

test('payment holds funds; commission excludes shipping and admin wallet holds totalAmount', async () => {
  const f = fixture();
  f.order.escrowRecord = null;
  const result = await f.service.hold(f.tx, f.order);
  assert.equal(result.platformFee, 7000);
  assert.equal(result.sellerPayout, 93000);
  assert.equal(result.escrowStatus, 'HELD');
  assert.equal(f.tx.wallet.update.mock.callCount(), 1);
  assert.equal(f.tx.wallet.update.mock.calls[0].arguments[0].data.balance.increment, 130000);
  assert.equal(f.tx.walletTransaction.create.mock.callCount(), 1);
  assert.equal(f.tx.walletTransaction.create.mock.calls[0].arguments[0].data.type, 'ESCROW_LOCK');
});

test('verified buyer confirmation releases funds and awards reputation exactly once', async () => {
  const f = fixture();
  await Promise.all([
    f.service.confirmDelivery('o1', 'buyer'),
    f.service.confirmDelivery('o1', 'buyer'),
  ]);
  assert.equal(f.order.status, 'CONFIRMED');
  assert.equal(f.order.escrowRecord.status, 'DISBURSED');
  assert.equal(f.tx.wallet.update.mock.callCount(), 2);
  assert.equal(f.tx.wallet.update.mock.calls[0].arguments[0].data.balance.increment, 93000);
  assert.equal(f.tx.wallet.update.mock.calls[1].arguments[0].data.balance.decrement, 123000);
  assert.equal(f.tx.reputationLog.create.mock.callCount(), 2);
  assert.equal(f.tx.notification.create.mock.callCount(), 1);
});

test('strangers cannot release escrow', async () => {
  const f = fixture();
  await assert.rejects(
    f.service.confirmDelivery('o1', 'stranger'),
    (error) => error.getStatus() === 403,
  );
  assert.equal(f.tx.wallet.update.mock.callCount(), 0);
});

test('unverified or incomplete delivery never releases funds', async () => {
  const f = fixture();
  f.order.shipment.metadata.tracking.status = 'transporting';
  await assert.rejects(
    f.service.confirmDelivery('o1', 'buyer'),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.tx.wallet.update.mock.callCount(), 0);
});

test('buyer dispute freezes escrow and blocks receipt settlement', async () => {
  const f = fixture();
  await f.service.dispute('o1', 'buyer', 'Hàng không đúng mô tả');
  assert.equal(f.order.escrowRecord.status, 'DISPUTED');
  await assert.rejects(
    f.service.confirmDelivery('o1', 'buyer'),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.tx.wallet.update.mock.callCount(), 0);
});

test('staff resolution refunds buyer wallet once and does not pay seller', async () => {
  const f = afterSalesFixture();
  f.state.dispute = { status: 'OPEN', orderId: 'o1' };
  f.state.escrow.status = 'DISPUTED';
  f.tx.dispute = { update: async ({ data }) => Object.assign(f.state.dispute, data) };
  const service = new OrderEscrowService(f.prisma, {}, f.finance, f.refunds);
  await service.resolve('o1', admin, 'BUYER', 'Verified evidence');
  await service.resolve('o1', admin, 'BUYER', 'Duplicate resolution');
  assert.equal(f.state.order.status, 'REFUNDED');
  assert.equal(f.state.escrow.status, 'REFUNDED');
  assert.equal(f.state.refunds.length, 1);
  assert.equal(f.state.wallets.find((w) => w.userId === 'buyer').balance, 130000);
  assert.equal(f.state.wallets.find((w) => w.userId === 'seller').balance, 0);
});

test('buyer cannot grant themselves a refund through arbitration', async () => {
  const f = fixture();
  await assert.rejects(
    f.service.resolve('o1', { id: 'buyer', role: 'BUYER' }, 'BUYER', 'Refund'),
    (error) => error.getStatus() === 403,
  );
  assert.equal(f.tx.wallet.update.mock.callCount(), 0);
});

test('legacy disbursed money is never disbursed a second time', async () => {
  const f = fixture();
  f.order.escrowRecord.status = 'DISBURSED';
  await assert.rejects(f.service.confirmDelivery('o1', 'buyer'));
  assert.equal(f.tx.wallet.update.mock.callCount(), 0);
});

function paymentFixture() {
  const payment = { id: 'p1', orderId: 'o1', amount: 130000, metadata: {}, status: 'PENDING' };
  const order = {
    id: 'o1',
    buyerId: 'buyer',
    sellerId: 'seller',
    subtotal: 100000,
    totalAmount: 130000,
    status: 'PENDING_PAYMENT',
  };
  const hold = mock.fn(async () => ({ escrowStatus: 'HELD' }));
  const tx = {
    $queryRaw: async () => [],
    payment: {
      findUniqueOrThrow: async () => payment,
      update: async ({ data }) => Object.assign(payment, data),
    },
    order: {
      findUniqueOrThrow: async () => order,
      update: async ({ data }) => Object.assign(order, data),
    },
  };
  let queue = Promise.resolve();
  const prisma = {
    payment: { findFirst: async () => ({ ...payment }) },
    $transaction: mock.fn((run) => {
      const next = queue.then(() => run(tx));
      queue = next.catch(() => {});
      return next;
    }),
  };
  const verified = { orderCode: 123, code: '00', amount: 130000 };
  const service = new OrderService(
    prisma,
    {},
    new OrderPaymentHelper(prisma, { verifyWebhook: async () => verified }, {}, { hold }),
  );
  return { service, hold, verified, prisma, order };
}

test('concurrent PayOS callbacks hold payment once instead of paying out twice', async () => {
  const f = paymentFixture();
  await Promise.all([
    f.service.settleOrderPayment(f.verified),
    f.service.settleOrderPayment(f.verified),
  ]);
  assert.equal(f.hold.mock.callCount(), 1);
  assert.equal(f.order.status, 'PAID');
});

test('PayOS payment amount must match the server order', async () => {
  const f = paymentFixture();
  f.verified.amount = 1;
  await assert.rejects(
    f.service.settleOrderPayment(f.verified),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.hold.mock.callCount(), 0);
  assert.equal(f.prisma.$transaction.mock.callCount(), 0);
});

test('a seller response cannot overwrite a concurrently resolved dispute', async () => {
  const updateMany = mock.fn(async () => ({ count: 0 }));
  const service = new SellerEngagementService({
    dispute: {
      findUnique: async () => ({
        id: 'd1',
        status: 'OPEN',
        order: { sellerId: 'seller' },
        evidenceUrls: [],
        resolutionNotes: null,
      }),
      updateMany,
    },
  });
  await assert.rejects(
    service.respondToDispute('seller', 'd1', { responseNotes: 'Đã gửi bằng chứng' }),
    (error) => error.getStatus() === 400,
  );
  assert.deepEqual(updateMany.mock.calls[0].arguments[0].where.status.in, ['OPEN', 'UNDER_REVIEW']);
});

test('a PayOS callback goes to the order it paid for, or to the wallet it topped up', async () => {
  const verified = { orderCode: 7, code: '00', amount: 1000 };
  const payos = { verifyWebhook: mock.fn(async () => verified) };
  const seen = [];

  // Nothing holds a record for this orderCode: both owners decline it.
  const orphan = new PayosWebhookService(
    payos,
    { settleOrderPayment: async () => null },
    { settleTopup: async () => null },
  );
  assert.deepEqual(await orphan.handle({}), {
    success: false,
    message: 'Payment record not found',
  });

  // An order payment is settled by the order side and the wallet is never asked.
  const paid = new PayosWebhookService(
    payos,
    {
      settleOrderPayment: async (data) => {
        seen.push(data);
        return { success: true, orderCode: data.orderCode };
      },
    },
    {
      settleTopup: async () => {
        throw new Error('the wallet must not be offered a settled order payment');
      },
    },
  );
  assert.deepEqual(await paid.handle({}), { success: true, orderCode: 7 });
  assert.deepEqual(seen, [verified]);

  // A top-up carries the same callback shape and is claimed by the wallet.
  const topped = new PayosWebhookService(
    payos,
    { settleOrderPayment: async () => null },
    {
      settleTopup: async () => ({
        success: true,
        message: 'Wallet deposit processed successfully',
      }),
    },
  );
  assert.deepEqual(await topped.handle({}), {
    success: true,
    message: 'Wallet deposit processed successfully',
  });

  // The signature is verified once per callback, before either owner is asked.
  assert.equal(payos.verifyWebhook.mock.callCount(), 3);
});
