import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Handles cash-on-delivery (COD) payment registration for retail orders.
 */
@Injectable()
export class OrderCodPaymentService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: AppErrorCode.ORDER_NOT_FOUND,
      });
    }

    if (order.isAuction) {
      throw new BadRequestException({
        message:
          'Auction orders must be paid through claim checkout to apply the deposit correctly.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        message: 'You do not have permission to act on this order',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        message: `Cannot record COD payment for an order in '${order.status}' status.`,
        errorCode: AppErrorCode.ORDER_INVALID_STATE,
      });
    }

    const hasSuccessfulPayment = order.payments.some((p) => p.status === PaymentStatus.SUCCESS);
    if (hasSuccessfulPayment) {
      throw new BadRequestException({
        message: 'This order has already been paid successfully.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }

    const existingCod = order.payments.find((p) => p.provider === PaymentProvider.COD);
    if (!existingCod) {
      await this.prisma.payment.create({
        data: {
          orderId,
          provider: PaymentProvider.COD,
          amount: order.totalAmount,
          status: PaymentStatus.PENDING,
          metadata: { note: 'Cash on Delivery (COD)' },
        },
      });
    }

    return {
      orderId,
      success: true,
      message: 'COD payment method recorded successfully.',
      provider: PaymentProvider.COD,
    };
  }
}
