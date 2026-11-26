import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { OrderStatus, PaymentProvider, PaymentStatus, Prisma, ProductStatus } from '@prisma/client';
import { WebhookData } from '@payos/node';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { productChoiceLabel, validateSelections } from '../../../core/domain/product-options';
import { effectivePrice } from '../../../core/domain/product-price';
import {
  GhnShippingQuote,
  GhnShippingService,
} from '../../fulfillment/services/ghn-shipping.service';
import { CheckoutInput } from '../dtos/checkout.dto';
import { PayOrderInput } from '../dtos/pay-order.dto';
import { validateQuotedCheckout } from '../utils/checkout-validation';
import {
  OrderPaymentHelper,
  PayosGroupPaymentResponse,
  PayosPaymentResponse,
  WalletPaymentResponse,
} from './order-payment.helper';

export type {
  PayosGroupPaymentResponse,
  PayosPaymentResponse,
  WalletPaymentResponse,
} from './order-payment.helper';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: GhnShippingService,
    private readonly paymentHelper: OrderPaymentHelper,
    @Optional() private readonly inventoryService?: InventoryService,
  ) {}

  /**
   * Tạo đơn hàng từ giỏ hàng hiện tại (Price Revalidation + Anti-Self-Purchase)
   */
  async checkout(buyerId: string, dto: CheckoutInput, idempotencyKey?: string, quoteOnly = false) {
    if (idempotencyKey && !quoteOnly) {
      const existingOrders = await this.prisma.order.findMany({
        where: {
          idempotencyKey: {
            startsWith: `${idempotencyKey}-`,
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

      if (existingOrders.length > 0) {
        return {
          orders: existingOrders,
          payosPayment: null,
          walletPayment: null,
        };
      }
    }

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
            payments:
              dto.paymentMethod === PaymentProvider.COD
                ? {
                    create: {
                      provider: PaymentProvider.COD,
                      amount: totalAmount,
                      status: PaymentStatus.PENDING,
                      metadata: { note: 'Thanh toán tiền mặt khi nhận hàng (COD)' },
                    },
                  }
                : undefined,
          },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, title: true, basePrice: true },
                },
              },
            },
            payments: true,
          },
        });

        // Khóa / Đặt chỗ tồn kho cho từng sản phẩm trong đơn hàng
        if (this.inventoryService) {
          for (const item of sellerItems) {
            await this.inventoryService.reserveStock(tx, item.productId, item.quantity, order.id);
          }
        }

        orders.push(order);
      }

      // Xóa các sản phẩm đã đặt mua khỏi giỏ hàng
      await tx.cartItem.deleteMany({
        where: { id: { in: itemsToCheckout.map((i) => i.id) } },
      });

      return orders;
    });

    // 4. Khởi tạo thanh toán cho các đơn vừa tạo.
    //
    // This step used to be wrapped in `createdOrders.length === 1`, so a cart
    // holding items from two shops — which becomes one order per shop, because
    // an order is what one seller packs — ended with every order waiting for
    // payment and no way to pay for any of them from the checkout just
    // completed. The buyer pays once; what that means per method differs:
    // PayOS gets one link for a group, the wallet is debited for each order in
    // one transaction, and COD is simply recorded against each.
    let payosPayment: PayosPaymentResponse | null = null;
    let payosGroupPayment: PayosGroupPaymentResponse | null = null;
    let walletPayment: WalletPaymentResponse | null = null;
    let walletPayments: WalletPaymentResponse[] | null = null;
    let codPayment: {
      orderId: string;
      success: boolean;
      message: string;
      provider: PaymentProvider;
    } | null = null;
    let codPayments: Array<{
      orderId: string;
      success: boolean;
      message: string;
      provider: PaymentProvider;
    }> | null = null;

    const method = dto.paymentMethod || PaymentProvider.PAYOS;
    const orderIds = createdOrders.map((order) => order.id);

    if (createdOrders.length === 1) {
      if (method === PaymentProvider.PAYOS) {
        try {
          payosPayment = (await this.initializePayment(orderIds[0], buyerId, {
            provider: PaymentProvider.PAYOS,
            returnUrl: dto.returnUrl,
            cancelUrl: dto.cancelUrl,
          })) as PayosPaymentResponse;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Tạo link PayOS ngay khi checkout thất bại: ${message}`);
        }
      } else if (method === PaymentProvider.WALLET) {
        walletPayment = (await this.initializePayment(orderIds[0], buyerId, {
          provider: PaymentProvider.WALLET,
        })) as WalletPaymentResponse;
      } else if (method === PaymentProvider.COD) {
        codPayment = {
          orderId: orderIds[0],
          success: true,
          message: 'Phương thức thanh toán COD đã được ghi nhận thành công.',
          provider: PaymentProvider.COD,
        };
      }
    } else if (method === PaymentProvider.PAYOS) {
      try {
        payosGroupPayment = await this.paymentHelper.initializeGroupPayment(orderIds, buyerId, {
          provider: PaymentProvider.PAYOS,
          returnUrl: dto.returnUrl,
          cancelUrl: dto.cancelUrl,
        });
      } catch (err: unknown) {
        // As with a single order, the orders stand and the buyer can ask for a
        // link again; losing the gateway must not lose the checkout.
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Tạo link PayOS cho nhóm đơn ngay khi checkout thất bại: ${message}`);
      }
    } else if (method === PaymentProvider.WALLET) {
      walletPayments = await this.paymentHelper.payOrdersByWallet(orderIds, buyerId);
    } else if (method === PaymentProvider.COD) {
      codPayments = orderIds.map((orderId) => ({
        orderId,
        success: true,
        message: 'Phương thức thanh toán COD đã được ghi nhận thành công.',
        provider: PaymentProvider.COD,
      }));
    }

    return {
      orders: createdOrders,
      payosPayment,
      payosGroupPayment,
      walletPayment,
      walletPayments,
      codPayment,
      codPayments,
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
        dispute: true,
        afterSales: true,
        refunds: true,
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
        dispute: true,
        afterSales: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  initializePayment(orderId: string, buyerId: string, dto?: PayOrderInput) {
    return this.paymentHelper.initializePayment(orderId, buyerId, dto);
  }

  payOrderByWallet(orderId: string, buyerId: string): Promise<WalletPaymentResponse> {
    return this.paymentHelper.payOrderByWallet(orderId, buyerId);
  }

  registerCodPayment(orderId: string, buyerId: string) {
    return this.paymentHelper.registerCodPayment(orderId, buyerId);
  }

  settleOrderPayment(webhookData: WebhookData) {
    return this.paymentHelper.settleOrderPayment(webhookData);
  }

  checkPayosPaymentStatus(orderId: string, userId: string) {
    return this.paymentHelper.checkPayosPaymentStatus(orderId, userId);
  }
}
