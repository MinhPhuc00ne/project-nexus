import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { WebhookData } from '@payos/node';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { PayOrderDto } from '../dtos/pay-order.dto';
import { OrderEscrowService } from './order-escrow.service';
import { PayosService } from '../../payments/services/payos.service';
import { RefundService } from '../../after-sales/services/refund.service';

export interface PayosPaymentResponse {
  orderId: string;
  orderCode: number;
  paymentId: string;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  amount: Prisma.Decimal | number;
  description: string;
}

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

@Injectable()
export class OrderPaymentHelper {
  private readonly logger = new Logger('OrderService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly configService: ConfigService,
    private readonly escrow: OrderEscrowService,
    private readonly inventoryService?: InventoryService,
    private readonly refunds?: RefundService,
    private readonly treasury?: TreasuryService,
    private readonly trendingService?: ProductTrendingService,
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
   * Khởi tạo giao dịch thanh toán cho đơn hàng (Hỗ trợ PayOS VietQR, Ví NEXUS Pay và COD).
   */
  async initializePayment(
    orderId: string,
    buyerId: string,
    dto?: PayOrderDto,
  ): Promise<
    | PayosPaymentResponse
    | WalletPaymentResponse
    | { orderId: string; success: boolean; message: string; provider: PaymentProvider }
  > {
    const provider = dto?.provider || PaymentProvider.PAYOS;

    // 1. Nếu chọn thanh toán bằng VÍ (WALLET)
    if (provider === PaymentProvider.WALLET) {
      return this.payOrderByWallet(orderId, buyerId);
    }

    // 2. Nếu chọn thanh toán khi nhận hàng (COD)
    if (provider === PaymentProvider.COD) {
      return this.registerCodPayment(orderId, buyerId);
    }

    // 3. Nếu chọn cổng thanh toán khác ngoài PAYOS
    if (provider !== PaymentProvider.PAYOS) {
      throw new BadRequestException(`Cổng thanh toán ${provider} hiện chưa được kích hoạt`);
    }

    // 3. Xử lý cổng PayOS VietQR
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        buyer: true,
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

    // PayOS yêu cầu orderCode là số nguyên (integer) duy nhất (tối đa 9007199254740991)
    const timestampSuffix = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const orderCode = Number(`${timestampSuffix}${randomSuffix}`);

    const amount = Math.round(Number(order.totalAmount));
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');
    }

    const description = `Nexus DH${orderCode}`.slice(0, 25);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const returnUrl =
      dto?.returnUrl || `${frontendUrl}/payment/success?orderId=${order.id}&orderCode=${orderCode}`;
    const cancelUrl =
      dto?.cancelUrl || `${frontendUrl}/payment/cancel?orderId=${order.id}&orderCode=${orderCode}`;

    // Chuẩn bị danh sách sản phẩm hiển thị trên PayOS checkout
    const items = order.items.map((item) => ({
      name: (item.product?.title ?? item.titleSnapshot ?? 'Sản phẩm đấu giá').slice(0, 50),
      quantity: item.quantity,
      price: Math.round(Number(item.unitPrice)),
    }));

    const addressSnapshot = (
      order.shippingAddressSnapshot && typeof order.shippingAddressSnapshot === 'object'
        ? order.shippingAddressSnapshot
        : {}
    ) as Record<string, string>;

    // Gọi SDK PayOS để tạo link thanh toán
    const paymentLink = await this.payosService.createPaymentLink({
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items,
      buyerName: addressSnapshot?.recipientName || order.buyer?.fullName || undefined,
      buyerEmail: order.buyer?.email || undefined,
      buyerPhone: addressSnapshot?.phone || order.buyer?.phoneNumber || undefined,
      buyerAddress: addressSnapshot?.street
        ? `${addressSnapshot.street}, ${addressSnapshot.city || ''}`
        : undefined,
    });

    // Lưu bản ghi Payment ở trạng thái PENDING
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.PAYOS,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
        transactionCode: String(orderCode),
        metadata: {
          orderCode,
          paymentLinkId: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
          accountNumber: paymentLink.accountNumber,
          accountName: paymentLink.accountName,
          bin: paymentLink.bin,
        },
      },
    });

    return {
      orderId: order.id,
      orderCode,
      paymentId: payment.id,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      amount: order.totalAmount,
      description,
    };
  }

  /**
   * Xử lý thanh toán đơn hàng bằng số dư ví cá nhân (NEXUS Pay Wallet)
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

    // Thực thi toàn bộ trong transaction an toàn
    const settlementResult = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
      const payable = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (payable.status !== OrderStatus.PENDING_PAYMENT)
        throw new BadRequestException('Đơn hàng đã được thanh toán hoặc không còn chờ thanh toán.');
      // 1. Kiểm tra ví người mua (tạo mới nếu chưa có)
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

      const currentBalance = Number(buyerWallet.balance);
      if (currentBalance < orderAmount) {
        throw new BadRequestException(
          `Số dư ví NEXUS Pay không đủ để thanh toán. Số dư hiện tại: ${currentBalance.toLocaleString('vi-VN')} VND, Cần thanh toán: ${orderAmount.toLocaleString('vi-VN')} VND. Vui lòng nạp thêm tiền vào ví hoặc chọn phương thức chuyển khoản VietQR.`,
        );
      }

      // 2. Trừ tiền ví người mua
      const debited = await tx.wallet.updateMany({
        where: { id: buyerWallet.id, balance: { gte: order.totalAmount } },
        data: { balance: { decrement: order.totalAmount } },
      });
      if (debited.count !== 1) throw new BadRequestException('Số dư ví không đủ để thanh toán.');
      const updatedBuyerWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: buyerWallet.id },
      });

      // 3. Ghi lịch sử giao dịch cho người mua (ORDER_PAYMENT)
      const buyerTx = await tx.walletTransaction.create({
        data: {
          walletId: buyerWallet.id,
          amount: order.totalAmount,
          type: WalletTransactionType.ORDER_PAYMENT,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: order.id,
          description: `Thanh toán đơn hàng #${order.id.slice(0, 8).toUpperCase()}`,
        },
      });

      // 4. Lưu bản ghi Payment
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.WALLET,
          amount: order.totalAmount,
          status: PaymentStatus.SUCCESS,
          transactionCode: `WAL-${Date.now()}-${order.id.slice(0, 8).toUpperCase()}`,
          metadata: {
            paidByWallet: true,
            buyerWalletId: buyerWallet.id,
            buyerTransactionId: buyerTx.id,
            paidAt: new Date().toISOString(),
          },
        },
      });

      // 5. Cập nhật trạng thái đơn hàng sang PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
        include: {
          buyer: true,
          seller: true,
        },
      });

      // 6. Trừ kho vĩnh viễn khi thanh toán thành công
      if (this.inventoryService) {
        await this.inventoryService.commitReservation(tx, order.id);
      }

      // Keep funds in escrow until verified delivery and buyer confirmation.
      const settlement = await this.escrow.hold(tx, updatedOrder);

      // 7. Gửi thông báo cho người mua và người bán
      await tx.notification.create({
        data: {
          userId: buyerId,
          title: 'Thanh toán đơn hàng thành công ✅',
          content: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()} trị giá ${orderAmount.toLocaleString('vi-VN')} VND đã được thanh toán thành công bằng ví NEXUS Pay. Số dư còn lại: ${Number(updatedBuyerWallet.balance).toLocaleString('vi-VN')} VND.`,
          type: NotificationType.ORDER,
          channel: NotificationChannel.IN_APP,
        },
      });

      await tx.notification.create({
        data: {
          userId: order.sellerId,
          title: 'Đơn hàng mới đã được thanh toán 🛒',
          content: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()} đã được thanh toán thành công và chuyển sang trạng thái chuẩn bị. Vui lòng đóng gói và bàn giao cho đơn vị vận chuyển GHN.`,
          type: NotificationType.ORDER,
          channel: NotificationChannel.IN_APP,
        },
      });

      return {
        updatedOrder,
        buyerTx,
        currentBalance,
        updatedBuyerWallet,
        settlement,
      };
    });

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
   * Registers cash on delivery (COD) payment for an order.
   *
   * @param orderId Target order identifier
   * @param buyerId Buyer account identifier verifying ownership
   * @returns Payment registration confirmation
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
          orderId: order.id,
          provider: PaymentProvider.COD,
          amount: order.totalAmount,
          status: PaymentStatus.PENDING,
          metadata: { note: 'Thanh toán tiền mặt khi nhận hàng (COD)' },
        },
      });
    }

    return {
      orderId: order.id,
      success: true,
      message: 'Phương thức thanh toán COD đã được ghi nhận thành công.',
      provider: PaymentProvider.COD,
    };
  }

  /**
   * Settles a verified PayOS callback against an order.
   *
   * The callback is the same one PayOS sends for a wallet top-up, and the two
   * are told apart only by which record carries the orderCode. Returning null
   * rather than throwing says "this is not mine", so the caller can offer it to
   * the wallet instead; verification happens once, before either is asked.
   *
   * @param webhookData - The already-verified callback payload.
   * @returns The settlement, or null when no order payment carries this orderCode.
   */
  async settleOrderPayment(webhookData: WebhookData): Promise<PayosSettlement | null> {
    const { orderCode, code } = webhookData;

    this.logger.log(`Nhận Webhook PayOS cho orderCode=${orderCode}, status code=${code}`);

    // code === '00' biểu thị thanh toán thành công
    if (code === '00') {
      const payment = await this.prisma.payment.findFirst({
        where: {
          transactionCode: String(orderCode),
          provider: PaymentProvider.PAYOS,
        },
      });

      if (!payment) {
        // No payment carries this orderCode, so the transfer is not for an order.
        // A wallet top-up uses the same callback, and the caller tries that next.
        return null;
      }

      // Idempotency: Nếu đã SUCCESS rồi thì không xử lý lại
      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(`Giao dịch PayOS orderCode=${orderCode} đã được xử lý trước đó`);
        return { success: true, message: 'Already processed' };
      }

      // Record successful payment and hold funds in escrow.
      const currentMetadata = (
        payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
      ) as Record<string, unknown>;

      if (Number(webhookData.amount) !== Number(payment.amount))
        throw new BadRequestException('Số tiền PayOS không khớp đơn hàng.');
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${payment.orderId} FOR UPDATE`;
        const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
        if (currentPayment.status === PaymentStatus.SUCCESS) return;
        const payable = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        if (payable.status === OrderStatus.CANCELLED && this.refunds && this.treasury) {
          // A verified transfer arriving after cancellation is still money owed to the buyer.
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              metadata: {
                ...currentMetadata,
                webhookData,
                paidAfterCancellation: true,
              } as Prisma.InputJsonValue,
            },
          });
          const admin = await this.treasury.getOrCreatePrimaryAdminWallet(tx);
          await tx.wallet.update({
            where: { id: admin.id },
            data: { balance: { increment: currentPayment.amount } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: admin.id,
              amount: currentPayment.amount,
              type: 'ESCROW_LOCK',
              status: 'SUCCESS',
              referenceId: payment.id,
              description: 'Ghi nhận thanh toán đến sau khi hủy đơn',
            },
          });
          await this.refunds.reserve(tx, {
            orderId: payable.id,
            buyerId: payable.buyerId,
            paymentId: payment.id,
            amount: currentPayment.amount,
            adminWalletId: admin.id,
            toWallet: false,
          });
          return;
        }
        if (payable.status !== OrderStatus.PENDING_PAYMENT)
          throw new BadRequestException(
            'Đơn đã thanh toán hoặc bị hủy; cần đối soát khoản thanh toán này.',
          );
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            metadata: {
              ...currentMetadata,
              webhookData,
              paidAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
          },
          include: {
            buyer: true,
            seller: true,
          },
        });

        // Trừ kho vĩnh viễn khi PayOS thanh toán thành công
        if (this.inventoryService) {
          await this.inventoryService.commitReservation(tx, payment.orderId);
        }

        // Never disburse funds merely because the payment succeeded.
        await this.escrow.hold(tx, updatedOrder);

        if (tx.notification?.create) {
          await tx.notification.create({
            data: {
              userId: updatedOrder.buyerId,
              title: 'Thanh toán PayOS thành công ✅',
              content: `Đơn hàng #${updatedOrder.id.slice(0, 8).toUpperCase()} trị giá ${Number(payment.amount).toLocaleString('vi-VN')} VND đã được thanh toán thành công qua PayOS (VietQR). Tiền được giữ ký quỹ an toàn tại NEXUS Escrow.`,
              type: NotificationType.PAYMENT,
              channel: NotificationChannel.IN_APP,
            },
          });

          await tx.notification.create({
            data: {
              userId: updatedOrder.sellerId,
              title: 'Đơn hàng mới đã được thanh toán qua PayOS 🛒',
              content: `Đơn hàng #${updatedOrder.id.slice(0, 8).toUpperCase()} trị giá ${Number(payment.amount).toLocaleString('vi-VN')} VND đã được thanh toán qua VietQR. Vui lòng chuẩn bị và bàn giao cho đơn vị vận chuyển GHN.`,
              type: NotificationType.ORDER,
              channel: NotificationChannel.IN_APP,
            },
          });
        }
      });

      this.logger.log(`Đơn ${payment.orderId} đã thanh toán PayOS; tiền được giữ ký quỹ.`);
      void this.syncTrendingSafely();
    }

    return {
      success: true,
      orderCode,
    };
  }

  /**
   * Kiểm tra và tự động đồng bộ trạng thái thanh toán từ PayOS
   */
  async checkPayosPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng');
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return {
        paid: order.status !== OrderStatus.CANCELLED,
        status: order.status,
        message: 'Đơn hàng đã được thanh toán hoặc đang xử lý.',
      };
    }

    const payment = order.payments[0];
    if (!payment || payment.provider !== PaymentProvider.PAYOS || !payment.transactionCode) {
      return {
        paid: false,
        status: order.status,
      };
    }

    try {
      const orderCode = Number(payment.transactionCode);
      const payosInfo = await this.payosService.getPaymentLink(orderCode);

      if (
        payosInfo &&
        (payosInfo.status === 'PAID' || Number(payosInfo.amountPaid) >= Number(payment.amount))
      ) {
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
          const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
          if (currentPayment.status === PaymentStatus.SUCCESS) return;
          const payable = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
          if (payable.status !== OrderStatus.PENDING_PAYMENT) return;

          const currentMetadata = (
            payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
          ) as Record<string, unknown>;

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              metadata: {
                ...currentMetadata,
                payosStatus: payosInfo.status,
                verifiedDirectly: true,
                paidAt: new Date().toISOString(),
              } as Prisma.InputJsonValue,
            },
          });

          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
            },
            include: {
              buyer: true,
              seller: true,
            },
          });

          if (this.inventoryService) {
            await this.inventoryService.commitReservation(tx, order.id);
          }

          await this.escrow.hold(tx, updatedOrder);
        });

        this.logger.log(
          `Đồng bộ trực tiếp: Đơn ${order.id} đã thanh toán PayOS; tiền được giữ ký quỹ.`,
        );
        void this.syncTrendingSafely();

        return {
          paid: true,
          status: OrderStatus.PAID,
          message: 'Thanh toán thành công qua PayOS VietQR.',
        };
      }

      return {
        paid: false,
        status: order.status,
        payosStatus: payosInfo?.status,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Truy vấn trạng thái PayOS cho đơn ${order.id} thất bại: ${message}`);
      return {
        paid: false,
        status: order.status,
      };
    }
  }
}
