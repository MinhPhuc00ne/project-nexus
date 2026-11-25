import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { AfterSalesStoreService } = load(
  '../src/modules/after-sales/services/after-sales-store.service.ts',
);
const { RefundService } = load('../src/modules/after-sales/services/refund.service.ts');
const { InventoryService } = load('../src/modules/catalog/services/inventory.service.ts');
const { OrderCancellationService } = load(
  '../src/modules/after-sales/services/order-cancellation.service.ts',
);
const { OrderReturnService } = load('../src/modules/after-sales/services/order-return.service.ts');
const { OrderService } = load('../src/modules/orders/services/order.service.ts');
const { ReputationService } = load('../src/modules/users/services/reputation.service.ts');
const { OrderPaymentHelper } = load('../src/modules/orders/services/order-payment.helper.ts');
export const buyer = { id: 'buyer', role: 'BUYER' };
export const seller = { id: 'seller', role: 'SELLER' };
export const admin = { id: 'admin', role: 'ADMIN' };

const copy = (value) => structuredClone(value);
const matches = (row, where = {}) =>
  Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object') {
      if ('gte' in value) return Number(row[key]) >= Number(value.gte);
      if ('not' in value) return row[key] !== value.not;
      if ('in' in value) return value.in.includes(row[key]);
    }
    return row[key] === value;
  });
function apply(row, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in value)
      row[key] += Number(value.increment);
    else if (value && typeof value === 'object' && 'decrement' in value)
      row[key] -= Number(value.decrement);
    else row[key] = copy(value);
  }
  return copy(row);
}

export function fixture() {
  const state = {
    order: {
      id: 'o1',
      buyerId: 'buyer',
      sellerId: 'seller',
      status: 'PAID',
      subtotal: 100000,
      shippingFee: 30000,
      totalAmount: 130000,
    },
    escrow: {
      orderId: 'o1',
      status: 'HELD',
      totalAmount: 130000,
      sellerPayout: 93000,
      platformFee: 7000,
    },
    shipment: null,
    request: null,
    dispute: null,
    refunds: [],
    payments: [{ id: 'p1', orderId: 'o1', amount: 130000, provider: 'WALLET', status: 'SUCCESS' }],
    wallets: [
      { id: 'admin-wallet', userId: 'admin', balance: 130000, lockedBalance: 0 },
      { id: 'seller-wallet', userId: 'seller', balance: 0, lockedBalance: 0 },
    ],
    reservations: [
      { id: 'r1', referenceId: 'o1', inventoryId: 'i1', quantity: 2, status: 'COMMITTED' },
    ],
    inventory: { id: 'i1', totalQty: 0, availableQty: 0, reservedQty: 0 },
    transactions: [],
    ledger: [],
    notifications: [],
    events: [],
    reputation: 100,
  };
  const fullOrder = () =>
    copy({
      ...state.order,
      shipment: state.shipment,
      escrowRecord: state.escrow,
      afterSales: state.request,
      dispute: state.dispute,
      refunds: state.refunds,
    });
  const tx = {
    $queryRaw: mock.fn(async () => []),
    order: {
      findUnique: async () => fullOrder(),
      findUniqueOrThrow: async () => fullOrder(),
      update: async ({ data }) => apply(state.order, data),
      updateMany: async ({ where, data }) => {
        if (!matches(state.order, where)) return { count: 0 };
        apply(state.order, data);
        return { count: 1 };
      },
    },
    afterSalesRequest: {
      findUniqueOrThrow: async () => {
        if (!state.request) throw Error('missing request');
        return copy(state.request);
      },
      create: async ({ data }) => {
        state.request = {
          id: 'a1',
          status: 'REQUESTED',
          refundToWallet: false,
          returnWaybillCode: null,
          ...copy(data),
        };
        return copy(state.request);
      },
      upsert: async ({ create, update }) =>
        state.request
          ? apply(state.request, update)
          : tx.afterSalesRequest.create({ data: create }),
      update: async ({ data }) => apply(state.request, data),
      updateMany: async ({ where, data }) => {
        if (!state.request || !matches(state.request, where)) return { count: 0 };
        apply(state.request, data);
        return { count: 1 };
      },
    },
    orderRefund: {
      findMany: async ({ where }) => copy(state.refunds.filter((row) => matches(row, where))),
      findUnique: async ({ where }) =>
        copy(state.refunds.find((row) => matches(row, where)) ?? null),
      findUniqueOrThrow: async ({ where }) => {
        const result = state.refunds.find((row) => matches(row, where));
        if (!result) throw Error('missing refund');
        return copy(result);
      },
      count: async ({ where }) => state.refunds.filter((row) => matches(row, where)).length,
      create: async ({ data }) => {
        const row = { id: `refund-${state.refunds.length}`, ...copy(data) };
        state.refunds.push(row);
        return copy(row);
      },
      update: async ({ where, data }) =>
        apply(
          state.refunds.find((row) => matches(row, where)),
          data,
        ),
    },
    payment: {
      findMany: async ({ where }) => copy(state.payments.filter((row) => matches(row, where))),
      findFirst: async ({ where }) =>
        copy(state.payments.find((row) => matches(row, where)) ?? null),
      findUniqueOrThrow: async ({ where }) =>
        copy(state.payments.find((row) => matches(row, where))),
      update: async ({ where, data }) =>
        apply(
          state.payments.find((row) => matches(row, where)),
          data,
        ),
    },
    escrowRecord: {
      update: async ({ data }) => apply(state.escrow, data),
      updateMany: async ({ data }) => {
        if (!state.escrow) return { count: 0 };
        apply(state.escrow, data);
        return { count: 1 };
      },
    },
    shipment: { update: async ({ data }) => apply(state.shipment, data) },
    wallet: {
      update: async ({ where, data }) =>
        apply(
          state.wallets.find((row) => matches(row, where)),
          data,
        ),
      updateMany: async ({ where, data }) => {
        const row = state.wallets.find((entry) => matches(entry, where));
        if (!row) return { count: 0 };
        apply(row, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }) =>
        copy(state.wallets.find((row) => matches(row, where))),
      upsert: async ({ where, create }) => {
        let row = state.wallets.find((entry) => matches(entry, where));
        if (!row) {
          row = { id: `wallet-${create.userId}`, ...copy(create) };
          state.wallets.push(row);
        }
        return copy(row);
      },
    },
    walletTransaction: {
      create: async ({ data }) => {
        const row = { id: `t${state.transactions.length}`, ...copy(data) };
        state.transactions.push(row);
        return copy(row);
      },
      update: async ({ where, data }) =>
        apply(
          state.transactions.find((row) => matches(row, where)),
          data,
        ),
    },
    inventoryReservation: {
      findMany: async ({ where }) => copy(state.reservations.filter((row) => matches(row, where))),
      update: async ({ where, data }) =>
        apply(
          state.reservations.find((row) => matches(row, where)),
          data,
        ),
    },
    inventory: { update: async ({ data }) => apply(state.inventory, data) },
    inventoryLedger: { create: async ({ data }) => state.ledger.push(copy(data)) },
    notification: { create: async ({ data }) => state.notifications.push(copy(data)) },
    eventLog: { create: async ({ data }) => state.events.push(copy(data)) },
    user: {
      findUnique: async () => ({
        id: 'seller',
        role: 'SELLER',
        reputationScore: state.reputation,
        trustLevel: 'GOOD',
        isShopSuspended: false,
      }),
      update: async ({ data }) => {
        if (typeof data.reputationScore === 'number') state.reputation = data.reputationScore;
        else if (data.reputationScore?.decrement)
          state.reputation -= data.reputationScore.decrement;
        return { reputationScore: state.reputation };
      },
    },
    reputationLog: { create: async () => ({}) },
  };
  let queue = Promise.resolve();
  const prisma = {
    ...tx,
    $transaction(run) {
      const next = queue.then(async () => {
        const before = copy(state);
        try {
          return await run(tx);
        } catch (error) {
          Object.assign(state, before);
          throw error;
        }
      });
      queue = next.catch(() => {});
      return next;
    },
  };
  const store = new AfterSalesStoreService(prisma, new ReputationService(prisma, {}));
  const finance = { getOrCreatePrimaryAdminWallet: async () => copy(state.wallets[0]) };
  const refunds = new RefundService(prisma, finance, store);
  const inventory = new InventoryService(prisma);
  const ghn = {
    detail: mock.fn(async () => ({ status: 'ready_to_pick', client_order_code: 'NX-o1' })),
  };
  const actions = { change: mock.fn(async () => {}) };
  return {
    state,
    tx,
    prisma,
    store,
    refunds,
    inventory,
    ghn,
    actions,
    finance,
    cancel: new OrderCancellationService(prisma, store, ghn, actions, inventory, refunds),
    returns: new OrderReturnService(prisma, store, ghn, actions, inventory, refunds),
    payments: new OrderService(
      prisma,
      {},
      new OrderPaymentHelper(
        prisma,
        { verifyWebhook: async () => ({ orderCode: 123, code: '00', amount: 130000 }) },
        { next: async () => 1_000_000_000_001 },
        {},
        {},
        inventory,
        refunds,
        finance,
      ),
      inventory,
    ),
    fullOrder,
  };
}

export function delivered(f, disbursed = false) {
  f.state.order.status = disbursed ? 'CONFIRMED' : 'DELIVERED';
  f.state.shipment = {
    waybillCode: 'GHN1',
    metadata: {
      ghnShopId: 1,
      ghnEnvironment: 'PRODUCTION',
      deliveredAt: new Date().toISOString(),
      tracking: { status: 'delivered' },
    },
  };
  if (disbursed) {
    f.state.escrow.status = 'DISBURSED';
    f.state.wallets[0].balance = 37000;
    f.state.wallets[1].balance = 93000;
  }
}
