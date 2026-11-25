import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Prisma, ReservationStatus } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Caller holds the order row lock; RELEASED reservations cannot be restocked twice. */
  async restoreCommitted(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
  ): Promise<void> {
    const reservations = await tx.inventoryReservation.findMany({
      where: { referenceId: orderId, status: ReservationStatus.COMMITTED },
    });
    for (const reservation of reservations) {
      const updated = await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          totalQty: { increment: reservation.quantity },
          availableQty: { increment: reservation.quantity },
        },
      });
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.RELEASED },
      });
      await tx.inventoryLedger.create({
        data: {
          inventoryId: reservation.inventoryId,
          changeQty: reservation.quantity,
          balanceAfter: updated.availableQty,
          reason,
          referenceId: orderId,
        },
      });
    }
  }

  /**
   * Ensures the existence of the default platform warehouse entity.
   *
   * @param tx - Optional transaction client
   * @returns Default Warehouse entity
   */
  async ensureDefaultWarehouse(tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.warehouse.upsert({
      where: { code: 'WH_001' },
      update: {},
      create: {
        code: 'WH_001',
        name: 'Sổ tồn kho mặc định NEXUS',
        address: 'Kho logic; địa điểm lấy hàng thực tế theo pickup point của từng Seller',
      },
    });
  }

  /**
   * Initializes product stock records and logs the initial balance ledger entry.
   *
   * @param tx - Active transaction client
   * @param warehouseId - Target warehouse identifier
   * @param productId - Target product identifier
   * @param quantity - Initial stock quantity
   * @returns Created Inventory entity
   */
  async createInitialStock(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    productId: string,
    quantity: number,
  ) {
    const inventory = await tx.inventory.create({
      data: {
        warehouseId,
        productId,
        totalQty: quantity,
        availableQty: quantity,
        reservedQty: 0,
      },
    });

    await tx.inventoryLedger.create({
      data: {
        inventoryId: inventory.id,
        changeQty: quantity,
        balanceAfter: quantity,
        reason: 'INITIAL_STOCK',
      },
    });

    return inventory;
  }

  /**
   * Adjusts inventory stock levels when a seller updates product specifications.
   *
   * @param tx - Active transaction client
   * @param productId - Target product identifier
   * @param existingInventories - Existing inventory records
   * @param newQuantity - Updated stock quantity
   */
  async updateProductStock(
    tx: Prisma.TransactionClient,
    productId: string,
    existingInventories: Array<{ id: string; totalQty: number; availableQty: number }>,
    newQuantity: number,
  ) {
    let inv = existingInventories[0];

    if (!inv) {
      const warehouse = await this.ensureDefaultWarehouse(tx);
      inv = await tx.inventory.create({
        data: {
          warehouseId: warehouse.id,
          productId,
          totalQty: newQuantity,
          availableQty: newQuantity,
          reservedQty: 0,
        },
      });

      await tx.inventoryLedger.create({
        data: {
          inventoryId: inv.id,
          changeQty: newQuantity,
          balanceAfter: newQuantity,
          reason: 'SELLER_RESTOCK',
        },
      });
    } else {
      const diff = newQuantity - inv.totalQty;

      // Applied as a delta, not as a value computed from a row read earlier: a
      // checkout that reserves stock between that read and this write would
      // otherwise have its reservation silently overwritten. A reduction is
      // conditional on enough stock being free, so it can never drive the row
      // negative and take back units a buyer already holds.
      const adjusted = await tx.inventory.updateMany({
        where: diff < 0 ? { id: inv.id, availableQty: { gte: -diff } } : { id: inv.id },
        data: {
          totalQty: newQuantity,
          availableQty: { increment: diff },
        },
      });

      if (adjusted.count !== 1) {
        throw new BadRequestException(
          `Không thể giảm tồn kho xuống ${newQuantity}: số lượng chênh lệch đang được giữ cho đơn hàng chưa hoàn tất.`,
        );
      }

      await tx.inventoryLedger.create({
        data: {
          inventoryId: inv.id,
          changeQty: diff,
          balanceAfter: newQuantity,
          reason: diff >= 0 ? 'SELLER_RESTOCK' : 'SELLER_ADJUSTMENT',
        },
      });
    }
  }

  /**
   * Sums available quantity across inventory locations.
   *
   * @param inventories - Array of inventory records
   * @returns Total available units
   */
  calculateAvailable(inventories: Array<{ availableQty: number }>): number {
    return inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
  }

  /**
   * Sums total physical quantity across inventory locations.
   *
   * @param inventories - Array of inventory records
   * @returns Total physical units
   */
  calculateTotal(inventories: Array<{ totalQty: number }>): number {
    return inventories.reduce((acc, curr) => acc + curr.totalQty, 0);
  }

  /**
   * Reserves stock for checkout, locking available items and recording inventory reservation.
   *
   * @param tx - Active transaction client
   * @param productId - Target product identifier
   * @param quantity - Quantity to reserve
   * @param orderId - Associated order identifier
   * @returns Updated Inventory entity
   * @throws BadRequestException when order quantity is invalid or available stock is insufficient
   */
  async reserveStock(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number,
    orderId: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Số lượng đặt hàng phải lớn hơn 0');
    }

    let inventory = await tx.inventory.findFirst({
      where: { productId },
    });

    if (!inventory) {
      const warehouse = await this.ensureDefaultWarehouse(tx);
      inventory = await tx.inventory.create({
        data: {
          warehouseId: warehouse.id,
          productId,
          totalQty: 0,
          availableQty: 0,
          reservedQty: 0,
        },
      });
    }

    // The stock check and the decrement are one statement on purpose. Reading
    // availableQty into JavaScript, comparing it there and then decrementing in
    // a second statement let two concurrent checkouts both pass a check for the
    // last item and both take it, leaving the row negative. PostgreSQL applies
    // the predicate under the row lock the UPDATE takes, so exactly one of them
    // can win and the loser sees count 0.
    const claimed = await tx.inventory.updateMany({
      where: { id: inventory.id, availableQty: { gte: quantity } },
      data: {
        availableQty: { decrement: quantity },
        reservedQty: { increment: quantity },
      },
    });

    if (claimed.count !== 1) {
      // Re-read only to report how much is actually left; the claim already failed.
      const current = await tx.inventory.findUnique({
        where: { id: inventory.id },
        select: { availableQty: true },
      });
      throw new BadRequestException(
        `Số lượng tồn kho không đủ (còn ${current?.availableQty ?? 0}, yêu cầu ${quantity})`,
      );
    }

    const updated = await tx.inventory.findUniqueOrThrow({ where: { id: inventory.id } });

    await tx.inventoryReservation.create({
      data: {
        inventoryId: inventory.id,
        quantity,
        referenceId: orderId,
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await tx.inventoryLedger.create({
      data: {
        inventoryId: inventory.id,
        changeQty: -quantity,
        balanceAfter: updated.availableQty,
        reason: 'ORDER_CHECKOUT',
        referenceId: orderId,
      },
    });

    return updated;
  }

  /**
   * Commits inventory reservations upon payment confirmation, deducting physical stock.
   *
   * @param tx - Active transaction client
   * @param orderId - Associated order identifier
   */
  async commitReservation(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { referenceId: orderId, status: ReservationStatus.PENDING },
    });

    for (const res of reservations) {
      const updated = await tx.inventory.update({
        where: { id: res.inventoryId },
        data: {
          totalQty: { decrement: res.quantity },
          reservedQty: { decrement: res.quantity },
        },
      });

      await tx.inventoryReservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.COMMITTED },
      });

      await tx.inventoryLedger.create({
        data: {
          inventoryId: res.inventoryId,
          changeQty: 0,
          balanceAfter: updated.availableQty,
          reason: 'ORDER_PAID',
          referenceId: orderId,
        },
      });
    }
  }

  /**
   * Hoàn trả tồn kho khi đơn hàng bị hủy hoặc thanh toán thất bại
   * Tăng availableQty, giảm reservedQty, chuyển trạng thái đặt chỗ sang RELEASED
   */
  async releaseReservation(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.inventoryReservation.findMany({
      where: { referenceId: orderId, status: ReservationStatus.PENDING },
    });

    for (const res of reservations) {
      const updated = await tx.inventory.update({
        where: { id: res.inventoryId },
        data: {
          availableQty: { increment: res.quantity },
          reservedQty: { decrement: res.quantity },
        },
      });

      await tx.inventoryReservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.RELEASED },
      });

      await tx.inventoryLedger.create({
        data: {
          inventoryId: res.inventoryId,
          changeQty: res.quantity,
          balanceAfter: updated.availableQty,
          reason: 'ORDER_CANCELLED',
          referenceId: orderId,
        },
      });
    }
  }
}
