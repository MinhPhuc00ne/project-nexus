import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
}
