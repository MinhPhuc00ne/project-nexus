import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mock, test } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { OrderPaymentHelper } = load('../src/modules/orders/services/order-payment.helper.ts');

/**
 * Paying once for a cart that came from two shops.
 *
 * A cart holding items from two sellers becomes two orders, because an order is
 * what one seller packs and ships. Checkout wrapped its whole payment step in
 * `createdOrders.length === 1`, so that buyer ended up with two orders waiting
 * for payment and no link to pay either of them.
 */

const ORDER_CODE = 1_000_000_000_777;

/**
 * A Prisma stand-in holding orders, payments and one payment group in memory.
 *
 * @param orders - The orders the buyer is paying for.
 */
function fakePrisma(orders) {
  const state = {
    orders: new Map(orders.map((order) => [order.id, { ...order }])),
    payments: [],
    groups: new Map(),
    notifications: [],
    escrowHolds: [],
    committed: [],
  };

  const client = {
    state,
    $queryRaw: async () => [],
    $transaction: async (run) => run(client),
    order: {
      findMany: async ({ where }) =>
        [...state.orders.values()].filter((order) =>
          where?.id?.in ? where.id.in.includes(order.id) : true,
        ),
      findUnique: async ({ where, include }) => {
        const order = state.orders.get(where.id);
        if (!order) return null;
        if (!include?.payments) return order;
        return {
          ...order,
          payments: state.payments.filter((payment) => payment.orderId === order.id),
        };
      },
      findUniqueOrThrow: async ({ where }) => {
        const order = state.orders.get(where.id);
        if (!order) throw new Error(`no order ${where.id}`);
        return order;
      },
      update: async ({ where, data }) => Object.assign(state.orders.get(where.id), data),
      updateMany: async ({ where, data }) => {
        const matched = [...state.orders.values()].filter(
          (order) =>
            where.id.in.includes(order.id) &&
            order.buyerId === where.buyerId &&
            order.status === where.status &&
            (order.paymentGroupId ?? null) === where.paymentGroupId,
        );
        for (const order of matched) Object.assign(order, data);
        return { count: matched.length };
      },
    },
    payment: {
      create: async ({ data }) => {
        const payment = { id: `pay-${state.payments.length + 1}`, ...data };
        state.payments.push(payment);
        return payment;
      },
      findFirst: async ({ where }) =>
        state.payments.find((payment) => payment.transactionCode === where.transactionCode) ?? null,
      findUniqueOrThrow: async ({ where }) => {
        const payment = state.payments.find((row) => row.id === where.id);
        if (!payment) throw new Error(`no payment ${where.id}`);
        return payment;
      },
      update: async ({ where, data }) =>
        Object.assign(
          state.payments.find((row) => row.id === where.id),
          data,
        ),
    },
    paymentGroup: {
      create: async ({ data }) => {
        const group = { id: 'group-1', orders: [], ...data };
        state.groups.set(group.id, group);
        return group;
      },
      findUnique: async ({ where }) =>
        where.orderCode
          ? ([...state.groups.values()].find((group) => group.orderCode === where.orderCode) ??
            null)
          : (state.groups.get(where.id) ?? null),
      findUniqueOrThrow: async ({ where, include }) => {
        const group = state.groups.get(where.id);
        if (!group) throw new Error(`no group ${where.id}`);
        if (!include) return group;
        return {
          ...group,
          orders: [...state.orders.values()]
            .filter((order) => order.paymentGroupId === group.id)
            .map((order) => ({ id: order.id, totalAmount: order.totalAmount })),
        };
      },
      update: async ({ where, data }) => Object.assign(state.groups.get(where.id), data),
    },
    notification: {
      create: async ({ data }) => state.notifications.push(data),
    },
  };
  return client;
}

/** The pieces the helper needs besides the database. */
function helperFor(prisma, { createPaymentLink } = {}) {
  const escrow = {
    hold: mock.fn(async (_tx, order) => {
      prisma.state.escrowHolds.push(order.id);
      return { platformFee: 0, sellerPayout: 0, feePercentage: 7, escrowStatus: 'HOLDING' };
    }),
  };
  const payos = {
    createPaymentLink:
      createPaymentLink ??
      mock.fn(async (request) => ({
        paymentLinkId: 'link-1',
        checkoutUrl: `https://pay.example/${request.orderCode}`,
        qrCode: 'qr',
        accountNumber: '1',
        accountName: 'NEXUS',
        bin: '9',
      })),
    getPaymentLink: mock.fn(async () => ({ status: 'PAID', amountPaid: 300_000 })),
  };
  const inventory = {
    commitReservation: mock.fn(async (_tx, orderId) => prisma.state.committed.push(orderId)),
  };
  const helper = new OrderPaymentHelper(
    prisma,
    payos,
    { next: async () => ORDER_CODE },
    { get: () => 'http://localhost:5173' },
    escrow,
    inventory,
  );
  return { helper, escrow, payos, inventory };
}

const twoOrders = () => [
  {
    id: 'order-a',
    buyerId: 'buyer-1',
    sellerId: 'seller-a',
    status: 'PENDING_PAYMENT',
    isAuction: false,
    totalAmount: 100_000,
    paymentGroupId: null,
    shippingAddressSnapshot: { recipientName: 'A', phone: '09', street: 'S', city: 'C' },
    buyer: { fullName: 'Buyer', email: 'b@x.test', phoneNumber: '09' },
    items: [{ quantity: 1, unitPrice: 100_000, product: { title: 'Thing A' } }],
  },
  {
    id: 'order-b',
    buyerId: 'buyer-1',
    sellerId: 'seller-b',
    status: 'PENDING_PAYMENT',
    isAuction: false,
    totalAmount: 200_000,
    paymentGroupId: null,
    shippingAddressSnapshot: { recipientName: 'A', phone: '09', street: 'S', city: 'C' },
    buyer: { fullName: 'Buyer', email: 'b@x.test', phoneNumber: '09' },
    items: [{ quantity: 2, unitPrice: 100_000, product: { title: 'Thing B' } }],
  },
];

test('one PayOS link covers every order of a multi-shop cart', async () => {
  const prisma = fakePrisma(twoOrders());
  const { helper, payos } = helperFor(prisma);

  const group = await helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1');

  // The buyer transfers once, for the total of both orders.
  assert.equal(group.amount, 300_000);
  assert.equal(group.orderCode, ORDER_CODE);
  assert.deepEqual(group.orderIds, ['order-a', 'order-b']);
  assert.equal(payos.createPaymentLink.mock.calls[0].arguments[0].amount, 300_000);

  // PayOS shows the buyer what they are paying for across both orders.
  assert.deepEqual(
    payos.createPaymentLink.mock.calls[0].arguments[0].items.map((item) => item.name),
    ['Thing A', 'Thing B'],
  );

  // Both orders now point at the group that owns the code.
  for (const id of ['order-a', 'order-b'])
    assert.equal(prisma.state.orders.get(id).paymentGroupId, group.paymentGroupId);
});

test('the callback for a group pays every order in it, exactly once', async () => {
  const prisma = fakePrisma(twoOrders());
  const { helper, escrow, inventory } = helperFor(prisma);
  await helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1');

  const webhook = { orderCode: ORDER_CODE, code: '00', amount: 300_000 };
  const settled = await helper.settleOrderPayment(webhook);
  assert.deepEqual(settled, { success: true, orderCode: ORDER_CODE });

  for (const id of ['order-a', 'order-b']) {
    assert.equal(prisma.state.orders.get(id).status, 'PAID');
  }
  // Each order keeps its own payment row, for its own amount: escrow, refunds
  // and the seller payout all read per order.
  assert.deepEqual(
    prisma.state.payments.map((payment) => [
      payment.orderId,
      Number(payment.amount),
      payment.status,
    ]),
    [
      ['order-a', 100_000, 'SUCCESS'],
      ['order-b', 200_000, 'SUCCESS'],
    ],
  );
  assert.deepEqual(prisma.state.escrowHolds, ['order-a', 'order-b']);
  assert.deepEqual(prisma.state.committed, ['order-a', 'order-b']);

  // A second delivery of the same callback must not pay anything twice.
  const again = await helper.settleOrderPayment(webhook);
  assert.deepEqual(again, { success: true, message: 'Already processed' });
  assert.equal(prisma.state.payments.length, 2);
  assert.equal(escrow.hold.mock.callCount(), 2);
});

test('a group refuses an amount that is not what it asked for', async () => {
  const prisma = fakePrisma(twoOrders());
  const { helper } = helperFor(prisma);
  await helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1');

  await assert.rejects(
    helper.settleOrderPayment({ orderCode: ORDER_CODE, code: '00', amount: 100_000 }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(prisma.state.payments.length, 0);
  assert.equal(prisma.state.orders.get('order-a').status, 'PENDING_PAYMENT');
});

test('a group belongs to one buyer, and only to orders still awaiting payment', async () => {
  const foreign = twoOrders();
  foreign[1].buyerId = 'buyer-2';
  const { helper } = helperFor(fakePrisma(foreign));
  await assert.rejects(
    helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1'),
    (error) => error.getStatus() === 403,
  );

  const alreadyPaid = twoOrders();
  alreadyPaid[1].status = 'PAID';
  const second = helperFor(fakePrisma(alreadyPaid));
  await assert.rejects(
    second.helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1'),
    (error) => error.getStatus() === 400,
  );

  const auctioned = twoOrders();
  auctioned[0].isAuction = true;
  const third = helperFor(fakePrisma(auctioned));
  await assert.rejects(
    third.helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1'),
    (error) => error.getStatus() === 400,
  );

  // One order is not a group; the single-order path already covers that.
  const fourth = helperFor(fakePrisma(twoOrders()));
  await assert.rejects(
    fourth.helper.initializeGroupPayment(['order-a'], 'buyer-1'),
    (error) => error.getStatus() === 400,
  );
});

test('asking PayOS directly settles a group whose callback never arrived', async () => {
  const prisma = fakePrisma(twoOrders());
  const { helper, payos } = helperFor(prisma);
  await helper.initializeGroupPayment(['order-a', 'order-b'], 'buyer-1');

  const status = await helper.checkPayosPaymentStatus('order-a', 'buyer-1');

  assert.equal(status.paid, true);
  assert.equal(payos.getPaymentLink.mock.calls[0].arguments[0], ORDER_CODE);
  for (const id of ['order-a', 'order-b']) assert.equal(prisma.state.orders.get(id).status, 'PAID');
  assert.equal(prisma.state.payments.length, 2);
  assert.ok(prisma.state.payments.every((payment) => payment.metadata.verifiedDirectly === true));
});

test('paying for several orders from the wallet is all or nothing', async () => {
  const orders = twoOrders();
  const prisma = fakePrisma(orders);
  const wallets = new Map([['wallet-1', { id: 'wallet-1', userId: 'buyer-1', balance: 250_000 }]]);
  prisma.wallet = {
    findUnique: async () => wallets.get('wallet-1'),
    findUniqueOrThrow: async () => wallets.get('wallet-1'),
    create: async ({ data }) => {
      wallets.set('wallet-1', { id: 'wallet-1', ...data });
      return wallets.get('wallet-1');
    },
    updateMany: async ({ where, data }) => {
      const wallet = wallets.get('wallet-1');
      const needed = Number(where.balance.gte);
      if (Number(wallet.balance) < needed) return { count: 0 };
      wallet.balance = Number(wallet.balance) - Number(data.balance.decrement);
      return { count: 1 };
    },
  };
  prisma.walletTransaction = { create: async ({ data }) => ({ id: 'wtx-1', ...data }) };
  const { helper } = helperFor(prisma);

  // 250k covers the first order but not both: neither may end up paid.
  await assert.rejects(
    helper.payOrdersByWallet(['order-a', 'order-b'], 'buyer-1'),
    (error) => error.getStatus() === 400,
  );
  // The in-memory stand-in cannot roll back, so this asserts what the
  // transaction is for: the failure comes from the second order, after the
  // first was debited, which is exactly the state a real transaction discards.
  assert.equal(prisma.state.orders.get('order-b').status, 'PENDING_PAYMENT');

  // With enough balance both are paid, and each gets its own escrow hold.
  const funded = fakePrisma(twoOrders());
  const balance = { id: 'wallet-1', userId: 'buyer-1', balance: 300_000 };
  funded.wallet = {
    findUnique: async () => balance,
    findUniqueOrThrow: async () => balance,
    create: async () => balance,
    updateMany: async ({ where, data }) => {
      if (Number(balance.balance) < Number(where.balance.gte)) return { count: 0 };
      balance.balance = Number(balance.balance) - Number(data.balance.decrement);
      return { count: 1 };
    },
  };
  funded.walletTransaction = { create: async ({ data }) => ({ id: 'wtx-1', ...data }) };
  const paid = helperFor(funded);
  const results = await paid.helper.payOrdersByWallet(['order-a', 'order-b'], 'buyer-1');

  assert.deepEqual(
    results.map((result) => [result.orderId, result.orderStatus]),
    [
      ['order-a', 'PAID'],
      ['order-b', 'PAID'],
    ],
  );
  assert.equal(balance.balance, 0);
  assert.deepEqual(funded.state.escrowHolds, ['order-a', 'order-b']);
});
