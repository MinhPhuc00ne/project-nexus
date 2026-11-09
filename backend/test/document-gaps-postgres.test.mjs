import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
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
const source = (path) => load(`../src/modules/${path}.ts`);

test(
  'document gap workflows use real PostgreSQL migrations, locks and constraints in an isolated schema',
  {
    skip: process.env.NEXUS_DOCUMENT_GAPS_DB_TEST !== '1',
    timeout: 90000,
  },
  async (t) => {
    dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
      'Local database required',
    );
    const schema = `gap_test_${randomUUID().replaceAll('-', '')}`;
    assert.match(schema, /^gap_test_[a-f0-9]{32}$/);
    const adminPool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 3000 });
    let prisma;
    let pool;
    try {
      const client = await adminPool.connect();
      try {
        await client.query(`CREATE SCHEMA "${schema}"`);
        await client.query(`SET search_path TO "${schema}"`);
        await client.query('BEGIN');
        const folder = new URL('../prisma/migrations/', import.meta.url);
        for (const entry of (await readdir(folder, { withFileTypes: true }))
          .filter((item) => item.isDirectory())
          .sort((a, b) => a.name.localeCompare(b.name))) {
          const sql = (
            await readFile(new URL(`${entry.name}/migration.sql`, folder), 'utf8')
          ).replace(/^\s*(?:BEGIN|COMMIT);[ \t]*$/gm, '');
          await client.query(sql);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      pool = new Pool({
        connectionString: url.toString(),
        options: `-c search_path=${schema}`,
        max: 8,
      });
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      const { InventoryService } = source('catalog/services/inventory.service');
      const { AuctionStockService } = source('catalog/services/auction-stock.service');
      const { AuctionCheckoutService } = source('commerce/services/auction-checkout.service');
      const { AuctionService } = source('auction/services/auction.service');
      const { ReputationService } = source('users/services/reputation.service');
      const { OrderEscrowService } = source('commerce/services/order-escrow.service');
      const { ReportsService } = source('commerce/services/reports.service');
      const { ReportModerationService } = source('commerce/services/report-moderation.service');
      const { ReviewsService } = source('commerce/services/reviews.service');
      const { OrderService } = source('commerce/services/order.service');
      const { AuthService } = source('auth/services/auth.service');
      const { AuctionLifecycleService } = source('auction/services/auction-lifecycle.service');
      const { AdminShopsService } = source('admin/services/admin-shops.service');
      const user = (role) =>
        prisma.user.create({
          data: {
            email: `${randomUUID()}@example.invalid`,
            fullName: 'Isolated fixture',
            passwordHash: 'test-only',
            role,
            isVerified: true,
            wallet: { create: { balance: 300000 } },
          },
        });
      const [admin, seller, buyer, runner] = await Promise.all([
        user('ADMIN'),
        user('SELLER'),
        user('BUYER'),
        user('BUYER'),
      ]);
      const adminWallet = await prisma.wallet.update({
        where: { userId: admin.id },
        data: { balance: 0 },
      });
      const finance = { getOrCreatePrimaryAdminWallet: async () => adminWallet };
      const inventory = new InventoryService(prisma);
      const stock = new AuctionStockService(inventory);
      const reputation = new ReputationService(prisma, {});
      const escrow = new OrderEscrowService(
        prisma,
        { getSettings: async () => ({ platformFeePercentage: 7 }) },
        finance,
      );
      let shippingCalls = 0;
      const shipping = {
        quote: async () => {
          shippingCalls++;
          return { fee: { total: 30000 }, origin: {}, parcel: {}, request: {} };
        },
      };
      const checkout = new AuctionCheckoutService(prisma, stock, shipping, escrow, reputation);
      const gateway = {
        broadcastBidPlaced() {},
        broadcastTimeExtended() {},
        broadcastAuctionEnded() {},
      };
      const auctions = new AuctionService(prisma, gateway, stock, checkout);
      const category = await prisma.category.create({
        data: { name: 'Fixture', slug: randomUUID() },
      });
      const warehouse = await inventory.ensureDefaultWarehouse();
      async function createAuction() {
        const product = await prisma.product.create({
          data: {
            sellerId: seller.id,
            categoryId: category.id,
            title: 'Fixture item',
            description: 'Test item',
            basePrice: 100000,
            weightGrams: 500,
            lengthCm: 10,
            widthCm: 10,
            heightCm: 10,
          },
        });
        await inventory.createInitialStock(prisma, warehouse.id, product.id, 1);
        const auction = await auctions.createAuction(seller.id, {
          productId: product.id,
          title: 'Fixture auction',
          startingPrice: 100000,
          bidIncrement: 10000,
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        });
        return { product, auction };
      }
      const address = {
        recipientName: 'Fixture',
        phone: '0900000001',
        city: 'Ho Chi Minh',
        street: 'Test address',
      };

      await t.test(
        'one winning bid creates one order; concurrent checkout consumes the deposit once and escrows the full total',
        async () => {
          const { auction, product } = await createAuction();
          await auctions.placeBid(auction.id, buyer.id, { bidAmount: 100000 });
          const results = await Promise.all([
            auctions.endAuction(auction.id, admin.id, 'ADMIN'),
            auctions.endAuction(auction.id, admin.id, 'ADMIN'),
          ]);
          assert.equal(results[0].awardId, results[1].awardId);
          assert.equal(await prisma.auctionAward.count({ where: { auctionId: auction.id } }), 1);
          const offer = await prisma.auctionAward.findUniqueOrThrow({
            where: { id: results[0].awardId },
          });
          const retail = new OrderService(prisma, {}, {}, shipping, escrow, inventory);
          await assert.rejects(retail.payOrderByWallet(offer.orderId, buyer.id), /quyền mua/);
          await assert.rejects(
            checkout.checkout(offer.id, runner.id, address),
            (error) => error.getStatus() === 403,
          );
          const paid = await Promise.all([
            checkout.checkout(offer.id, buyer.id, address),
            checkout.checkout(offer.id, buyer.id, address),
          ]);
          assert.equal(paid[0].status, 'PAID');
          assert.equal(paid[1].id, paid[0].id);
          const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: buyer.id } });
          assert.equal(Number(wallet.balance), 170000);
          assert.equal(Number(wallet.lockedBalance), 0);
          assert.equal(await prisma.payment.count({ where: { orderId: offer.orderId } }), 1);
          const held = await prisma.escrowRecord.findUniqueOrThrow({
            where: { orderId: offer.orderId },
          });
          assert.equal(Number(held.totalAmount), 130000);
          assert.equal(Number(held.platformFee), 7000);
          assert.equal(Number(held.sellerPayout), 93000);
          const remaining = await prisma.inventory.findFirstOrThrow({
            where: { productId: product.id },
          });
          assert.equal(remaining.totalQty, 0);
          assert.equal(remaining.reservedQty, 0);
          const calls = shippingCalls;
          await checkout.checkout(offer.id, buyer.id, address);
          assert.equal(shippingCalls, calls);
          await prisma.order.update({
            where: { id: offer.orderId },
            data: { status: 'CONFIRMED' },
          });
          const reviews = new ReviewsService(prisma, reputation);
          await Promise.all([
            reviews.create(buyer.id, offer.orderId, { rating: 5 }, 'shop'),
            reviews.create(buyer.id, offer.orderId, { rating: 5 }, 'product', product.id),
          ]);
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: seller.id, referenceId: `REVIEW_BONUS:${offer.orderId}` },
            }),
            1,
          );
        },
      );

      await t.test(
        'expiry refunds and penalizes the original winner once, offers the next bidder without debiting them, and moves stock',
        async () => {
          const { auction, product } = await createAuction();
          await auctions.placeBid(auction.id, buyer.id, { bidAmount: 100000 });
          await auctions.placeBid(auction.id, runner.id, { bidAmount: 120000 });
          const ended = await auctions.endAuction(auction.id, admin.id, 'ADMIN');
          await prisma.auctionAward.update({
            where: { id: ended.awardId },
            data: { expiresAt: new Date(Date.now() - 1000) },
          });
          await Promise.all([checkout.expire(ended.awardId), checkout.expire(ended.awardId)]);
          const winnerWallet = await prisma.wallet.findUniqueOrThrow({
            where: { userId: runner.id },
          });
          assert.equal(Number(winnerWallet.balance), 300000);
          assert.equal(Number(winnerWallet.lockedBalance), 0);
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: runner.id, penaltyType: 'AUCTION_DEFAULT' },
            }),
            1,
          );
          const next = await prisma.auctionAward.findFirstOrThrow({
            where: { auctionId: auction.id, status: 'AWAITING_CHECKOUT' },
            include: { order: true },
          });
          assert.equal(next.order.buyerId, buyer.id);
          assert.equal(Number(next.depositAmount), 0);
          const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: buyer.id } });
          assert.equal(Number(before.balance), 170000);
          await assert.rejects(
            checkout.expire(next.id, runner.id),
            (error) => error.getStatus() === 403,
          );
          await checkout.expire(next.id, buyer.id);
          await checkout.expire(next.id, buyer.id);
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: buyer.id, penaltyType: 'AUCTION_DEFAULT' },
            }),
            0,
          );
          assert.equal(
            (await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } }))
              .availableQty,
            1,
          );
          assert.equal(
            (await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } })).status,
            'FAILED',
          );
        },
      );

      await t.test(
        'reputation milestones serialize and preserve increments above 100',
        async () => {
          const awards = await Promise.all(
            [1, 2].map(() =>
              reputation.awardProfileCompletion({
                userId: buyer.id,
                fieldKey: 'PHONE',
                points: 10,
                reason: 'Fixture milestone',
              }),
            ),
          );
          assert.equal(awards.filter(Boolean).length, 1);
          await Promise.all(
            [1, 2].map(() =>
              reputation.adjustScore({
                userId: buyer.id,
                deltaPoints: 10,
                reason: 'Fixture increment',
                skipNotification: true,
              }),
            ),
          );
          const summary = await reputation.getReputationSummary(buyer.id);
          assert.equal(summary.score, 130);
          assert.equal(summary.trustLevel, 'EXCELLENT');
        },
      );

      await t.test(
        'verification initializes 50 PROBATION points once, including concurrent OTP replay',
        async () => {
          const account = await prisma.user.create({
            data: {
              email: `${randomUUID()}@example.invalid`,
              passwordHash: 'fixture',
              fullName: 'Verification',
              verificationCode: '123456',
              codeExpiresAt: new Date(Date.now() + 60000),
            },
          });
          const auth = new AuthService(prisma, {}, {}, {}, {});
          await Promise.all([
            auth.verifyEmail({ email: account.email, code: '123456' }),
            auth.verifyEmail({ email: account.email, code: '123456' }),
          ]);
          const verified = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
          assert.equal(verified.reputationScore, 50);
          assert.equal(verified.trustLevel, 'PROBATION');
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: account.id, referenceId: 'REGISTRATION_EMAIL' },
            }),
            1,
          );
        },
      );

      await t.test(
        'insufficient funds preserve the deposit, order, inventory and payment records',
        async () => {
          const lowBalanceBuyer = await user('BUYER');
          await prisma.wallet.update({
            where: { userId: lowBalanceBuyer.id },
            data: { balance: 110000 },
          });
          const { auction, product } = await createAuction();
          await auctions.placeBid(auction.id, lowBalanceBuyer.id, { bidAmount: 100000 });
          const result = await auctions.endAuction(auction.id, admin.id, 'ADMIN');
          const award = await prisma.auctionAward.findUniqueOrThrow({
            where: { id: result.awardId },
          });
          const before = await prisma.wallet.findUniqueOrThrow({
            where: { userId: lowBalanceBuyer.id },
          });
          await assert.rejects(
            checkout.checkout(award.id, lowBalanceBuyer.id, address),
            (error) => error.getStatus() === 400,
          );
          const after = await prisma.wallet.findUniqueOrThrow({
            where: { userId: lowBalanceBuyer.id },
          });
          assert.equal(after.balance.toString(), before.balance.toString());
          assert.equal(after.lockedBalance.toString(), before.lockedBalance.toString());
          assert.equal(
            (await prisma.order.findUniqueOrThrow({ where: { id: award.orderId } })).status,
            'PENDING_PAYMENT',
          );
          assert.equal(await prisma.payment.count({ where: { orderId: award.orderId } }), 0);
          assert.equal(
            (await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } }))
              .reservedQty,
            1,
          );
          await checkout.expire(award.id, lowBalanceBuyer.id);
        },
      );

      await t.test(
        'deadline recovery closes due rooms without bids and returns reserved stock',
        async () => {
          const { auction, product } = await createAuction();
          await prisma.auction.update({
            where: { id: auction.id },
            data: { endTime: new Date(Date.now() - 1000) },
          });
          const lifecycle = new AuctionLifecycleService(prisma, auctions, checkout);
          await lifecycle.tick();
          await lifecycle.tick();
          assert.equal(
            (await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } })).status,
            'FAILED',
          );
          const row = await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } });
          assert.equal(row.availableQty, 1);
          assert.equal(row.reservedQty, 0);
        },
      );

      await t.test(
        'shop warnings apply the same suspension thresholds as other reputation changes',
        async () => {
          const warned = await user('SELLER');
          await new AdminShopsService(prisma, reputation).warnShop(warned.id, admin.id, {
            reason: 'Documented fixture violation',
            penaltyPoints: 70,
          });
          const row = await prisma.user.findUniqueOrThrow({ where: { id: warned.id } });
          assert.equal(row.reputationScore, 30);
          assert.equal(row.trustLevel, 'SUSPENDED');
          assert.equal(row.isShopSuspended, true);
          assert.equal(await prisma.reputationLog.count({ where: { userId: warned.id } }), 1);
        },
      );

      await t.test(
        'legacy trust labels cannot bypass the documented probation restriction',
        async () => {
          const legacySeller = await user('SELLER');
          await prisma.user.update({
            where: { id: legacySeller.id },
            data: { reputationScore: 70, trustLevel: 'EXCELLENT' },
          });
          const product = await prisma.product.create({
            data: {
              sellerId: legacySeller.id,
              categoryId: category.id,
              title: 'Legacy item',
              description: 'Fixture',
              basePrice: 100000,
            },
          });
          await inventory.createInitialStock(prisma, warehouse.id, product.id, 1);
          await assert.rejects(
            auctions.createAuction(legacySeller.id, {
              productId: product.id,
              title: 'Restricted session',
              startingPrice: 100000,
              startTime: new Date().toISOString(),
              endTime: new Date(Date.now() + 7200000).toISOString(),
            }),
            (error) => error.getStatus() === 400,
          );
          await assert.rejects(
            prisma.$transaction((tx) =>
              stock.reserve(tx, {
                productId: product.id,
                referenceId: randomUUID(),
                expiresAt: new Date(Date.now() + 7200000),
              }),
            ),
            (error) => error.getStatus() === 400,
          );
          assert.equal(await prisma.auction.count({ where: { sellerId: legacySeller.id } }), 0);
          assert.equal(
            (await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } }))
              .availableQty,
            1,
          );
        },
      );

      await t.test(
        'moderation protects reporters and terminal verdicts, and applies the fraud sanction exactly once',
        async () => {
          const reports = new ReportsService(prisma);
          const report = await reports.create(buyer.id, seller.id, 'shop', {
            title: 'Fixture report',
            description: 'Fixture evidence for moderation',
          });
          const moderation = new ReportModerationService(prisma, reputation);
          await assert.rejects(
            moderation.review(
              report.id,
              { id: buyer.id, role: 'BUYER' },
              { status: 'DISMISSED', reason: 'Unauthorized attempt' },
            ),
            (error) => error.getStatus() === 403,
          );
          assert.equal((await moderation.list({ page: 1, limit: 20 }, runner.id)).total, 0);
          await moderation.review(
            report.id,
            { id: admin.id, role: 'ADMIN' },
            { status: 'INVESTIGATING', reason: 'Checking evidence' },
          );
          const decision = {
            status: 'CONFIRMED',
            reason: 'Confirmed counterfeit evidence',
            penaltyType: 'MISREPRESENTATION',
          };
          await assert.rejects(
            moderation.review(report.id, { id: runner.id, role: 'SUPPORT_STAFF' }, decision),
            (error) => error.getStatus() === 403,
          );
          const prior = await prisma.user.findUniqueOrThrow({ where: { id: seller.id } });
          await Promise.all([
            moderation.review(report.id, { id: admin.id, role: 'ADMIN' }, decision),
            moderation.review(report.id, { id: admin.id, role: 'ADMIN' }, decision),
          ]);
          const penalized = await prisma.user.findUniqueOrThrow({ where: { id: seller.id } });
          assert.equal(penalized.reputationScore, prior.reputationScore - 50);
          assert.equal(penalized.isShopSuspended, true);
          assert.equal(penalized.trustLevel, 'SUSPENDED');
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: seller.id, referenceId: report.id },
            }),
            1,
          );
          await assert.rejects(
            moderation.review(
              report.id,
              { id: admin.id, role: 'ADMIN' },
              { status: 'DISMISSED', reason: 'Overwrite verdict' },
            ),
            (error) => error.getStatus() === 409,
          );
          await reputation.adjustScore({
            userId: seller.id,
            deltaPoints: 1,
            reason: 'Later reward must not remove a fraud suspension',
            skipNotification: true,
          });
          assert.equal(
            (await prisma.user.findUniqueOrThrow({ where: { id: seller.id } })).trustLevel,
            'SUSPENDED',
          );
        },
      );
    } finally {
      if (prisma) await prisma.$disconnect();
      if (pool) await pool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminPool.end();
    }
  },
);
