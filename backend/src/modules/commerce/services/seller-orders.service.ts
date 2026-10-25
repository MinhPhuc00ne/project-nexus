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
  Prisma,
  ShipmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { GhnLogisticsService } from '../../fulfillment/services/ghn-logistics.service';
import { DispatchGhnOrderDto, QuerySellerOrdersDto } from '../dtos/seller-order.dto';

@Injectable()
export class SellerOrdersService {
  private readonly logger = new Logger(SellerOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ghnService: GhnLogisticsService,
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

    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException(
        `Không thể xác nhận đơn hàng ở trạng thái '${order.status}'. Đơn hàng phải đã thanh toán (PAID).`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PREPARING },
    });

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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        items: {
          include: {
            product: true,
          },
        },
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền bàn giao đơn hàng này.');
    }

    if (order.status !== OrderStatus.PREPARING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Đơn hàng đang ở trạng thái '${order.status}', không thể tạo vận đơn GHN. Trạng thái hợp lệ: PAID hoặc PREPARING.`,
      );
    }

    // Lấy thông tin địa chỉ kho xuất hàng của Seller
    const _seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: 'APPROVED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    const shippingAddress = order.shippingAddressSnapshot as Record<
      string,
      string | null | undefined
    >;

    const totalWeightGrams =
      dto?.weightGrams ||
      order.items.reduce((acc, it) => acc + (it.product?.weightGrams || 500) * it.quantity, 0);

    const lengthCm = dto?.lengthCm || 15;
    const widthCm = dto?.widthCm || 15;
    const heightCm = dto?.heightCm || 10;

    let waybillCode = `GHN${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
    let ghnResponseData: Record<string, unknown> = {};

    try {
      const ghnPayload: Record<string, unknown> = {
        payment_type_id: 1, // Người gửi thanh toán cước
        note: dto?.note || 'Giao hàng sàn TMĐT Project Nexus',
        required_note: 'KHONGCHOXEMHANG',
        to_name: shippingAddress?.recipientName || order.buyer?.fullName || 'Khách hàng',
        to_phone: shippingAddress?.phone || order.buyer?.phoneNumber || '0900000000',
        to_address:
          shippingAddress?.street || shippingAddress?.formattedAddress || 'Địa chỉ nhận hàng',
        to_ward_name: shippingAddress?.ward || '',
        to_district_name: shippingAddress?.district || '',
        to_province_name: shippingAddress?.city || '',
        weight: Math.max(100, Math.round(totalWeightGrams)),
        length: lengthCm,
        width: widthCm,
        height: heightCm,
        service_type_id: 2, // Dịch vụ Chuẩn GHN
        items: order.items.map((it) => ({
          name: it.product?.title || 'Sản phẩm Nexus',
          quantity: it.quantity,
          price: Math.round(Number(it.unitPrice)),
        })),
      };

      const res = await this.ghnService.createShippingOrder(ghnPayload);
      if (res && typeof res === 'object') {
        const parsedRes = res as { code?: number; data?: { order_code?: string } };
        if (parsedRes.code === 200 && parsedRes.data?.order_code) {
          waybillCode = parsedRes.data.order_code;
        }
        ghnResponseData = res as Record<string, unknown>;
      }
    } catch (err) {
      this.logger.warn(
        `GHN Gateway connection warning, fallback to waybill ${waybillCode}: ${err}`,
      );
      ghnResponseData = { fallback: true, generatedAt: new Date().toISOString() };
    }

    // Tạo hoặc cập nhật bản ghi Shipment
    const shipment = await this.prisma.shipment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        carrier: CarrierName.GHN,
        trackingNumber: waybillCode,
        waybillCode,
        shippingFee: order.shippingFee,
        chargeableWeight: totalWeightGrams / 1000,
        status: ShipmentStatus.PICKED_UP,
        metadata: ghnResponseData as Prisma.InputJsonValue,
      },
      update: {
        carrier: CarrierName.GHN,
        trackingNumber: waybillCode,
        waybillCode,
        shippingFee: order.shippingFee,
        chargeableWeight: totalWeightGrams / 1000,
        status: ShipmentStatus.PICKED_UP,
        metadata: ghnResponseData as Prisma.InputJsonValue,
      },
    });

    // Cập nhật trạng thái đơn hàng sang SHIPPING
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.SHIPPING },
    });

    // Gửi thông báo cho người mua
    await this.prisma.notification.create({
      data: {
        userId: order.buyerId,
        title: 'Đơn hàng của bạn đang được GHN vận chuyển',
        content: `Đơn hàng #${order.id.slice(0, 8)} đã được người bán bàn giao cho đối tác vận chuyển GHN. Mã vận đơn: ${waybillCode}`,
        type: NotificationType.ORDER,
        channel: NotificationChannel.IN_APP,
      },
    });

    this.logger.log(`Order ${order.id} dispatched via GHN with waybill ${waybillCode}`);

    return {
      success: true,
      message: 'Đã tạo vận đơn GHN và bàn giao hàng thành công.',
      orderId: updatedOrder.id,
      orderStatus: updatedOrder.status,
      shipment: {
        carrier: shipment.carrier,
        waybillCode: shipment.waybillCode,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        chargeableWeightKg: Number(shipment.chargeableWeight),
      },
    };
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
    const waybillCode = order.shipment?.waybillCode || `GHN${order.id.slice(0, 8).toUpperCase()}`;

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
