import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { PayosService } from './payos.service';
import { CheckoutDto } from '../dtos/checkout.dto';
import { PayOrderDto } from '../dtos/pay-order.dto';
import { OrderStatus, PaymentProvider, PaymentStatus, ProductStatus, Prisma } from '@prisma/client';
import { Webhook } from '@payos/node';

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

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Tạo đơn hàng từ giỏ hàng hiện tại (Price Revalidation + Anti-Self-Purchase)
   */
  async checkout(buyerId: string, dto: CheckoutDto, idempotencyKey?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: buyerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventories: true,
                seller: { select: { isShopSuspended: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể tiến hành đặt hàng');
    }

    // Lọc các item được chọn để checkout
    const itemsToCheckout =
      dto.itemIds && dto.itemIds.length > 0
        ? cart.items.filter((item) => dto.itemIds!.includes(item.id))
        : cart.items;

    if (itemsToCheckout.length === 0) {
      throw new BadRequestException('Không tìm thấy sản phẩm hợp lệ trong giỏ hàng để đặt hàng');
    }

    // 1. Kiểm tra trạng thái sản phẩm, tồn kho và quy tắc Anti-Self-Purchase
    for (const item of itemsToCheckout) {
      const product = item.product;

      if (product.seller?.isShopSuspended) {
        throw new BadRequestException(
          `Sản phẩm "${product.title}" thuộc gian hàng đang bị tạm đình chỉ hoạt động, không thể đặt mua.`,
        );
      }

      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          `Sản phẩm "${product.title}" hiện không còn mở bán công khai`,
        );
      }

      // Rule 6.3: Anti-Self-Purchase - Chặn tự mua hàng của chính mình
      if (product.sellerId === buyerId) {
        throw new BadRequestException(
          `CANNOT_PURCHASE_OWN_PRODUCT: Bạn không thể tự mua sản phẩm "${product.title}" từ gian hàng của chính mình`,
        );
      }

      // Kiểm tra tồn kho khả dụng
      const totalAvailable = product.inventories.reduce((acc, inv) => acc + inv.availableQty, 0);
      if (item.quantity > totalAvailable) {
        throw new BadRequestException(
          `Sản phẩm "${product.title}" chỉ còn lại ${totalAvailable} sản phẩm trong kho`,
        );
      }
    }

    // 2. Nhóm sản phẩm theo từng Shop / Seller (Hỗ trợ mô hình Multi-vendor)
    const itemsBySeller = new Map<string, typeof itemsToCheckout>();
    for (const item of itemsToCheckout) {
      const sellerId = item.product.sellerId;
      const list = itemsBySeller.get(sellerId) || [];
      list.push(item);
      itemsBySeller.set(sellerId, list);
    }

    // 3. Khởi tạo đơn hàng trong Transaction an toàn
    const createdOrders = await this.prisma.$transaction(async (tx) => {
      const orders: Array<
        Prisma.OrderGetPayload<{
          include: {
            items: {
              include: {
                product: {
                  select: { id: true; title: true; basePrice: true };
                };
              };
            };
          };
        }>
      > = [];
      const shippingPerShop = dto.shippingFee || 0;

      for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
        const subtotal = sellerItems.reduce(
          (sum, i) => sum + Number(i.product.basePrice) * i.quantity,
          0,
        );
        const totalAmount = subtotal + shippingPerShop;

        const order = await tx.order.create({
          data: {
            buyerId,
            sellerId,
            subtotal,
            shippingFee: shippingPerShop,
            totalAmount,
            status: OrderStatus.PENDING_PAYMENT,
            shippingAddressSnapshot: dto.shippingAddress as unknown as Prisma.InputJsonValue,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}-${sellerId}` : undefined,
            items: {
              create: sellerItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.product.basePrice,
                totalPrice: Number(item.product.basePrice) * item.quantity,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, title: true, basePrice: true },
                },
              },
            },
          },
        });

        orders.push(order);
      }

      // Xóa các sản phẩm đã đặt mua khỏi giỏ hàng
      await tx.cartItem.deleteMany({
        where: { id: { in: itemsToCheckout.map((i) => i.id) } },
      });

      return orders;
    });

    // 4. Nếu chỉ có 1 đơn hàng và người dùng chọn PayOS, tự động sinh payment link trả về luôn
    let payosPayment: PayosPaymentResponse | null = null;
    if (
      createdOrders.length === 1 &&
      (!dto.paymentMethod || dto.paymentMethod === PaymentProvider.PAYOS)
    ) {
      try {
        payosPayment = await this.initializePayment(createdOrders[0].id, buyerId, {
          provider: PaymentProvider.PAYOS,
          returnUrl: dto.returnUrl,
          cancelUrl: dto.cancelUrl,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Tạo link PayOS ngay khi checkout thất bại: ${message}`);
      }
    }

    return {
      orders: createdOrders,
      payosPayment,
    };
  }

  /**
   * Khởi tạo liên kết thanh toán PayOS VietQR cho đơn hàng
   */
  async initializePayment(
    orderId: string,
    buyerId: string,
    dto?: PayOrderDto,
  ): Promise<PayosPaymentResponse> {
    const provider = dto?.provider || PaymentProvider.PAYOS;

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

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Đơn hàng hiện không ở trạng thái chờ thanh toán (Trạng thái hiện tại: ${order.status})`,
      );
    }

    if (provider !== PaymentProvider.PAYOS) {
      throw new BadRequestException(`Cổng thanh toán ${provider} hiện chưa được kích hoạt`);
    }

    // PayOS yêu cầu orderCode là số nguyên (integer) duy nhất (tối đa 9007199254740991)
    // Sử dụng 6 số cuối của timestamp + 4 số ngẫu nhiên
    const timestampSuffix = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const orderCode = Number(`${timestampSuffix}${randomSuffix}`);

    const amount = Math.round(Number(order.totalAmount));
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 đồng');
    }

    // Tối đa 25 ký tự, chữ không dấu và số
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
      name: item.product.title.slice(0, 50),
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
   * Xử lý Webhook gửi từ PayOS khi khách hàng thanh toán thành công
   */
  async handlePayosWebhook(body: Webhook) {
    // 1. Xác thực tính toàn vẹn chữ ký từ PayOS
    const webhookData = await this.payosService.verifyWebhook(body);

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
        this.logger.warn(`Không tìm thấy bản ghi Payment cho PayOS orderCode=${orderCode}`);
        return { success: false, message: 'Payment record not found' };
      }

      // Idempotency: Nếu đã SUCCESS rồi thì không xử lý lại
      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(`Giao dịch PayOS orderCode=${orderCode} đã được xử lý trước đó`);
        return { success: true, message: 'Already processed' };
      }

      // Cập nhật trạng thái Payment -> SUCCESS và Order -> PAID trong Transaction
      const currentMetadata = (
        payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
      ) as Record<string, unknown>;

      await this.prisma.$transaction(async (tx) => {
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

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
          },
        });
      });

      this.logger.log(
        `Đã cập nhật trạng thái đơn hàng ${payment.orderId} sang PAID từ Webhook PayOS thành công!`,
      );
    }

    return {
      success: true,
      orderCode,
    };
  }

  /**
   * Xem chi tiết đơn hàng (kèm trạng thái Payment)
   */
  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        seller: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin đơn hàng này');
    }

    return order;
  }

  /**
   * Xem danh sách các đơn hàng đã đặt của người dùng
   */
  async getUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        seller: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
