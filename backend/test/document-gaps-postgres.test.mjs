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
    const adminPool = new Pool({
      connectionString: url.toString(),
      connectionTimeoutMillis: 10000,
    });
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
      const { AuctionCheckoutService } = source('auction/services/auction-checkout.service');
      const { AuctionService } = source('auction/services/auction.service');
      const { ReputationService } = source('users/services/reputation.service');
      const { OrderEscrowService } = source('orders/services/order-escrow.service');
      const { ReportsService } = source('reviews/services/reports.service');
      const { ReportModerationService } = source('reviews/services/report-moderation.service');
      const { ReviewsService } = source('reviews/services/reviews.service');
      const { OrderService } = source('orders/services/order.service');
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
            reputationScore: 100,
            trustLevel: 'GOOD',
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
      const finance = {
        getOrCreatePrimaryAdminWallet: async () => adminWallet,
        getOrCreateEscrowWallet: async () => adminWallet,
        getOrCreatePlatformRevenueWallet: async () => adminWallet,
      };
      const inventory = new InventoryService(prisma);
      const stock = new AuctionStockService(inventory);
      const reputation = new ReputationService(prisma, {});
      const adminSettings = { getAll: async () => ({ platformFeePercentage: 7 }) };
      const escrow = new OrderEscrowService(prisma, adminSettings, finance);
      let shippingCalls = 0;
      const shipping = {
        quote: async () => {
          shippingCalls++;
          return { fee: { total: 30000 }, origin: {}, parcel: {}, request: {} };
        },
      };
      const { AuctionSecondChanceHelper } = source('auction/services/auction-second-chance.helper');
      const checkout = new AuctionCheckoutService(
        prisma,
        shipping,
        escrow,
        new AuctionSecondChanceHelper(prisma, reputation, adminSettings, finance, stock),
      );
      const gateway = {
        broadcastAuctionStarted() {},
        broadcastBidPlaced() {},
        broadcastTimeExtended() {},
        broadcastLotEnded() {},
        broadcastAuctionEnded() {},
        broadcastTimerSync() {},
      };
      const { AuctionAdminHelper } = source('auction/services/auction-admin.helper');
      const { AuctionBiddingHelper } = source('auction/services/auction-bidding.helper');
      const { AuctionConsignmentHelper } = source('auction/services/auction-consignment.helper');
      const auctions = new AuctionService(
        prisma,
        gateway,
        stock,
        new AuctionAdminHelper(prisma, gateway),
        new AuctionConsignmentHelper(prisma, undefined),
        new AuctionBiddingHelper(prisma, gateway, checkout),
      );
      const category = await prisma.category.create({
        data: { name: 'Fixture', slug: randomUUID() },
      });
      const warehouse = await inventory.ensureDefaultWarehouse();
      async function createAuction(targetSeller = seller) {
        const room = await auctions.adminCreateAuction(admin.id, {
          title: 'Fixture auction',
          startTime: new Date(Date.now() + 60000).toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        });
        const lot = await auctions.registerAuctionItem(room.id, targetSeller.id, {
          title: 'Fixture item',
          description: 'Test item',
          images: ['https://example.invalid/fixture.jpg'],
          certificateImages: ['https://example.invalid/cert.jpg'],
          proposedStartingPrice: 100000,
          proposedBidIncrement: 10000,
          weightGrams: 500,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10,
        });
        await auctions.adminReviewAuctionItem(lot.id, admin.id, { action: 'APPROVE' });
        await auctions.adminStartAuction(room.id);
        await prisma.auction.update({
          where: { id: room.id },
          data: { startTime: new Date(Date.now() - 120000) },
        });
        return { auction: room, lot };
      }
      const address = {
        recipientName: 'Fixture',
        phone: '0900000001',
        city: 'Ho Chi Minh',
        street: 'Test address',
      };

      await t.test(
        'one winning bid creates one order; concurrent checkout consumes the 30% deposit once and escrows the full total',
        async () => {
          const { auction, lot } = await createAuction();
          await auctions.placeBid(auction.id, buyer.id, {
            auctionItemId: lot.id,
            bidAmount: 100000,
          });
          const results = await Promise.all([
            auctions.adminEndLot(auction.id, lot.id, admin.id),
            auctions.adminEndLot(auction.id, lot.id, admin.id),
          ]);
          assert.equal(results[0].awardId, results[1].awardId);
          assert.equal(await prisma.auctionAward.count({ where: { auctionItemId: lot.id } }), 1);
          const offer = await prisma.auctionAward.findUniqueOrThrow({
            where: { id: results[0].awardId },
          });
          assert.equal(Number(offer.depositAmount), 30000);
          const { OrderPaymentHelper } = source('orders/services/order-payment.helper');
          const retail = new OrderService(
            prisma,
            shipping,
            new OrderPaymentHelper(
              prisma,
              {},
              { next: async () => 1_000_000_000_001 },
              {},
              escrow,
              inventory,
            ),
            inventory,
          );
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
          const calls = shippingCalls;
          await checkout.checkout(offer.id, buyer.id, address);
          assert.equal(shippingCalls, calls);
          await prisma.order.update({
            where: { id: offer.orderId },
            data: { status: 'CONFIRMED' },
          });
          await prisma.order.create({
            data: {
              buyerId: buyer.id,
              sellerId: seller.id,
              status: 'CONFIRMED',
              subtotal: 100000,
              shippingFee: 0,
              totalAmount: 100000,
              shippingAddressSnapshot: address,
              items: {
                create: {
                  titleSnapshot: 'Second completed item',
                  unitPrice: 100000,
                  totalPrice: 100000,
                  quantity: 1,
                },
              },
            },
          });
          const { ReviewsModerationHelper } = source('reviews/services/reviews-moderation.helper');
          const { ReviewsRepliesHelper } = source('reviews/services/reviews-replies.helper');
          const reviews = new ReviewsService(
            prisma,
            reputation,
            new ReviewsModerationHelper(prisma, reputation),
            new ReviewsRepliesHelper(prisma, undefined),
          );
          await reviews.create(buyer.id, offer.orderId, { rating: 5 }, 'shop');
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: seller.id, referenceId: `REVIEW_BONUS:${offer.orderId}` },
            }),
            1,
          );
        },
      );

      await t.test(
        'default forfeits 30% deposit with 7% platform fee, penalizes primary winner once, and invites second-chance buyer',
        async () => {
          const { auction, lot } = await createAuction();
          await auctions.placeBid(auction.id, buyer.id, {
            auctionItemId: lot.id,
            bidAmount: 100000,
          });
          await auctions.placeBid(auction.id, runner.id, {
            auctionItemId: lot.id,
            bidAmount: 120000,
          });
          const ended = await auctions.adminEndLot(auction.id, lot.id, admin.id);
          await prisma.auctionAward.update({
            where: { id: ended.awardId },
            data: { expiresAt: new Date(Date.now() - 1000) },
          });
          await Promise.all([
            checkout.markPaymentDefault(ended.awardId, admin.id),
            checkout.markPaymentDefault(ended.awardId, admin.id),
          ]);
          const winnerWallet = await prisma.wallet.findUniqueOrThrow({
            where: { userId: runner.id },
          });
          assert.equal(Number(winnerWallet.balance), 264000);
          assert.equal(Number(winnerWallet.lockedBalance), 0);
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: runner.id, penaltyType: 'AUCTION_DEFAULT' },
            }),
            1,
          );
          const next = await prisma.auctionAward.findFirstOrThrow({
            where: { auctionItemId: lot.id, status: 'AWAITING_ACCEPTANCE' },
          });
          assert.equal(next.buyerId, buyer.id);
          assert.equal(Number(next.offerAmount), 100000);
          assert.equal(Number(next.depositAmount), 30000);
          await checkout.respondSecondChance(next.id, buyer.id, true);
          await checkout.withdrawSecondChanceByAdmin(next.id, admin.id);
          assert.equal(
            await prisma.reputationLog.count({
              where: { userId: buyer.id, penaltyType: 'AUCTION_DEFAULT' },
            }),
            0,
          );
          assert.equal(
            (await prisma.auctionItem.findUniqueOrThrow({ where: { id: lot.id } })).lotStatus,
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
          const auth = new AuthService(
            prisma,
            {
              get: (key) =>
                key === 'JWT_SECRET' || key === 'REFRESH_TOKEN_SECRET'
                  ? 'test-secret-key-16'
                  : undefined,
            },
            {},
            { signAccessToken: async () => 'test-access-token', revokeAllSessions: async () => {} },
            {},
            {},
          );
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
        'insufficient funds preserve the 30% deposit, order, and payment records',
        async () => {
          const lowBalanceBuyer = await user('BUYER');
          await prisma.wallet.update({
            where: { userId: lowBalanceBuyer.id },
            data: { balance: 110000 },
          });
          const { auction, lot } = await createAuction();
          await auctions.placeBid(auction.id, lowBalanceBuyer.id, {
            auctionItemId: lot.id,
            bidAmount: 100000,
          });
          const result = await auctions.adminEndLot(auction.id, lot.id, admin.id);
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
        },
      );

      await t.test('deadline recovery closes due lots without bids cleanly', async () => {
        const { lot } = await createAuction();
        await prisma.auctionItem.update({
          where: { id: lot.id },
          data: { endTime: new Date(Date.now() - 1000) },
        });
        const lifecycle = new AuctionLifecycleService(prisma, auctions, checkout, gateway);
        await lifecycle.tick();
        await lifecycle.tick();
        assert.equal(
          (await prisma.auctionItem.findUniqueOrThrow({ where: { id: lot.id } })).lotStatus,
          'FAILED',
        );
      });

      await t.test(
        'shop warnings apply the same suspension thresholds as other reputation changes',
        async () => {
          const warned = await user('SELLER');
          const { AdminShopsModerationHelper } = source(
            'admin/services/admin-shops-moderation.helper',
          );
          await new AdminShopsService(
            prisma,
            new AdminShopsModerationHelper(prisma, reputation),
          ).warnShop(warned.id, admin.id, {
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
          const room = await auctions.adminCreateAuction(admin.id, {
            title: 'Probation room',
            startTime: new Date(Date.now() + 60000).toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
          });
          await assert.rejects(
            auctions.registerAuctionItem(room.id, legacySeller.id, {
              title: 'Legacy item',
              description: 'Fixture',
              images: ['https://example.invalid/item.jpg'],
              certificateImages: ['https://example.invalid/cert.jpg'],
              proposedStartingPrice: 100000,
              proposedBidIncrement: 10000,
              weightGrams: 500,
              lengthCm: 10,
              widthCm: 10,
              heightCm: 10,
            }),
            (error) => error.getStatus() === 400,
          );
          assert.equal(await prisma.auctionItem.count({ where: { sellerId: legacySeller.id } }), 0);
          const product = await prisma.product.create({
            data: {
              sellerId: legacySeller.id,
              categoryId: category.id,
              title: 'Legacy stock fixture',
              description: 'Fixture',
              basePrice: 100000,
            },
          });
          await inventory.createInitialStock(prisma, warehouse.id, product.id, 1);
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
