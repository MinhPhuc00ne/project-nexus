import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const source = (name) => load(`../src/modules/${name}.ts`);

test(
  'PostgreSQL cancellation/return/refund paths obey real constraints and leave no fixture data',
  {
    skip: process.env.NEXUS_AFTER_SALES_DB_TEST !== '1',
  },
  async () => {
    dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
      'Database test is restricted to localhost',
    );
    const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const rollback = new Error('intentional-test-rollback');
    const marker = `after-sales-${randomUUID()}`;
    try {
      await assert.rejects(
        prisma.$transaction(
          async (tx) => {
            // All service transactions share this outer transaction, which is always rolled back.
            const facade = new Proxy(tx, {
              get: (target, property) =>
                property === '$transaction'
                  ? (run) => (Array.isArray(run) ? Promise.all(run) : run(tx))
                  : target[property],
            });
            const users = [];
            for (const role of ['BUYER', 'SELLER', 'ADMIN'])
              users.push(
                await tx.user.create({
                  data: {
                    email: `${role}-${marker}@example.invalid`,
                    passwordHash: 'test-only',
                    fullName: marker,
                    role,
                  },
                }),
              );
            const [buyer, seller, admin] = users.map((user) => ({ id: user.id, role: user.role }));
            const adminWallet = await tx.wallet.create({
              data: { userId: admin.id, balance: 390000 },
            });
            const finance = { getOrCreatePrimaryAdminWallet: async () => adminWallet };
            const { AfterSalesStoreService } = source(
              'commerce/services/after-sales-store.service',
            );
            const { RefundService } = source('commerce/services/refund.service');
            const { InventoryService } = source('catalog/services/inventory.service');
            const { OrderCancellationService } = source(
              'commerce/services/order-cancellation.service',
            );
            const { OrderReturnService } = source('commerce/services/order-return.service');
            const store = new AfterSalesStoreService(facade);
            const refunds = new RefundService(facade, finance, store);
            const inventory = new InventoryService(facade);
            const ghn = { detail: async () => ({ status: 'returned' }) };
            const actions = {
              change: async () => {
                throw Error('A live GHN call must never happen in this test');
              },
            };
            const cancellations = new OrderCancellationService(
              facade,
              store,
              ghn,
              actions,
              inventory,
              refunds,
            );
            const returns = new OrderReturnService(
              facade,
              store,
              ghn,
              actions,
              inventory,
              refunds,
              {
                isShippingSandbox: () => true,
              },
            );
            const category = await tx.category.create({ data: { name: marker, slug: marker } });
            const product = await tx.product.create({
              data: {
                sellerId: seller.id,
                categoryId: category.id,
                title: marker,
                description: marker,
                basePrice: 50000,
              },
            });
            const warehouse = await tx.warehouse.create({ data: { code: marker, name: marker } });
            const stock = await tx.inventory.create({
              data: { warehouseId: warehouse.id, productId: product.id },
            });
            for (const provider of ['WALLET', 'PAYOS']) {
              const order = await tx.order.create({
                data: {
                  buyerId: buyer.id,
                  sellerId: seller.id,
                  status: provider === 'PAYOS' ? 'PREPARING' : 'PAID',
                  subtotal: 100000,
                  shippingFee: 30000,
                  totalAmount: 130000,
                  shippingAddressSnapshot: {},
                },
              });
              await tx.payment.create({
                data: { orderId: order.id, provider, amount: 130000, status: 'SUCCESS' },
              });
              await tx.escrowRecord.create({
                data: {
                  orderId: order.id,
                  totalAmount: 130000,
                  platformFee: 7000,
                  sellerPayout: 93000,
                },
              });
              await tx.inventoryReservation.create({
                data: {
                  inventoryId: stock.id,
                  referenceId: order.id,
                  quantity: 2,
                  status: 'COMMITTED',
                  expiresAt: new Date(),
                },
              });
              if (provider === 'PAYOS') {
                const pending = await cancellations.cancel(order.id, buyer, {
                  reason: 'Buyer request',
                });
                assert.equal(pending.status, 'REQUESTED');
                assert.equal(await tx.orderRefund.count({ where: { orderId: order.id } }), 0);
                assert.equal(
                  (await tx.order.findUniqueOrThrow({ where: { id: order.id } })).status,
                  'PREPARING',
                );
                await cancellations.review(order.id, admin, {
                  reason: 'Verified cancellation',
                  decision: 'APPROVE',
                });
              } else {
                await cancellations.cancel(order.id, admin, { reason: 'Verified cancellation' });
              }
              await cancellations.cancel(order.id, buyer, { reason: 'Retry' });
              const record = await tx.orderRefund.findFirstOrThrow({
                where: { orderId: order.id },
              });
              assert.equal(record.destination, provider === 'WALLET' ? 'WALLET' : 'ORIGINAL');
              if (provider === 'PAYOS') await refunds.complete(record.id, admin, `bank-${marker}`);
              assert.equal(
                (await tx.order.findUniqueOrThrow({ where: { id: order.id } })).status,
                'CANCELLED',
              );
            }
            const { AdminOrdersService } = source('admin/services/admin-orders.service');
            const { QueryAdminOrdersDto } = source('admin/dtos/query-admin-orders.dto');
            const adminOrders = new AdminOrdersService(facade);
            const page = await adminOrders.list(
              Object.assign(new QueryAdminOrdersDto(), {
                sellerId: seller.id,
                search: marker,
                status: 'CANCELLED',
              }),
            );
            assert.equal(page.total, 2);
            const detail = await adminOrders.detail(page.items[0].id);
            assert.equal(detail.buyer.id, buyer.id);
            assert.equal(detail.payments.length, 1);
            assert.equal(detail.refunds.length, 1);
            const order = await tx.order.create({
              data: {
                buyerId: buyer.id,
                sellerId: seller.id,
                status: 'SHIPPING',
                subtotal: 100000,
                shippingFee: 30000,
                totalAmount: 130000,
                shippingAddressSnapshot: {},
              },
            });
            await tx.payment.create({
              data: { orderId: order.id, provider: 'WALLET', amount: 130000, status: 'SUCCESS' },
            });
            await tx.escrowRecord.create({
              data: {
                orderId: order.id,
                totalAmount: 130000,
                platformFee: 7000,
                sellerPayout: 93000,
              },
            });
            await tx.shipment.create({
              data: {
                orderId: order.id,
                shippingFee: 30000,
                chargeableWeight: 1,
                waybillCode: marker,
                metadata: { ghnShopId: 1, ghnEnvironment: 'SANDBOX' },
              },
            });
            await returns.request(order.id, buyer, { reason: 'Failed delivery' });
            await returns.review(order.id, seller, { reason: 'Accepted', decision: 'APPROVE' });
            await returns.receive(order.id, seller, { reason: 'Received damaged', restock: false });
            assert.equal(
              (await tx.order.findUniqueOrThrow({ where: { id: order.id } })).status,
              'REFUNDED',
            );
            assert.equal(
              (await tx.inventory.findUniqueOrThrow({ where: { id: stock.id } })).availableQty,
              4,
            );
            assert.equal(
              Number((await tx.wallet.findUniqueOrThrow({ where: { userId: buyer.id } })).balance),
              260000,
            );
            assert.equal(
              Number(
                (await tx.wallet.findUniqueOrThrow({ where: { userId: admin.id } })).lockedBalance,
              ),
              0,
            );
            throw rollback;
          },
          { timeout: 60000 },
        ),
        (error) => error === rollback,
      );
      assert.equal(await prisma.user.count({ where: { fullName: marker } }), 0);
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  },
);
