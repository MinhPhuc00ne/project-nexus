import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { trustLevelFor } from '../../users/services/reputation-policy';

/** Keeps auction stock reservations inside the catalog ownership boundary. */
@Injectable()
export class AuctionStockService {
  constructor(private readonly inventory: InventoryService) {}

  /**
   * Reserves exactly one fixed catalog item for a scheduled auction.
   * @param tx Caller transaction, which already holds the auction lock.
   * @param input Product and durable reference metadata.
   * @returns The authoritative catalog product.
   * @throws BadRequestException when the item is unavailable or requires unresolved variants.
   */
  async reserve(
    tx: Prisma.TransactionClient,
    input: { productId: string; referenceId: string; expiresAt: Date },
  ): Promise<Product> {
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${input.productId} FOR UPDATE`;
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      include: {
        options: true,
        seller: {
          select: { role: true, isShopSuspended: true, trustLevel: true, reputationScore: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm đấu giá.');
    if (
      product.status !== 'ACTIVE' ||
      product.seller.isShopSuspended ||
      product.seller.reputationScore < 50 ||
      ['PROBATION', 'SUSPENDED'].includes(product.seller.trustLevel) ||
      trustLevelFor(product.seller.reputationScore) === 'PROBATION' ||
      product.options.length
    )
      throw new BadRequestException(
        'Sản phẩm đấu giá phải đang bán, có người bán đủ uy tín và xác định sẵn một phiên bản.',
      );
    if (
      !(await tx.inventoryReservation.findFirst({
        where: { referenceId: input.referenceId, status: 'PENDING' },
      }))
    ) {
      await this.inventory.reserveStock(tx, product.id, 1, input.referenceId);
    }
    await tx.inventoryReservation.updateMany({
      where: { referenceId: input.referenceId, status: 'PENDING' },
      data: { expiresAt: input.expiresAt },
    });
    return product;
  }

  /**
   * Moves an auction's existing reservation to its generated order without reserving twice.
   * @param tx Caller transaction.
   * @param input Source reference, target order, product, and checkout deadline.
   * @returns Completion after exactly one unit is reserved for the order.
   */
  async award(
    tx: Prisma.TransactionClient,
    input: { referenceId: string; orderId: string; productId: string; expiresAt: Date },
  ): Promise<void> {
    const moved = await tx.inventoryReservation.updateMany({
      where: { referenceId: input.referenceId, status: 'PENDING' },
      data: { referenceId: input.orderId, expiresAt: input.expiresAt },
    });
    if (!moved.count)
      await this.reserve(tx, {
        productId: input.productId,
        referenceId: input.orderId,
        expiresAt: input.expiresAt,
      });
  }

  /** Commits paid auction stock. @param tx Caller transaction. @param orderId Paid order. @returns Completion. */
  async commit(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    await this.inventory.commitReservation(tx, orderId);
  }

  /** Releases an unallocated lot. @param tx Caller transaction. @param referenceId Reservation reference. @returns Completion. */
  async release(tx: Prisma.TransactionClient, referenceId: string): Promise<void> {
    await this.inventory.releaseReservation(tx, referenceId);
  }
}
