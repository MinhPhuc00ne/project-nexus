import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InventoryService } from '../src/modules/catalog/services/inventory.service';

/**
 * Two buyers checking out the last item at the same time.
 *
 * `reserveStock` used to read `availableQty`, compare it in JavaScript, and
 * decrement in a separate statement, so both callers passed the check and both
 * took the item. The row went negative and the seller owed stock they did not
 * have. These tests run real concurrent transactions against PostgreSQL,
 * because an in-memory mock cannot reproduce a lost update.
 */

const connectionString = process.env.DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase('inventory stock is claimed atomically', () => {
  let prisma: PrismaClient;
  let pool: Pool;
  let inventoryService: InventoryService;

  let warehouseId: string;
  let sellerId: string;
  let categoryId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    inventoryService = new InventoryService(prisma as never);

    const suffix = randomUUID().slice(0, 8);
    const seller = await prisma.user.create({
      data: {
        email: `stock-${suffix}@example.invalid`,
        passwordHash: 'fixture',
        fullName: 'Stock fixture seller',
        role: 'SELLER',
      },
      select: { id: true },
    });
    sellerId = seller.id;

    const category = await prisma.category.create({
      data: { name: `Stock fixture ${suffix}`, slug: `stock-fixture-${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;

    const warehouse = await prisma.warehouse.create({
      data: { code: `WH_TEST_${suffix}`, name: 'Stock fixture warehouse' },
      select: { id: true },
    });
    warehouseId = warehouse.id;
  });

  afterAll(async () => {
    // Children first: products hold inventories, inventories hold ledgers.
    await prisma.inventoryLedger.deleteMany({ where: { inventory: { warehouseId } } });
    await prisma.inventoryReservation.deleteMany({ where: { inventory: { warehouseId } } });
    await prisma.inventory.deleteMany({ where: { warehouseId } });
    await prisma.product.deleteMany({ where: { sellerId } });
    await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: sellerId } });
    await prisma.$disconnect();
    await pool.end();
  });

  /** Creates a product stocked with exactly `quantity` units. */
  async function stockedProduct(quantity: number): Promise<string> {
    const product = await prisma.product.create({
      data: {
        sellerId,
        categoryId,
        title: `Stock fixture ${randomUUID().slice(0, 8)}`,
        description: 'Fixture',
        basePrice: 100_000,
      },
      select: { id: true },
    });
    await prisma.inventory.create({
      data: {
        warehouseId,
        productId: product.id,
        totalQty: quantity,
        availableQty: quantity,
        reservedQty: 0,
      },
    });
    return product.id;
  }

  it('lets exactly one of two concurrent checkouts take the last unit', async () => {
    const productId = await stockedProduct(1);

    // Both transactions start before either commits, which is what makes this a
    // race rather than two sequential reservations.
    const attempts = await Promise.allSettled([
      prisma.$transaction((tx) =>
        inventoryService.reserveStock(tx, productId, 1, `order-a-${randomUUID()}`),
      ),
      prisma.$transaction((tx) =>
        inventoryService.reserveStock(tx, productId, 1, `order-b-${randomUUID()}`),
      ),
    ]);

    const succeeded = attempts.filter((attempt) => attempt.status === 'fulfilled');
    const failed = attempts.filter((attempt) => attempt.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inventory.availableQty).toBe(0);
    expect(inventory.reservedQty).toBe(1);
  });

  it('never drives available stock negative under heavier contention', async () => {
    const productId = await stockedProduct(3);

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        prisma.$transaction((tx) =>
          inventoryService.reserveStock(tx, productId, 1, `order-${index}-${randomUUID()}`),
        ),
      ),
    );

    const succeeded = attempts.filter((attempt) => attempt.status === 'fulfilled').length;
    expect(succeeded).toBe(3);

    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(inventory.availableQty).toBe(0);
    expect(inventory.reservedQty).toBe(3);
    expect(inventory.availableQty).toBeGreaterThanOrEqual(0);
  });

  it('refuses to reduce stock below what buyers already hold', async () => {
    const productId = await stockedProduct(5);
    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId } });

    await prisma.$transaction((tx) =>
      inventoryService.reserveStock(tx, productId, 4, `order-${randomUUID()}`),
    );

    // One unit is free and four are reserved, so dropping the total to 2 would
    // have to take back a unit a buyer is holding.
    await expect(
      prisma.$transaction((tx) =>
        inventoryService.updateProductStock(
          tx,
          productId,
          [{ id: inventory.id, totalQty: 5, availableQty: 1 }],
          2,
        ),
      ),
    ).rejects.toThrow(/tồn kho/);

    const after = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(after.availableQty).toBe(1);
    expect(after.reservedQty).toBe(4);
  });

  it('applies a restock as a delta so a concurrent reservation is not overwritten', async () => {
    const productId = await stockedProduct(2);
    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId } });

    // The seller's view of the row is taken here, before the buyer reserves.
    const staleView = [
      { id: inventory.id, totalQty: inventory.totalQty, availableQty: inventory.availableQty },
    ];

    await prisma.$transaction((tx) =>
      inventoryService.reserveStock(tx, productId, 1, `order-${randomUUID()}`),
    );

    await prisma.$transaction((tx) =>
      inventoryService.updateProductStock(tx, productId, staleView, 10),
    );

    const after = await prisma.inventory.findFirstOrThrow({ where: { productId } });
    expect(after.totalQty).toBe(10);
    // 1 free + 8 added. Writing a value computed from the stale view would have
    // produced 10 and quietly released the buyer's reserved unit.
    expect(after.availableQty).toBe(9);
    expect(after.reservedQty).toBe(1);
  });
});
