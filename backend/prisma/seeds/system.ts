/**
 * System bootstrap: the minimum rows the platform needs to operate.
 *
 * This is safe to run against production, and it is the only seed that is. It
 * creates no people, no shops, no products and no orders, so a fresh deployment
 * starts with an empty marketplace and the frontend shows its empty states.
 * It is idempotent, so running it again after an upgrade only fills in what is
 * missing.
 *
 * Notably it does not create an administrator. The previous seed shipped
 * `Admin@123456`, which is a published password on every deployment that forgot
 * to change it. The first administrator is created explicitly with
 * `npm run admin:create`.
 *
 * Usage: npm run db:bootstrap
 */
import { PrismaClient, WalletType } from '@prisma/client';
import { createSeedClient, describeTarget } from './client';

/**
 * Platform settings and the values they start at.
 *
 * These were only ever held in Redis, so flushing the cache silently reverted
 * every operational decision an administrator had made. They now live in the
 * database, with Redis in front of them as a cache.
 */
const DEFAULT_SETTINGS: Array<{ key: string; value: number; description: string }> = [
  {
    key: 'platformFeePercentage',
    value: 7.0,
    description: 'Platform commission percentage collected on each completed order.',
  },
  {
    key: 'cartExpirationDays',
    value: 7,
    description: 'Number of days an inactive shopping cart is retained before expiration.',
  },
  {
    key: 'checkoutTimeoutMinutes',
    value: 15,
    description: 'Number of minutes a checkout session is held before automatic cancellation.',
  },
  {
    key: 'inventoryReservationTimeout',
    value: 30,
    description: 'Number of minutes inventory is reserved for an unpaid order.',
  },
  {
    key: 'maxActiveCartPerUser',
    value: 1,
    description: 'Maximum number of active carts allowed per user account.',
  },
  { key: 'categoryMaxLevel', value: 3, description: 'Maximum nesting depth of the category tree.' },
  {
    key: 'maxProductImages',
    value: 5,
    description: 'Maximum number of images allowed per product.',
  },
  {
    key: 'antiSnipingTriggerMinutes',
    value: 2,
    description: 'Placing a bid within this window before closing extends the auction.',
  },
  {
    key: 'antiSnipingExtendMinutes',
    value: 5,
    description: 'Number of minutes added when anti-sniping extension is triggered.',
  },
];

/**
 * The platform's own ledgers.
 *
 * Buyer escrow and platform revenue used to be added to whichever
 * administrator's personal wallet happened to process the order, which mixes
 * money the platform holds on behalf of a buyer with money an employee can
 * withdraw. They are separate wallets with no owner, and a partial unique index
 * allows exactly one of each.
 */
const PLATFORM_WALLETS: Array<{ type: WalletType; description: string }> = [
  {
    type: WalletType.ESCROW_LIABILITY,
    description: 'Escrow funds held on behalf of buyers until order completion.',
  },
  { type: WalletType.PLATFORM_REVENUE, description: 'Realized platform commission revenue.' },
];

/**
 * Creates or repairs the system rows.
 *
 * @param prisma - A connected client.
 * @returns What it created and what already existed.
 */
export async function bootstrapSystem(prisma: PrismaClient): Promise<{
  settingsCreated: number;
  settingsExisting: number;
  walletsCreated: number;
  walletsExisting: number;
}> {
  let settingsCreated = 0;
  let settingsExisting = 0;

  for (const setting of DEFAULT_SETTINGS) {
    // An existing value is an operational decision somebody made; only the
    // description is refreshed.
    const existing = await prisma.systemSetting.findUnique({ where: { key: setting.key } });
    if (existing) {
      settingsExisting += 1;
      if (existing.description !== setting.description) {
        await prisma.systemSetting.update({
          where: { key: setting.key },
          data: { description: setting.description },
        });
      }
      continue;
    }
    await prisma.systemSetting.create({
      data: { key: setting.key, value: setting.value, description: setting.description },
    });
    settingsCreated += 1;
  }

  let walletsCreated = 0;
  let walletsExisting = 0;

  for (const wallet of PLATFORM_WALLETS) {
    const existing = await prisma.wallet.findFirst({
      where: { type: wallet.type, userId: null },
      select: { id: true },
    });
    if (existing) {
      walletsExisting += 1;
      continue;
    }
    await prisma.wallet.create({
      data: { type: wallet.type, userId: null, balance: 0, lockedBalance: 0, currency: 'VND' },
    });
    walletsCreated += 1;
  }

  return { settingsCreated, settingsExisting, walletsCreated, walletsExisting };
}

async function main(): Promise<void> {
  const prisma = createSeedClient();
  console.log(`Target database: ${describeTarget()}`);
  try {
    const result = await bootstrapSystem(prisma);
    console.log('System bootstrap complete.');
    console.log(
      `  settings: ${result.settingsCreated} created, ${result.settingsExisting} already present`,
    );
    console.log(
      `  platform wallets: ${result.walletsCreated} created, ${result.walletsExisting} already present`,
    );
    const users = await prisma.user.count();
    if (users === 0) {
      console.log('');
      console.log('No accounts exist yet. Create the first administrator with:');
      console.log('  npm run admin:create');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Only run when invoked directly, so the bootstrap can also be imported by tests.
if (process.argv[1] && process.argv[1].includes('system')) {
  main().catch((error: unknown) => {
    console.error(`System bootstrap failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
