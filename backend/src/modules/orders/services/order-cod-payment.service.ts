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
        message: 'Không tìm thấy đơn hàng tương ứng',
        errorCode: AppErrorCode.ORDER_NOT_FOUND,
      });
    }

    if (order.isAuction) {
      throw new BadRequestException({
        message: 'Đơn đấu giá phải thanh toán qua quyền mua, để sử dụng đúng tiền cọc.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền thao tác trên đơn hàng này',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        message: `Không thể ghi nhận thanh toán COD cho đơn hàng ở trạng thái '${order.status}'.`,
        errorCode: AppErrorCode.ORDER_INVALID_STATE,
      });
    }

    const hasSuccessfulPayment = order.payments.some((p) => p.status === PaymentStatus.SUCCESS);
    if (hasSuccessfulPayment) {
      throw new BadRequestException({
        message: 'Đơn hàng đã được thanh toán thành công trước đó.',
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
}
