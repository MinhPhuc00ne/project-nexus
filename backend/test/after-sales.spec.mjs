import assert from 'node:assert/strict';
import { test } from './helpers/vitest-node-compat.mjs';
import { fixture, buyer, seller, admin, delivered } from './after-sales-fixture.mjs';

const reason = { reason: 'Incorrect item received' };

test('unpaid cancellation releases pending stock without refunding uncollected money', async () => {
  const f = fixture();
  f.state.order.status = 'PENDING_PAYMENT';
  f.state.escrow = null;
  f.state.payments = [];
  f.state.reservations[0].status = 'PENDING';
  f.state.inventory.totalQty = 2;
  f.state.inventory.reservedQty = 2;
  await f.cancel.cancel('o1', buyer, reason);
  assert.equal(f.state.order.status, 'CANCELLED');
  assert.equal(f.state.inventory.availableQty, 2);
  assert.equal(f.state.inventory.reservedQty, 0);
  assert.equal(f.state.refunds.length, 0);
});

test('concurrent paid cancellation refunds and restocks exactly once', async () => {
  const f = fixture();
  await Promise.all([f.cancel.cancel('o1', buyer, reason), f.cancel.cancel('o1', buyer, reason)]);
  assert.equal(f.state.refunds.length, 1);
  assert.equal(f.state.inventory.availableQty, 2);
  assert.equal(f.state.order.status, 'CANCELLED');
  assert.equal(f.state.wallets.find((w) => w.userId === 'buyer').balance, 130000);
});

test('cancellation rejects unrelated users and already shipped orders', async () => {
  const f = fixture();
  await assert.rejects(
    f.cancel.cancel('o1', { id: 'stranger', role: 'BUYER' }, reason),
    (e) => e.getStatus() === 403,
  );
  f.state.order.status = 'SHIPPING';
  await assert.rejects(f.cancel.cancel('o1', buyer, reason));
  assert.equal(f.state.request, null);
});

test('uncertain dispatch blocks cancellation before funds or stock are released', async () => {
  const f = fixture();
  f.state.shipment = { waybillCode: null, metadata: { dispatchState: 'UNKNOWN' } };
  await assert.rejects(f.cancel.cancel('o1', buyer, reason));
  assert.equal(f.state.refunds.length, 0);
  assert.equal(f.state.inventory.availableQty, 0);
});

test('GHN timeout leaves durable pending cancellation without refund; confirmed retry completes', async () => {
  const f = fixture();
  delivered(f);
  f.state.order.status = 'PREPARING';
  f.actions.change.mock.mockImplementationOnce(async () => {
    throw Error('timeout');
  });
  await f.cancel.cancel('o1', buyer, reason);
  assert.equal(f.state.request.status, 'REQUESTED');
  await assert.rejects(f.cancel.review('o1', admin, { ...reason, decision: 'APPROVE' }));
  assert.equal(f.state.request.status, 'APPROVING');
  assert.equal(f.state.refunds.length, 0);
  f.ghn.detail.mock.mockImplementation(async () => ({ status: 'cancel' }));
  await f.cancel.review('o1', admin, { ...reason, decision: 'APPROVE' });
  assert.equal(f.state.order.status, 'CANCELLED');
  assert.equal(f.state.refunds.length, 1);
});

test('buyer cancellation after seller confirmation waits for Admin without touching GHN, money or stock', async () => {
  const f = fixture();
  delivered(f);
  f.state.order.status = 'PREPARING';
  const request = await f.cancel.cancel('o1', buyer, { ...reason, refundToWallet: true });
  assert.equal(request.status, 'REQUESTED');
  assert.equal(f.state.order.status, 'PREPARING');
  assert.equal(f.state.refunds.length, 0);
  assert.equal(f.state.inventory.availableQty, 0);
  assert.equal(f.ghn.detail.mock.callCount(), 0);
  assert.equal(f.actions.change.mock.callCount(), 0);
  for (const actor of [seller, buyer, { id: 'staff', role: 'SUPPORT_STAFF' }]) {
    await assert.rejects(
      f.cancel.review('o1', actor, { ...reason, decision: 'APPROVE' }),
      (error) => error.getStatus() === 403,
    );
  }
  await assert.rejects(f.cancel.cancel('o1', seller, reason), (error) => error.getStatus() === 403);
  await Promise.all([
    f.cancel.review('o1', admin, { ...reason, decision: 'APPROVE' }),
    f.cancel.review('o1', admin, { ...reason, decision: 'APPROVE' }),
  ]);
  assert.equal(f.state.order.status, 'CANCELLED');
  assert.equal(f.state.request.reviewedBy, admin.id);
  assert.equal(f.state.refunds.length, 1);
  assert.equal(f.state.inventory.availableQty, 2);
});

test('Admin rejection leaves the order intact; a new buyer request replaces rejected consent and reason', async () => {
  const f = fixture();
  f.state.order.status = 'PREPARING';
  await f.cancel.cancel('o1', buyer, { ...reason, refundToWallet: true });
  await f.cancel.review('o1', admin, { reason: 'Seller evidence checked', decision: 'REJECT' });
  assert.equal(f.state.request.status, 'REJECTED');
  assert.equal(f.state.order.status, 'PREPARING');
  assert.equal(f.state.refunds.length, 0);
  await f.cancel.cancel('o1', buyer, { reason: 'New request' });
  assert.equal(f.state.request.reason, 'New request');
  assert.equal(f.state.request.refundToWallet, false);
  assert.equal(f.state.request.reviewedBy, null);
  assert.equal(f.state.request.status, 'REQUESTED');
});

test('Admin cannot grant wallet consent or approve missing, shipped or return requests', async () => {
  const f = fixture();
  const approve = { ...reason, decision: 'APPROVE', refundToWallet: true };
  await assert.rejects(f.cancel.review('o1', admin, approve));
  f.state.order.status = 'PREPARING';
  f.state.payments[0].provider = 'PAYOS';
  await f.cancel.cancel('o1', buyer, reason);
  await f.cancel.review('o1', admin, approve);
  assert.equal(f.state.refunds[0].destination, 'ORIGINAL');
  const other = fixture();
  other.state.order.status = 'PREPARING';
  await other.cancel.cancel('o1', buyer, reason);
  other.state.order.status = 'SHIPPING';
  await assert.rejects(other.cancel.review('o1', admin, approve));
  other.state.order.status = 'PREPARING';
  other.state.request.kind = 'RETURN';
  await assert.rejects(other.cancel.review('o1', admin, approve));
});

test('an uncertain approved cancellation cannot be rejected or reset by the buyer', async () => {
  const f = fixture();
  delivered(f);
  f.state.order.status = 'PREPARING';
  await f.cancel.cancel('o1', buyer, reason);
  f.ghn.detail.mock.mockImplementation(async () => {
    throw Error('network timeout');
  });
  await assert.rejects(f.cancel.review('o1', admin, { ...reason, decision: 'APPROVE' }));
  await assert.rejects(f.cancel.review('o1', admin, { ...reason, decision: 'REJECT' }));
  await f.cancel.cancel('o1', buyer, reason);
  assert.equal(f.state.request.status, 'APPROVING');
  assert.equal(f.state.refunds.length, 0);
});

test('seller-fault cancellation applies documented reputation penalty once', async () => {
  const f = fixture();
  const dto = { ...reason, reasonCode: 'STOCKOUT' };
  await f.cancel.cancel('o1', seller, dto);
  await f.cancel.cancel('o1', seller, dto);
  assert.equal(f.state.reputation, 90);
});

test('external payment defaults to pending original-source refund and reserves funds', async () => {
  const f = fixture();
  f.state.payments[0].provider = 'PAYOS';
  await f.cancel.cancel('o1', buyer, reason);
  assert.equal(f.state.refunds[0].destination, 'ORIGINAL');
  assert.equal(f.state.refunds[0].status, 'PENDING');
  assert.equal(f.state.wallets[0].balance, 0);
  assert.equal(f.state.wallets[0].lockedBalance, 130000);
  assert.equal(
    f.state.wallets.some((w) => w.userId === 'buyer'),
    false,
  );
});

test('buyer consent permits wallet refund; seller cannot grant that consent', async () => {
  const f = fixture();
  f.state.payments[0].provider = 'PAYOS';
  await f.cancel.cancel('o1', buyer, { ...reason, refundToWallet: true });
  assert.equal(f.state.refunds[0].destination, 'WALLET');
  assert.equal(f.state.refunds[0].status, 'SUCCESS');
  const g = fixture();
  g.state.payments[0].provider = 'PAYOS';
  await g.cancel.cancel('o1', seller, { ...reason, refundToWallet: true });
  assert.equal(g.state.refunds[0].destination, 'ORIGINAL');
});

test('only admin can confirm external refund and duplicate confirmation never spends twice', async () => {
  const f = fixture();
  f.state.payments[0].provider = 'PAYOS';
  await f.cancel.cancel('o1', buyer, reason);
  const id = f.state.refunds[0].id;
  await assert.rejects(f.refunds.complete(id, seller, 'bank-123'));
  await assert.rejects(f.refunds.complete(id, admin, ' '));
  await Promise.all([
    f.refunds.complete(id, admin, 'bank-123'),
    f.refunds.complete(id, admin, 'bank-123'),
  ]);
  assert.equal(f.state.wallets[0].lockedBalance, 0);
  assert.equal(f.state.refunds[0].status, 'SUCCESS');
  assert.equal(f.state.order.status, 'CANCELLED');
});

test('return request freezes held escrow and validates buyer, deadline and terminal states', async () => {
  const f = fixture();
  delivered(f);
  await assert.rejects(f.returns.request('o1', seller, reason));
  f.state.shipment.metadata.deliveredAt = new Date(Date.now() - 4 * 86400000).toISOString();
  await assert.rejects(f.returns.request('o1', buyer, reason));
  f.state.shipment.metadata.deliveredAt = new Date().toISOString();
  await f.returns.request('o1', buyer, reason);
  assert.equal(f.state.escrow.status, 'DISPUTED');
  assert.equal(f.state.request.status, 'REQUESTED');
});

test('rejected return unfreezes escrow and buyer cannot approve their own request', async () => {
  const f = fixture();
  delivered(f);
  await f.returns.request('o1', buyer, reason);
  await assert.rejects(f.returns.review('o1', buyer, { ...reason, decision: 'APPROVE' }));
  await f.returns.review('o1', seller, { ...reason, decision: 'REJECT' });
  assert.equal(f.state.escrow.status, 'HELD');
  assert.equal(f.state.request.status, 'REJECTED');
});

test('approved return requires a matching reverse waybill and verified receipt before refund/restock', async () => {
  const f = fixture();
  delivered(f);
  await f.returns.request('o1', buyer, reason);
  await f.returns.review('o1', seller, { ...reason, decision: 'APPROVE' });
  await assert.rejects(f.returns.receive('o1', seller, { ...reason, restock: true }));
  await assert.rejects(f.returns.attachWaybill('o1', seller, 'WRONG'));
  f.ghn.detail.mock.mockImplementation(async () => ({
    status: 'delivered',
    client_order_code: 'NX-RETURN-o1',
  }));
  await f.returns.attachWaybill('o1', seller, 'REVERSE1');
  await f.returns.receive('o1', seller, { ...reason, restock: true });
  await f.returns.receive('o1', seller, { ...reason, restock: true });
  assert.equal(f.state.inventory.availableQty, 2);
  assert.equal(f.state.refunds.length, 1);
  assert.equal(f.state.order.status, 'REFUNDED');
});

test('damaged returned goods are refunded without being made saleable', async () => {
  const f = fixture();
  f.state.order.status = 'SHIPPING';
  delivered(f);
  f.state.order.status = 'SHIPPING';
  f.ghn.detail.mock.mockImplementation(async () => ({
    status: 'returned',
    client_order_code: 'NX-o1',
  }));
  await f.returns.request('o1', buyer, reason);
  await f.returns.review('o1', seller, { ...reason, decision: 'APPROVE' });
  await f.returns.receive('o1', seller, { ...reason, restock: false });
  assert.equal(f.state.inventory.availableQty, 0);
  assert.equal(f.state.order.status, 'REFUNDED');
});

test('return remains available after confirmation and recovers seller payout once', async () => {
  const f = fixture();
  delivered(f, true);
  await f.returns.request('o1', buyer, reason);
  await f.returns.review('o1', seller, { ...reason, decision: 'APPROVE' });
  f.ghn.detail.mock.mockImplementation(async () => ({
    status: 'delivered',
    client_order_code: 'NX-RETURN-o1',
  }));
  await f.returns.attachWaybill('o1', seller, 'REVERSE1');
  await f.returns.receive('o1', seller, { ...reason, restock: false });
  assert.equal(f.state.wallets[1].balance, 0);
  assert.equal(f.state.refunds.length, 1);
});

test('insufficient recovered funds rollback receipt, restock and refund instead of creating negative wallets', async () => {
  const f = fixture();
  delivered(f, true);
  f.state.wallets[1].balance = 0;
  await f.returns.request('o1', buyer, reason);
  await f.returns.review('o1', seller, { ...reason, decision: 'APPROVE' });
  f.ghn.detail.mock.mockImplementation(async () => ({
    status: 'delivered',
    client_order_code: 'NX-RETURN-o1',
  }));
  await f.returns.attachWaybill('o1', seller, 'REVERSE1');
  await assert.rejects(f.returns.receive('o1', seller, { ...reason, restock: true }));
  assert.equal(f.state.request.status, 'APPROVED');
  assert.equal(f.state.inventory.availableQty, 0);
  assert.equal(f.state.refunds.length, 0);
});

test('carrier return approval cannot be rejected while the GHN outcome is uncertain', async () => {
  const f = fixture();
  delivered(f);
  f.state.order.status = 'SHIPPING';
  await f.returns.request('o1', buyer, reason);
  f.actions.change.mock.mockImplementation(async () => {
    throw Error('timeout');
  });
  await assert.rejects(f.returns.review('o1', seller, { ...reason, decision: 'APPROVE' }));
  assert.equal(f.state.request.status, 'APPROVING');
  await assert.rejects(f.returns.review('o1', seller, { ...reason, decision: 'REJECT' }));
});

test('verified payment arriving after cancellation is recorded and refunded once without reopening order', async () => {
  const f = fixture();
  f.state.order.status = 'CANCELLED';
  f.state.escrow = null;
  f.state.wallets[0].balance = 0;
  Object.assign(f.state.payments[0], {
    status: 'PENDING',
    provider: 'PAYOS',
    transactionCode: '123',
  });
  const verified = { orderCode: 123, code: '00', amount: 130000 };
  await Promise.all([
    f.payments.settleOrderPayment(verified),
    f.payments.settleOrderPayment(verified),
  ]);
  assert.equal(f.state.payments[0].status, 'SUCCESS');
  assert.equal(f.state.order.status, 'CANCELLED');
  assert.equal(f.state.refunds.length, 1);
  assert.equal(f.state.refunds[0].status, 'PENDING');
  assert.equal(f.state.wallets[0].lockedBalance, 130000);
  assert.equal(f.state.inventory.availableQty, 0);
});
