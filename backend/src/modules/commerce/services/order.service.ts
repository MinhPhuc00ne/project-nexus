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
import { effectivePrice } from '../../catalog/utils/product-price';
import { productChoiceLabel, validateSelections } from '../../catalog/utils/product-options';
import { validateQuotedCheckout } from '../utils/checkout-validation';
import { PayOrderDto } from '../dtos/pay-order.dto';
import { DepositWalletDto } from '../dtos/deposit-wallet.dto';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ProductStatus,
  Prisma,
  WalletTransactionType,
  WalletTransactionStatus,
  NotificationType,
  NotificationChannel,
} from '@prisma/client';
import { Webhook } from '@payos/node';
import { OrderEscrowService } from './order-escrow.service';
import {
  GhnShippingService,
  GhnShippingQuote,
} from '../../fulfillment/services/ghn-shipping.service';

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
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly configService: ConfigService,
    private readonly shipping: GhnShippingService,
    private readonly escrow: OrderEscrowService,
  ) {}

  /**
   * Tạo đơn hàng từ giỏ hàng hiện tại (Price Revalidation + Anti-Self-Purchase)
   */
  async checkout(buyerId: string, dto: CheckoutDto, idempotencyKey?: string, quoteOnly = false) {
    const pricedAt = new Date();
    const cart = await this.prisma.cart.findUnique({
      where: { userId: buyerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventories: true,
                options: true,
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
    if (dto.itemIds?.length && new Set(dto.itemIds).size !== itemsToCheckout.length) {
      throw new BadRequestException('Có sản phẩm không thuộc giỏ hàng được chọn.');
    }

    // 1. Kiểm tra trạng thái sản phẩm, tồn kho và quy tắc Anti-Self-Purchase
    const quantityByProduct = new Map<string, number>();
    for (const item of itemsToCheckout) {
      const product = item.product;
      validateSelections(product.options ?? [], item.selections);

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
      const selectedQty = (quantityByProduct.get(item.productId) ?? 0) + item.quantity;
      quantityByProduct.set(item.productId, selectedQty);
      if (selectedQty > totalAvailable) {
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

    // Obtain every seller's official quote before opening the database transaction.
    const shippingBySeller = new Map<string, GhnShippingQuote>();
    for (const [sellerId, sellerItems] of itemsBySeller) {
      const quote = await this.shipping.quote(
        sellerId,
        dto.shippingAddress,
        sellerItems.map(({ product, quantity, selections }) => ({
          name: productChoiceLabel(product.title, selections),
          quantity,
          weight: product.weightGrams,
          length: product.lengthCm,
          width: product.widthCm,
          height: product.heightCm,
          price: effectivePrice(product, pricedAt),
        })),
      );
      shippingBySeller.set(sellerId, quote);
    }

    if (quoteOnly) {
      const quotes = [...itemsBySeller].map(([sellerId, items]) => {
        const quote = shippingBySeller.get(sellerId);
        if (!quote) throw new BadRequestException('Chưa lấy được báo giá GHN.');
        const subtotal = items.reduce(
          (sum, item) => sum + effectivePrice(item.product, pricedAt) * item.quantity,
          0,
        );
        return {
          sellerId,
          subtotal,
          shippingFee: quote.fee.total,
          totalAmount: subtotal + quote.fee.total,
          feeSource: 'GHN_API',
          parcel: quote.parcel,
        };
      });
      return {
        quotes,
        totalShippingFee: quotes.reduce((sum, quote) => sum + quote.shippingFee, 0),
        totalAmount: quotes.reduce((sum, quote) => sum + quote.totalAmount, 0),
      };
    }

    // 3. Khởi tạo đơn hàng trong Transaction an toàn
    const createdOrders = await this.prisma.$transaction(async (tx) => {
      await validateQuotedCheckout(
        tx,
        cart.id,
        itemsToCheckout.map((item) => ({
          id: item.id,
          productId: item.productId,
          sellerId: item.product.sellerId,
          quantity: item.quantity,
          optionKey: item.optionKey ?? '',
          price: effectivePrice(item.product, pricedAt),
        })),
        pricedAt,
      );
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

      for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
        const shippingQuote = shippingBySeller.get(sellerId);
        if (!shippingQuote) {
          throw new BadRequestException('Chưa lấy được báo giá GHN cho người bán.');
        }
        const shippingPerShop = shippingQuote.fee.total;
        const subtotal = sellerItems.reduce(
          (sum, i) => sum + effectivePrice(i.product, pricedAt) * i.quantity,
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
            shippingAddressSnapshot: {
              ...dto.shippingAddress,
              ghn: {
                origin: shippingQuote.origin,
                parcel: shippingQuote.parcel,
                request: shippingQuote.request,
                fee: shippingQuote.fee,
                quotedAt: new Date().toISOString(),
              },
            } as unknown as Prisma.InputJsonValue,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}-${sellerId}` : undefined,
            items: {
              create: sellerItems.map((item) => ({
                productId: item.productId,
                selections: validateSelections(item.product.options ?? [], item.selections)
                  .selections,
                quantity: item.quantity,
                unitPrice: effectivePrice(item.product, pricedAt),
                totalPrice: effectivePrice(item.product, pricedAt) * item.quantity,
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

    // 4. Tự động xử lý thanh toán nếu chỉ có 1 đơn hàng
    let payosPayment: PayosPaymentResponse | null = null;
    let walletPayment: WalletPaymentResponse | null = null;

    if (createdOrders.length === 1) {
      if (!dto.paymentMethod || dto.paymentMethod === PaymentProvider.PAYOS) {
        try {
          payosPayment = (await this.initializePayment(createdOrders[0].id, buyerId, {
            provider: PaymentProvider.PAYOS,
            returnUrl: dto.returnUrl,
            cancelUrl: dto.cancelUrl,
          })) as PayosPaymentResponse;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Tạo link PayOS ngay khi checkout thất bại: ${message}`);
        }
      } else if (dto.paymentMethod === PaymentProvider.WALLET) {
        walletPayment = (await this.initializePayment(createdOrders[0].id, buyerId, {
          provider: PaymentProvider.WALLET,
        })) as WalletPaymentResponse;
      }
    }

    return {
      orders: createdOrders,
      payosPayment,
      walletPayment,
    };
  }

  /**
   * Khởi tạo giao dịch thanh toán cho đơn hàng (Hỗ trợ PayOS VietQR & Ví NEXUS Pay)
   */
  async initializePayment(
    orderId: string,
    buyerId: string,
    dto?: PayOrderDto,
  ): Promise<PayosPaymentResponse | WalletPaymentResponse> {
    const provider = dto?.provider || PaymentProvider.PAYOS;

    // 1. Nếu chọn thanh toán bằng VÍ (WALLET)
    if (provider === PaymentProvider.WALLET) {
      return this.payOrderByWallet(orderId, buyerId);
    }

    // 2. Nếu chọn cổng thanh toán khác ngoài PAYOS (ví dụ STRIPE chưa kích hoạt)
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

      // Keep funds in escrow until verified delivery and buyer confirmation.
      const settlement = await this.escrow.hold(tx, updatedOrder);

      // 7. Gửi thông báo cho người mua
      await tx.notification.create({
        data: {
          userId: buyerId,
          title: 'Thanh toán đơn hàng thành công ✅',
          content: `Đơn hàng #${order.id.slice(0, 8).toUpperCase()} trị giá ${orderAmount.toLocaleString('vi-VN')} VND đã được thanh toán thành công bằng ví NEXUS Pay. Số dư còn lại: ${Number(updatedBuyerWallet.balance).toLocaleString('vi-VN')} VND.`,
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
   * Xử lý Webhook gửi từ PayOS khi khách hàng chuyển khoản VietQR thành công
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

        // Never disburse funds merely because the payment succeeded.
        await this.escrow.hold(tx, updatedOrder);
      });

      this.logger.log(`Đơn ${payment.orderId} đã thanh toán PayOS; tiền được giữ ký quỹ.`);
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
        escrowRecord: true,
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
        escrowRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Xem thông tin ví người dùng hiện tại
   */
  async getUserWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
        include: {
          transactions: true,
        },
      });
    }

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
      currency: wallet.currency,
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        referenceId: t.referenceId,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Nạp tiền vào ví cá nhân (để mua sắm / test thanh toán ví)
   */
  async depositToUserWallet(userId: string, dto: DepositWalletDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Số tiền nạp vào ví phải lớn hơn 0 đồng');
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
    }

    const depositAmount = new Prisma.Decimal(dto.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: depositAmount },
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: depositAmount,
          type: WalletTransactionType.DEPOSIT,
          status: WalletTransactionStatus.SUCCESS,
          description: dto.description?.trim() || 'Nạp tiền vào ví cá nhân',
        },
      });

      return { updatedWallet, transaction };
    });

    return {
      success: true,
      message: `Nạp thành công ${Number(dto.amount).toLocaleString('vi-VN')} VND vào ví.`,
      balance: Number(result.updatedWallet.balance),
      transaction: {
        id: result.transaction.id,
        amount: Number(result.transaction.amount),
        type: result.transaction.type,
        status: result.transaction.status,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt,
      },
    };
  }
}
