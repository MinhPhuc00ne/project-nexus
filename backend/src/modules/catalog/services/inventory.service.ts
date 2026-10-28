import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Prisma, ReservationStatus } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đảm bảo kho lưu trữ mặc định WH_001 tồn tại
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
   * Tạo số lượng tồn kho ban đầu khi Seller đăng bán sản phẩm mới
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
   * Cập nhật số lượng tồn kho khi Seller chỉnh sửa sản phẩm
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
      const newAvailable = Math.max(0, inv.availableQty + diff);

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          totalQty: newQuantity,
          availableQty: newAvailable,
        },
      });

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
   * Tính tổng lượng hàng khả dụng
   */
  calculateAvailable(inventories: Array<{ availableQty: number }>): number {
    return inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
  }

  /**
   * Tính tổng lượng tồn kho
   */
  calculateTotal(inventories: Array<{ totalQty: number }>): number {
    return inventories.reduce((acc, curr) => acc + curr.totalQty, 0);
  }

  /**
   * Khóa / Đặt chỗ tồn kho khi người mua đặt hàng (Order Checkout)
   * Giảm availableQty, tăng reservedQty, tạo bản ghi InventoryReservation và InventoryLedger
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

    // 1. Tìm bản ghi kho của sản phẩm
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

    if (inventory.availableQty < quantity) {
      throw new BadRequestException(
        `Số lượng tồn kho không đủ (còn ${inventory.availableQty}, yêu cầu ${quantity})`,
      );
    }

    // 2. Cập nhật tồn kho khả dụng và số lượng tạm khóa
    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        availableQty: { decrement: quantity },
        reservedQty: { increment: quantity },
      },
    });

    // 3. Tạo bản ghi giữ chỗ tồn kho (hạn giữ chỗ 30 phút theo SRS)
    await tx.inventoryReservation.create({
      data: {
        inventoryId: inventory.id,
        quantity,
        referenceId: orderId,
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // 4. Ghi sổ cái biến động kho
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
   * Xác nhận trừ kho vĩnh viễn khi đơn hàng thanh toán thành công (ORDER_PAID)
   * Giảm totalQty, giảm reservedQty, chuyển trạng thái đặt chỗ sang COMMITTED
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
