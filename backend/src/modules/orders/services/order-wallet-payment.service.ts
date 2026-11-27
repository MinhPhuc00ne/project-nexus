import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
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
 * Handles wallet balance payments (single and atomic multi-order) and COD
 * registration for retail orders.
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
      this.logger.warn(`Đồng bộ thông báo Xu hướng thất bại: ${message}`);
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
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.isAuction)
      throw new BadRequestException(
        'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
      );

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Đơn hàng hiện không ở trạng thái chờ thanh toán (Trạng thái hiện tại: ${order.status})`,
      );
    }

    const orderAmount = Number(order.totalAmount);
    if (orderAmount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');
    }

    const settlementResult = await this.prisma.$transaction((tx) =>
      this.debitWalletForOrder(tx, order.id, buyerId),
    );

    void this.syncTrendingSafely();

    return {
      success: true,
      message: 'Thanh toán đơn hàng bằng ví NEXUS Pay thành công!',
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
      throw new NotFoundException('Không tìm thấy đủ các đơn hàng cần thanh toán.');

    for (const order of orders) {
      if (order.buyerId !== buyerId)
        throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
      if (order.isAuction)
        throw new BadRequestException(
          'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
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
      message: 'Thanh toán đơn hàng bằng ví NEXUS Pay thành công!',
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

  /**
   * Registers cash on delivery (COD) payment for an order.
   */
  async registerCodPayment(
    orderId: string,
    buyerId: string,
  ): Promise<{ orderId: string; success: boolean; message: string; provider: PaymentProvider }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.isAuction)
      throw new BadRequestException(
        'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
      );

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Không thể ghi nhận thanh toán COD cho đơn hàng ở trạng thái '${order.status}'.`,
      );
    }

    const hasSuccessfulPayment = order.payments.some((p) => p.status === PaymentStatus.SUCCESS);
    if (hasSuccessfulPayment) {
      throw new BadRequestException('Đơn hàng đã được thanh toán thành công trước đó.');
    }

    const existingCod = order.payments.find((p) => p.provider === PaymentProvider.COD);
    if (!existingCod) {
      await this.prisma.payment.create({
        data: {
          orderId,
          provider: PaymentProvider.COD,
          amount: order.totalAmount,
          status: PaymentStatus.PENDING,
          metadata: { note: 'Thanh toán tiền mặt khi nhận hàng (COD)' },
        },
      });
    }

    return {
      orderId,
      success: true,
      message: 'Phương thức thanh toán COD đã được ghi nhận thành công.',
      provider: PaymentProvider.COD,
    };
  }

  private async debitWalletForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    buyerId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const payable = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (payable.buyerId !== buyerId)
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    if (payable.status !== OrderStatus.PENDING_PAYMENT)
      throw new BadRequestException('Đơn hàng đã được thanh toán hoặc không còn chờ thanh toán.');

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
      throw new BadRequestException(
        `Số dư ví NEXUS Pay không đủ để thanh toán. Số dư hiện tại: ${currentBalance.toLocaleString('vi-VN')} VND, Cần thanh toán: ${orderAmount.toLocaleString('vi-VN')} VND. Vui lòng nạp thêm tiền vào ví hoặc chọn phương thức chuyển khoản VietQR.`,
      );
    }

    const debited = await tx.wallet.updateMany({
      where: { id: buyerWallet.id, balance: { gte: payable.totalAmount } },
      data: { balance: { decrement: payable.totalAmount } },
    });
    if (debited.count !== 1) throw new BadRequestException('Số dư ví không đủ để thanh toán.');
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
        description: `Thanh toán đơn hàng #${orderId.slice(0, 8).toUpperCase()}`,
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
        title: 'Thanh toán đơn hàng thành công ✅',
        content: `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} trị giá ${orderAmount.toLocaleString('vi-VN')} VND đã được thanh toán thành công bằng ví NEXUS Pay. Số dư còn lại: ${Number(updatedBuyerWallet.balance).toLocaleString('vi-VN')} VND.`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
      this.notifications,
    );

    await publishNotification(
      tx,
      {
        userId: payable.sellerId,
        title: 'Đơn hàng mới đã được thanh toán 🛒',
        content: `Đơn hàng #${orderId.slice(0, 8).toUpperCase()} đã được thanh toán thành công và chuyển sang trạng thái chuẩn bị. Vui lòng đóng gói và bàn giao cho đơn vị vận chuyển GHN.`,
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
