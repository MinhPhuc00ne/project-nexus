import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { OrderEscrowService } from './order-escrow.service';

export interface WalletPaymentResponse {
  success: boolean;
  message: string;
  orderId: string;
  orderStatus: OrderStatus;
  provider: PaymentProvider;
  amount: Prisma.Decimal | number;
  wallet: {
    walletId: string;
    balanceBefore: number;
    balanceAfter: number;
    transactionId: string;
    platformFeeDeducted: number;
    sellerPayout: number;
    escrowStatus: string;
  };
}

/**
 * Handles wallet balance payments (single and atomic multi-order) for retail orders.
 */
@Injectable()
export class OrderWalletPaymentService {
  private readonly logger = new Logger('OrderService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: OrderEscrowService,
    private readonly inventoryService?: InventoryService,
    private readonly trendingService?: ProductTrendingService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  private async syncTrendingSafely(): Promise<void> {
    if (!this.trendingService) return;
    try {
      await this.trendingService.syncTopTrendingNotifications();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to sync trending notifications: ${message}`);
    }
  }

  /**
   * Pays for a single order using the buyer's NEXUS Pay wallet balance.
   */
  async payOrderByWallet(orderId: string, buyerId: string): Promise<WalletPaymentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: AppErrorCode.ORDER_NOT_FOUND,
      });
    }

    if (order.isAuction)
      throw new BadRequestException(
        'Auction orders must be paid through claim checkout to apply the deposit correctly.',
      );

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        message: 'You do not have permission to pay for this order',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        message: `Order is not awaiting payment (Current status: ${order.status})`,
        errorCode: AppErrorCode.ORDER_INVALID_STATE,
      });
    }

    const orderAmount = Number(order.totalAmount);
    if (orderAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0 VND');
    }

    const settlementResult = await this.prisma.$transaction((tx) =>
      this.debitWalletForOrder(tx, order.id, buyerId),
    );

    void this.syncTrendingSafely();

    return {
      success: true,
      message: 'Order paid successfully with NEXUS Pay wallet!',
      orderId: order.id,
      orderStatus: OrderStatus.PAID,
      provider: PaymentProvider.WALLET,
      amount: order.totalAmount,
      wallet: {
        walletId: settlementResult.updatedBuyerWallet.id,
        balanceBefore: Number(settlementResult.updatedBuyerWallet.balance) + orderAmount,
        balanceAfter: Number(settlementResult.updatedBuyerWallet.balance),
        transactionId: settlementResult.buyerTx.id,
        platformFeeDeducted: settlementResult.settlement.platformFee,
        sellerPayout: settlementResult.settlement.sellerPayout,
        escrowStatus: settlementResult.settlement.escrowStatus,
      },
    };
  }

  /**
   * Pays for several orders out of the buyer's wallet atomically.
   */
  async payOrdersByWallet(orderIds: string[], buyerId: string): Promise<WalletPaymentResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length !== orderIds.length)
      throw new NotFoundException('Could not find all orders to pay for.');

    for (const order of orders) {
      if (order.buyerId !== buyerId)
        throw new ForbiddenException({
          message: 'You do not have permission to pay for this order',
          errorCode: AppErrorCode.FORBIDDEN,
        });
      if (order.isAuction)
        throw new BadRequestException(
          'Auction orders must be paid through claim checkout to apply the deposit correctly.',
        );
    }

    const settlements = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const order of orders) {
        results.push({
          orderId: order.id,
          settlement: await this.debitWalletForOrder(tx, order.id, buyerId),
        });
      }
      return results;
    });

    void this.syncTrendingSafely();

    return settlements.map(({ orderId, settlement }) => ({
      success: true,
      message: 'Order paid successfully with NEXUS Pay wallet!',
      orderId,
      orderStatus: OrderStatus.PAID,
      provider: PaymentProvider.WALLET,
      amount: settlement.updatedOrder.totalAmount,
      wallet: {
        walletId: settlement.updatedBuyerWallet.id,
        balanceBefore: settlement.currentBalance,
        balanceAfter: Number(settlement.updatedBuyerWallet.balance),
        transactionId: settlement.buyerTx.id,
        platformFeeDeducted: settlement.settlement.platformFee,
        sellerPayout: settlement.settlement.sellerPayout,
        escrowStatus: settlement.settlement.escrowStatus,
      },
    }));
  }

  private async debitWalletForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    buyerId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const payable = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (payable.buyerId !== buyerId)
      throw new ForbiddenException({
        message: 'You do not have permission to pay for this order',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    if (payable.status !== OrderStatus.PENDING_PAYMENT)
      throw new BadRequestException(
        'Order has already been paid or is no longer awaiting payment.',
      );

    let buyerWallet = await tx.wallet.findUnique({
      where: { userId: buyerId },
    });

    if (!buyerWallet) {
      buyerWallet = await tx.wallet.create({
        data: {
          userId: buyerId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
    }

    const orderAmount = Number(payable.totalAmount);
    const currentBalance = Number(buyerWallet.balance);
    if (currentBalance < orderAmount) {
      throw new BadRequestException({
        message: `Insufficient NEXUS Pay wallet balance. Available balance: ${currentBalance.toLocaleString('vi-VN')} VND, Required payment: ${orderAmount.toLocaleString('vi-VN')} VND. Please top up your wallet or select VietQR bank transfer.`,
        errorCode: AppErrorCode.INSUFFICIENT_BALANCE,
      });
    }

    const debited = await tx.wallet.updateMany({
      where: { id: buyerWallet.id, balance: { gte: payable.totalAmount } },
      data: { balance: { decrement: payable.totalAmount } },
    });
    if (debited.count !== 1)
      throw new BadRequestException({
        message: 'Insufficient wallet balance for payment.',
        errorCode: AppErrorCode.INSUFFICIENT_BALANCE,
      });
    const updatedBuyerWallet = await tx.wallet.findUniqueOrThrow({
      where: { id: buyerWallet.id },
    });

    const buyerTx = await tx.walletTransaction.create({
      data: {
        walletId: buyerWallet.id,
        amount: payable.totalAmount,
        type: WalletTransactionType.ORDER_PAYMENT,
        status: WalletTransactionStatus.SUCCESS,
        referenceId: orderId,
        description: `Payment for order #${orderId.slice(0, 8).toUpperCase()}`,
      },
    });

    await tx.payment.create({
      data: {
        orderId,
        provider: PaymentProvider.WALLET,
        amount: payable.totalAmount,
        status: PaymentStatus.SUCCESS,
        transactionCode: `WAL-${Date.now()}-${orderId.slice(0, 8).toUpperCase()}`,
        metadata: {
          paidByWallet: true,
          buyerWalletId: buyerWallet.id,
          buyerTransactionId: buyerTx.id,
          paidAt: new Date().toISOString(),
        },
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (this.inventoryService) {
      await this.inventoryService.commitReservation(tx, orderId);
    }

    const settlement = await this.escrow.hold(tx, updatedOrder);

    await publishNotification(
      tx,
      {
        userId: buyerId,
        title: 'Order payment successful ✅',
        content: `Order #${orderId.slice(0, 8).toUpperCase()} totaling ${orderAmount.toLocaleString('vi-VN')} VND was paid via NEXUS Pay wallet. Remaining balance: ${Number(updatedBuyerWallet.balance).toLocaleString('vi-VN')} VND.`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
      this.notifications,
    );

    await publishNotification(
      tx,
      {
        userId: payable.sellerId,
        title: 'New order paid 🛒',
        content: `Order #${orderId.slice(0, 8).toUpperCase()} has been paid and moved to preparing status. Please pack and hand it over to GHN.`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
      this.notifications,
    );

    return {
      updatedOrder,
      buyerTx,
      currentBalance,
      updatedBuyerWallet,
      settlement,
    };
  }
}
