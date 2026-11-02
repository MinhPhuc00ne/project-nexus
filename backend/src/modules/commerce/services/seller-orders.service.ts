import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CarrierName,
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { GhnDispatchService } from '../../fulfillment/services/ghn-dispatch.service';
import { DispatchGhnOrderDto, QuerySellerOrdersDto } from '../dtos/seller-order.dto';

@Injectable()
export class SellerOrdersService {
  private readonly logger = new Logger(SellerOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchService: GhnDispatchService,
  ) {}

  /**
   * 1. Lấy danh sách đơn bán của Seller kèm phân trang, tìm kiếm và bộ lọc trạng thái
   */
  async listOrders(sellerId: string, query: QuerySellerOrdersDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      sellerId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { buyer: { fullName: { contains: search, mode: 'insensitive' } } },
        { buyer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Lấy song song dữ liệu và tổng số đếm theo từng nhóm trạng thái (Counters)
    const [total, orders, allSellerOrders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: { take: 1, orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
          shipment: true,
          escrowRecord: true,
        },
      }),
      this.prisma.order.findMany({
        where: { sellerId },
        select: { status: true },
      }),
    ]);

    const counters = {
      all: allSellerOrders.length,
      pendingPayment: allSellerOrders.filter((o) => o.status === OrderStatus.PENDING_PAYMENT)
        .length,
      paid: allSellerOrders.filter((o) => o.status === OrderStatus.PAID).length,
      preparing: allSellerOrders.filter((o) => o.status === OrderStatus.PREPARING).length,
      shipping: allSellerOrders.filter((o) => o.status === OrderStatus.SHIPPING).length,
      delivered: allSellerOrders.filter((o) => o.status === OrderStatus.DELIVERED).length,
      confirmed: allSellerOrders.filter((o) => o.status === OrderStatus.CONFIRMED).length,
      cancelled: allSellerOrders.filter((o) => o.status === OrderStatus.CANCELLED).length,
      refunded: allSellerOrders.filter((o) => o.status === OrderStatus.REFUNDED).length,
    };

    const items = orders.map((o) => ({
      id: o.id,
      buyer: o.buyer,
      subtotal: Number(o.subtotal),
      shippingFee: Number(o.shippingFee),
      totalAmount: Number(o.totalAmount),
      status: o.status,
      shippingAddress: o.shippingAddressSnapshot,
      itemsCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        selections: it.selections,
        title: it.product?.title || '',
        thumbnail: it.product?.images?.[0]?.imageUrl || null,
        unitPrice: Number(it.unitPrice),
        quantity: it.quantity,
        totalPrice: Number(it.totalPrice),
      })),
      shipment: o.shipment
        ? {
            id: o.shipment.id,
            carrier: o.shipment.carrier,
            trackingNumber: o.shipment.trackingNumber,
            waybillCode: o.shipment.waybillCode,
            status: o.shipment.status,
            createdAt: o.shipment.createdAt,
          }
        : null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    return {
      items,
      counters,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 2. Xem chi tiết 1 đơn hàng cụ thể của Seller
   */
  async getOrderDetail(sellerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                weightGrams: true,
                lengthCm: true,
                widthCm: true,
                heightCm: true,
                images: { take: 1, orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        shipment: true,
        escrowRecord: true,
        dispute: true,
        review: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này.');
    }

    return {
      id: order.id,
      buyer: order.buyer,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
      status: order.status,
      shippingAddress: order.shippingAddressSnapshot,
      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        selections: it.selections,
        title: it.product?.title || '',
        weightGrams: it.product?.weightGrams || 500,
        dimensions: {
          lengthCm: it.product?.lengthCm || 10,
          widthCm: it.product?.widthCm || 10,
          heightCm: it.product?.heightCm || 10,
        },
        thumbnail: it.product?.images?.[0]?.imageUrl || null,
        unitPrice: Number(it.unitPrice),
        quantity: it.quantity,
        totalPrice: Number(it.totalPrice),
      })),
      shipment: order.shipment
        ? {
            id: order.shipment.id,
            carrier: order.shipment.carrier,
            trackingNumber: order.shipment.trackingNumber,
            waybillCode: order.shipment.waybillCode,
            status: order.shipment.status,
            chargeableWeight: Number(order.shipment.chargeableWeight),
            shippingFee: Number(order.shipment.shippingFee),
            metadata: order.shipment.metadata,
            createdAt: order.shipment.createdAt,
          }
        : null,
      escrow: order.escrowRecord
        ? {
            status: order.escrowRecord.status,
            totalAmount: Number(order.escrowRecord.totalAmount),
            platformFee: Number(order.escrowRecord.platformFee),
            sellerPayout: Number(order.escrowRecord.sellerPayout),
          }
        : null,
      dispute: order.dispute,
      review: order.review
        ? {
            id: order.review.id,
            rating: Number(order.review.rating),
            comment: order.review.comment,
            createdAt: order.review.createdAt,
          }
        : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * 3. Seller xác nhận đơn hàng (Chuyển trạng thái PAID -> PREPARING)
   */
  async confirmOrder(sellerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này.');
    }

    const codPayment = await this.prisma.payment.findFirst({
      where: { orderId, provider: PaymentProvider.COD },
    });
    const isCod = Boolean(codPayment);

    const allowedStatuses: OrderStatus[] = isCod
      ? [OrderStatus.PENDING_PAYMENT, OrderStatus.PREPARING]
      : [OrderStatus.PAID, OrderStatus.PREPARING];

    if (!allowedStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Không thể xác nhận đơn hàng ở trạng thái '${order.status}'. ${
          isCod
            ? 'Đơn hàng COD phải ở trạng thái PENDING_PAYMENT hoặc PREPARING.'
            : 'Đơn hàng phải đã thanh toán (PAID).'
        }`,
      );
    }

    const changed = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: allowedStatuses },
        OR: [{ afterSales: null }, { afterSales: { status: 'REJECTED' } }],
      },
      data: { status: OrderStatus.PREPARING },
    });
    if (changed.count !== 1)
      throw new BadRequestException('Đơn đã thay đổi hoặc đang có yêu cầu hủy/trả hàng.');
    const updated = { id: orderId, status: OrderStatus.PREPARING };

    // Thông báo cho Buyer
    await this.prisma.notification.create({
      data: {
        userId: order.buyerId,
        title: 'Đơn hàng của bạn đã được người bán xác nhận',
        content: `Đơn hàng #${order.id.slice(0, 8)} đã được người bán xác nhận và đang đóng gói chuẩn bị giao.`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
    });

    return {
      success: true,
      message: 'Đã xác nhận đơn hàng thành công, sẵn sàng đóng gói và bàn giao GHN.',
      orderId: updated.id,
      status: updated.status,
    };
  }

  /**
   * 4. Seller tạo / bàn giao vận đơn GHN Express (Chuyển trạng thái PREPARING -> SHIPPING)
   */
  async dispatchGhn(sellerId: string, orderId: string, dto?: DispatchGhnOrderDto) {
    return this.dispatchService.dispatch(sellerId, orderId, dto);
  }

  /**
   * 5. In phiếu giao hàng / Vận đơn GHN (Print Waybill)
   */
  async printWaybill(sellerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        items: { include: { product: true } },
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền in vận đơn của đơn hàng này.');
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: 'APPROVED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: { where: { isDefault: true }, take: 1 },
      },
    });

    const storeInfo = seller?.sellerUpgradeRequests[0];
    const defaultAddress = seller?.addresses[0];
    const shippingAddress = order.shippingAddressSnapshot as Record<
      string,
      string | null | undefined
    >;
    const waybillCode = order.shipment?.waybillCode;
    const metadata = order.shipment?.metadata;
    const carrierData =
      metadata && typeof metadata === 'object' && 'data' in metadata ? metadata.data : null;
    if (
      !waybillCode ||
      order.shipment?.carrier !== CarrierName.GHN ||
      !metadata ||
      typeof metadata !== 'object' ||
      !('code' in metadata) ||
      metadata.code !== 200 ||
      ('fallback' in metadata && metadata.fallback) ||
      !carrierData ||
      typeof carrierData !== 'object' ||
      !('order_code' in carrierData) ||
      carrierData.order_code !== waybillCode
    ) {
      throw new BadRequestException(
        'Đơn hàng chưa có vận đơn được GHN xác nhận. Chưa thể in phiếu.',
      );
    }

    return {
      waybillCode,
      carrier: 'Giao Hàng Nhanh (GHN Express)',
      orderId: order.id,
      orderDate: order.createdAt,
      sender: {
        storeName: storeInfo?.storeName || seller?.fullName || 'Gian hàng Project Nexus',
        phone: storeInfo?.phone || seller?.phoneNumber || '',
        address:
          storeInfo?.formattedAddress || defaultAddress?.formattedAddress || 'Kho hàng người bán',
      },
      recipient: {
        name: shippingAddress?.recipientName || order.buyer?.fullName || '',
        phone: shippingAddress?.phone || order.buyer?.phoneNumber || '',
        address:
          shippingAddress?.street || shippingAddress?.formattedAddress || 'Địa chỉ nhận hàng',
        city: shippingAddress?.city || '',
        district: shippingAddress?.district || '',
        ward: shippingAddress?.ward || '',
      },
      items: order.items.map((it) => ({
        name: it.product?.title || 'Sản phẩm',
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
      })),
      totalAmount: Number(order.totalAmount),
      shippingFee: Number(order.shippingFee),
      codAmount: 0, // Đơn hàng thanh toán online sàn giữ Escrow
      barcodeUrl: `https://barcode.tec-it.com/barcode.ashx?data=${waybillCode}&code=Code128&dpi=96`,
      note: 'Cho xem hàng, không cho thử. Hàng chuyển phát nhanh qua Project Nexus.',
    };
  }
}
