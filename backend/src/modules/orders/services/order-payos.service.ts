import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { WebhookData } from '@payos/node';
import { NotificationPublisher } from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RefundService } from '../../after-sales/services/refund.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { PayosOrderCodeService } from '../../payments/services/payos-order-code.service';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PayosService } from '../../payments/services/payos.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { PayOrderInput } from '../dtos/pay-order.dto';
import { OrderEscrowService } from './order-escrow.service';
import { OrderPayosSettlementService } from './order-payos-settlement.service';

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

export interface PayosGroupPaymentResponse {
  orderIds: string[];
  paymentGroupId: string;
  orderCode: number;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  amount: number;
  description: string;
}

/**
 * Handles PayOS VietQR payment initialization, group payments, webhook settlement,
 * and direct payment-status synchronization for retail orders.
 */
@Injectable()
export class OrderPayosService {
  private readonly logger = new Logger('OrderService');
  private readonly fallbackSettlement: OrderPayosSettlementService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly orderCodes: PayosOrderCodeService,
    private readonly configService: ConfigService,
    private readonly escrow: OrderEscrowService,
    private readonly inventoryService?: InventoryService,
    refunds?: RefundService,
    treasury?: TreasuryService,
    private readonly trendingService?: ProductTrendingService,
    @Optional() notifications?: NotificationPublisher,
    @Optional() private readonly settlementService?: OrderPayosSettlementService,
  ) {
    this.fallbackSettlement =
      settlementService ??
      new OrderPayosSettlementService(
        prisma,
        escrow,
        inventoryService,
        refunds,
        treasury,
        trendingService,
        notifications,
      );
  }

  private get settlement(): OrderPayosSettlementService {
    return this.settlementService ?? this.fallbackSettlement;
  }

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
   * Initializes a PayOS VietQR payment link for a single order.
   */
  async initializePayosPayment(
    orderId: string,
    buyerId: string,
    dto?: PayOrderInput,
  ): Promise<PayosPaymentResponse> {
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

    // PayOS requires an integer nobody has used before. A clock plus a random
    // suffix cannot promise that; a sequence can.
    const orderCode = await this.orderCodes.next();

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
   * Creates one PayOS link covering several orders.
   */
  async initializeGroupPayment(
    orderIds: string[],
    buyerId: string,
    dto?: PayOrderInput,
  ): Promise<PayosGroupPaymentResponse> {
    if (orderIds.length < 2)
      throw new BadRequestException('Nhóm thanh toán cần ít nhất hai đơn hàng.');

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        buyer: true,
        items: { include: { product: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length !== orderIds.length)
      throw new NotFoundException('Không tìm thấy đủ các đơn hàng của nhóm thanh toán.');

    for (const order of orders) {
      if (order.buyerId !== buyerId)
        throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
      if (order.isAuction)
        throw new BadRequestException(
          'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
        );
      if (order.status !== OrderStatus.PENDING_PAYMENT)
        throw new BadRequestException(
          `Đơn hàng ${order.id.slice(0, 8).toUpperCase()} không ở trạng thái chờ thanh toán (${order.status})`,
        );
      if (order.paymentGroupId)
        throw new BadRequestException('Đơn hàng đã thuộc một nhóm thanh toán khác.');
    }

    const amount = orders.reduce((sum, order) => sum + Math.round(Number(order.totalAmount)), 0);
    if (amount <= 0) throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');

    const orderCode = await this.orderCodes.next();
    const description = `Nexus GH${orderCode}`.slice(0, 25);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';
    const returnUrl = dto?.returnUrl || `${frontendUrl}/payment/success?orderCode=${orderCode}`;
    const cancelUrl = dto?.cancelUrl || `${frontendUrl}/payment/cancel?orderCode=${orderCode}`;

    const buyer = orders[0].buyer;
    const addressSnapshot = (
      orders[0].shippingAddressSnapshot && typeof orders[0].shippingAddressSnapshot === 'object'
        ? orders[0].shippingAddressSnapshot
        : {}
    ) as Record<string, string>;

    const items = orders.flatMap((order) =>
      order.items.map((item) => ({
        name: (item.product?.title ?? item.titleSnapshot ?? 'Sản phẩm').slice(0, 50),
        quantity: item.quantity,
        price: Math.round(Number(item.unitPrice)),
      })),
    );

    const paymentLink = await this.payosService.createPaymentLink({
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items,
      buyerName: addressSnapshot?.recipientName || buyer?.fullName || undefined,
      buyerEmail: buyer?.email || undefined,
      buyerPhone: addressSnapshot?.phone || buyer?.phoneNumber || undefined,
      buyerAddress: addressSnapshot?.street
        ? `${addressSnapshot.street}, ${addressSnapshot.city || ''}`
        : undefined,
    });

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentGroup.create({
        data: {
          buyerId,
          orderCode: String(orderCode),
          amount,
          status: PaymentStatus.PENDING,
          metadata: {
            orderCode,
            paymentLinkId: paymentLink.paymentLinkId,
            checkoutUrl: paymentLink.checkoutUrl,
            qrCode: paymentLink.qrCode,
            accountNumber: paymentLink.accountNumber,
            accountName: paymentLink.accountName,
            bin: paymentLink.bin,
          } as Prisma.InputJsonValue,
        },
      });

      const joined = await tx.order.updateMany({
        where: {
          id: { in: orderIds },
          buyerId,
          status: OrderStatus.PENDING_PAYMENT,
          paymentGroupId: null,
        },
        data: { paymentGroupId: created.id },
      });
      if (joined.count !== orderIds.length)
        throw new BadRequestException(
          'Một trong các đơn hàng đã thay đổi trạng thái; vui lòng thanh toán lại.',
        );

      return created;
    });

    return {
      orderIds: orders.map((order) => order.id),
      paymentGroupId: group.id,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      bin: paymentLink.bin,
      amount,
      description,
    };
  }

  /**
   * Settles a verified PayOS callback, against one order or against a group.
   */
  async settleOrderPayment(webhookData: WebhookData): Promise<PayosSettlement | null> {
    return this.settlement.settleOrderPayment(webhookData);
  }

  /**
   * Checks and synchronizes PayOS payment status directly for an order or payment group.
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

    if (order.paymentGroupId && order.payments.length === 0) {
      const group = await this.prisma.paymentGroup.findUnique({
        where: { id: order.paymentGroupId },
      });
      if (!group) return { paid: false, status: order.status };
      if (group.status === PaymentStatus.SUCCESS) return { paid: true, status: order.status };

      try {
        const payosInfo = await this.payosService.getPaymentLink(Number(group.orderCode));
        if (
          payosInfo &&
          (payosInfo.status === 'PAID' || Number(payosInfo.amountPaid) >= Number(group.amount))
        ) {
          await this.settlement.settleGroupOrders(group.id, {
            payosStatus: payosInfo.status,
            verifiedDirectly: true,
          });
          void this.syncTrendingSafely();
          return {
            paid: true,
            status: OrderStatus.PAID,
            message: 'Nhóm đơn hàng đã được thanh toán và ghi nhận.',
          };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Không kiểm tra được trạng thái nhóm thanh toán PayOS: ${message}`);
      }

      return { paid: false, status: order.status };
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
