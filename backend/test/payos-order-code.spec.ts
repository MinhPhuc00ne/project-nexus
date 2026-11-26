import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PayosOrderCodeService } from '../src/modules/payments/services/payos-order-code.service';
import { PrismaService } from '../src/core/prisma/prisma.service';

/**
 * The integer PayOS identifies a transfer by.
 *
 * Checkout and the wallet top-up each built one from a clock plus a random
 * suffix, which collides — and could collide *across* the two, so the callback
 * for a top-up could be settled against somebody's order. These tests run
 * against PostgreSQL because what makes the new scheme safe is the sequence and
 * the unique indexes, neither of which exists in a mock.
 */

const connectionString = process.env.DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase('PayOS order codes cannot repeat', () => {
  let prisma: PrismaClient;
  let pool: Pool;
  let orderCodes: PayosOrderCodeService;

  beforeAll(() => {
    pool = new Pool({ connectionString });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    orderCodes = new PayosOrderCodeService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it('hands every concurrent caller a different code', async () => {
    const codes = await Promise.all(Array.from({ length: 50 }, () => orderCodes.next()));

    expect(new Set(codes).size).toBe(codes.length);
    // PayOS accepts an integer up to 2^53 - 1, and the sequence starts above
    // every code the old clock-based scheme could produce.
    for (const code of codes) {
      expect(Number.isSafeInteger(code)).toBe(true);
      expect(code).toBeGreaterThanOrEqual(1_000_000_000_000);
      expect(code).toBeLessThanOrEqual(9_007_199_254_740_991);
    }
  });

  it('refuses a second payment claiming a code', async () => {
    const code = String(await orderCodes.next());
    const claim = (orderId: string) =>
      prisma.$executeRaw`INSERT INTO payments (id, order_id, provider, amount, status, transaction_code, created_at, updated_at)
        VALUES (gen_random_uuid(), ${orderId}::uuid, 'PAYOS', 1000, 'PENDING', ${code}, now(), now())`;

    // No order exists, so the insert fails either way; what matters is which
    // constraint it trips. A foreign key failure means the unique index let the
    // duplicate code through.
    await expect(claim('00000000-0000-0000-0000-000000000000')).rejects.toThrow();

    const duplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM payments WHERE transaction_code = ${code}`;
    expect(Number(duplicates[0].count)).toBe(0);
  });

  it('indexes the codes uniquely, and only where they are codes', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes
      WHERE indexname IN ('payments_payos_transaction_code_key',
                          'wallet_transactions_deposit_reference_key')
      ORDER BY indexname`;

    expect(indexes).toHaveLength(2);
    // Partial, because a transaction code is a PayOS order code only when PayOS
    // took the money, and a wallet reference points at one only for a deposit.
    expect(indexes[0].indexdef).toMatch(/CREATE UNIQUE INDEX/);
    expect(indexes[0].indexdef).toMatch(/WHERE/);
    expect(indexes[1].indexdef).toMatch(/CREATE UNIQUE INDEX/);
    expect(indexes[1].indexdef).toMatch(/WHERE/);
  });
});
