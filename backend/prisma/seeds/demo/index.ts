/**
 * Demo showcase seed.
 *
 * Builds a full marketplace around the moment it runs: live auctions with bids
 * placed seconds ago, winners still inside their payment window, orders in
 * every state spread over the last thirty days, reviews, chats, notifications
 * and wishlists. Nothing is dated in advance, so the demo is current whenever
 * it is shown, and every random choice comes from a seeded generator, so two
 * runs produce the same data.
 *
 * This never runs against production. Demo accounts share one printed password,
 * which is exactly what must not exist on a real deployment.
 *
 * Usage:
 *   npm run seed:demo          # add demo data
 *   npm run seed:demo:reset    # delete all data first, then add demo data
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapSystem } from '../system';
import { createSeedClient, describeTarget } from '../client';
import { DemoClock, SeededRandom } from './random';
import { seedUsersAndShops } from './01-users-shops';
import { seedCatalogAndInventory } from './02-catalog-inventory';
import { seedAuctionsAndBids } from './03-auctions-bids';
import { seedOrdersEscrowAndDisputes } from './04-orders-escrow-disputes';
import { seedReviewsChatAndEngagement } from './05-reviews-chat-engagement';

/**
 * Refuses to run where demo credentials would be a breach.
 *
 * @throws Error when NODE_ENV is production without an explicit override.
 */
export function assertNotProduction(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  if (env.ALLOW_DEMO_SEED === 'true') {
    console.warn(
      'WARNING: seeding demo data into a production environment because ALLOW_DEMO_SEED=true.',
    );
    console.warn('         Every demo account shares one password that this run will print.');
    return;
  }
  throw new Error(
    'Refusing to seed demo data with NODE_ENV=production. ' +
      'Demo accounts share one printed password. Set ALLOW_DEMO_SEED=true only if you truly intend this.',
  );
}

/**
 * Deletes every row, in an order that respects the foreign keys.
 *
 * Only reached with `--reset`, and only after the production guard.
 */
async function resetDatabase(prisma: PrismaClient): Promise<void> {
  // Ordered children before parents. Prisma has no cascade-everything, and
  // TRUNCATE across 53 tables by name would silently miss new ones.
  await prisma.$transaction([
    prisma.reviewReplyMedia.deleteMany(),
    prisma.reviewReply.deleteMany(),
    prisma.reviewMedia.deleteMany(),
    prisma.productReviewHelpfulVote.deleteMany(),
    prisma.productReview.deleteMany(),
    prisma.customerReview.deleteMany(),
    prisma.review.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatConversation.deleteMany(),
    prisma.chatAutoReply.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.bannerDisableHistory.deleteMany(),
    prisma.eventBanner.deleteMany(),
    prisma.auctionComplaint.deleteMany(),
    prisma.auctionAward.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.auctionItem.deleteMany(),
    prisma.auction.deleteMany(),
    prisma.orderRefund.deleteMany(),
    prisma.afterSalesRequest.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.escrowRecord.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.inventoryReservation.deleteMany(),
    prisma.inventoryLedger.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.productOption.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.shopViolation.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.sellerGhnAccount.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.shopActionLog.deleteMany(),
    prisma.sellerUpgradeRequest.deleteMany(),
    prisma.staffInvitation.deleteMany(),
    prisma.reputationLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.userAddress.deleteMany(),
    prisma.outboxEvent.deleteMany(),
    prisma.eventLog.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main(): Promise<void> {
  assertNotProduction();

  const reset = process.argv.includes('--reset');
  const seedArgument = process.argv.find((argument) => argument.startsWith('--seed='));
  const seedValue = seedArgument ? Number(seedArgument.split('=')[1]) : 20261125;

  const prisma = createSeedClient();
  const clock = new DemoClock();
  const random = new SeededRandom(Number.isFinite(seedValue) ? seedValue : 20261125);

  console.log(`Target database: ${describeTarget()}`);
  console.log(`Timeline anchored at: ${clock.localLabel()}`);
  console.log(`Random seed: ${seedValue}`);
  console.log('');

  try {
    if (reset) {
      console.log('Deleting all existing data (--reset)...');
      await resetDatabase(prisma);
    }

    // The demo data sits on top of the system rows, so the platform ledgers
    // exist before any order tries to move money through them.
    const system = await bootstrapSystem(prisma);
    console.log(
      `System rows ready: ${system.settingsCreated + system.settingsExisting} settings, ` +
        `${system.walletsCreated + system.walletsExisting} platform wallets.`,
    );

    const people = await seedUsersAndShops(prisma, clock, random);
    console.log(
      `People: 1 admin, ${people.staff.length} staff, ${people.sellers.length} sellers, ${people.buyers.length} buyers.`,
    );

    const catalog = await seedCatalogAndInventory(prisma, clock, random, people);
    console.log(
      `Catalogue: ${catalog.categories.length} categories, ${catalog.products.length} products in stock.`,
    );

    const auctions = await seedAuctionsAndBids(prisma, clock, random, people);
    console.log(
      `Auctions: ${auctions.live.length} live, ${auctions.upcoming.length} upcoming, ` +
        `${auctions.awaitingPayment.length} awaiting winner payment, ${auctions.settled.length} settled.`,
    );

    const orders = await seedOrdersEscrowAndDisputes(prisma, clock, random, people, catalog);
    console.log(`Orders: ${orders.length} across every state of the order machine.`);

    const engagement = await seedReviewsChatAndEngagement(
      prisma,
      clock,
      random,
      people,
      catalog,
      orders,
    );
    console.log(
      `Engagement: ${engagement.shopReviews} shop reviews, ${engagement.productReviews} product reviews, ` +
        `${engagement.conversations} conversations, ${engagement.notifications} notifications, ` +
        `${engagement.wishlistItems} wishlist items, ${engagement.banners} banners.`,
    );

    console.log('');
    console.log('Demo accounts (one shared password):');
    console.log(`  password: ${people.password}`);
    for (const person of [people.admin, ...people.staff, ...people.sellers, ...people.buyers]) {
      console.log(`  ${person.role.padEnd(14)} ${person.email}`);
    }
    console.log('');
    console.log('Two auctions are live right now and close within the hour.');
    console.log('Two more have just ended with a winner still inside the payment window.');
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].includes('demo')) {
  main().catch((error: unknown) => {
    console.error(`Demo seed failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
