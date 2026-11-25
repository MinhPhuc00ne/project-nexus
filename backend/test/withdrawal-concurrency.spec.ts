import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, WalletType, WithdrawalStatus } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WithdrawalService } from '../src/modules/commerce/services/withdrawal.service';

/**
 * A member firing several withdrawal requests at once.
 *
 * The three-pending limit was counted outside the transaction that created the
 * request, so concurrent calls all read the same count and all inserted. These
 * tests run real concurrent transactions, because the race only exists between
 * two database sessions.
 */

const connectionString = process.env.DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase('withdrawal limits hold under concurrency', () => {
  let prisma: PrismaClient;
  let pool: Pool;
  let service: WithdrawalService;
  let userId: string;

  const BANK = {
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountHolderName: 'FIXTURE HOLDER',
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    service = new WithdrawalService(prisma as never);

    const user = await prisma.user.create({
      data: {
        email: `withdraw-${randomUUID().slice(0, 8)}@example.invalid`,
        passwordHash: 'fixture',
        fullName: 'Withdrawal fixture',
        role: 'BUYER',
        ...BANK,
        wallet: { create: { type: WalletType.USER_WALLET, balance: 10_000_000 } },
      },
      select: { id: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.withdrawalRequest.deleteMany({ where: { userId } });
    await prisma.walletTransaction.deleteMany({ where: { wallet: { userId } } });
    await prisma.wallet.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await pool.end();
  });

  it('never lets concurrent requests exceed the three pending limit', async () => {
    // Six at once against a limit of three. Counting outside the transaction
    // let all six read zero pending and all six insert.
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        service.createWithdrawal(userId, { amount: 100_000, ...BANK } as never),
      ),
    );

    const succeeded = attempts.filter((attempt) => attempt.status === 'fulfilled').length;
    expect(succeeded).toBe(3);

    const pending = await prisma.withdrawalRequest.count({
      where: { userId, status: WithdrawalStatus.PENDING },
    });
    expect(pending).toBe(3);
  });

  it('holds the locked funds that match the accepted requests', async () => {
    const wallet = await prisma.wallet.findFirstOrThrow({ where: { userId } });
    const accepted = await prisma.withdrawalRequest.aggregate({
      where: { userId, status: WithdrawalStatus.PENDING },
      _sum: { amount: true },
    });

    // Only the requests that were actually accepted may have moved money.
    expect(Number(wallet.lockedBalance)).toBe(Number(accepted._sum.amount ?? 0));
    expect(Number(wallet.balance)).toBe(10_000_000 - Number(accepted._sum.amount ?? 0));
    expect(Number(wallet.balance)).toBeGreaterThanOrEqual(0);
  });
});
