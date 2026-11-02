import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CarrierName,
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  Prisma,
  ShipmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { productChoiceLabel } from '../../catalog/utils/product-options';
import { DispatchGhnOrderDto } from '../../commerce/dtos/seller-order.dto';
import { GhnAddress, GhnShippingQuote, GhnShippingService } from './ghn-shipping.service';
import { GhnParcel, normalizeGhnWardCode } from './ghn-parcel';
import { shipmentGhnContext } from './ghn-context';
import { GhnLogisticsService } from './ghn-logistics.service';
import { GhnOrderApiService } from './ghn-order-api.service';
import { GhnCreateRejectedException } from './ghn-create-error';
import { GhnParcelItem } from './ghn-parcel';
import { objectValue } from './shipment-state';

type DispatchOrder = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } }; shipment: true; payments: true };
}>;

export interface GhnDispatchResult {
  success: boolean;
  message: string;
  orderId: string;
  orderStatus: OrderStatus;
  shipment: {
    carrier: CarrierName;
    waybillCode: string | null;
    trackingNumber: string | null;
    status: ShipmentStatus;
    chargeableWeightKg: number;
  };
}

export interface GhnDispatchPreview {
  carrier: string;
  buyerShippingFee: number;
  carrierFee: number;
  difference: number;
  differencePayer: string;
  parcel: GhnParcel;
}

@Injectable()
export class GhnDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: GhnShippingService,
    private readonly ghn: GhnLogisticsService,
    private readonly orders: GhnOrderApiService,
  ) {}

  async label(
    sellerId: string,
    orderId: string,
  ): Promise<{
    orderId: string;
    waybillCode: string;
    urls: Awaited<ReturnType<GhnOrderApiService['label']>>;
  }> {
    const order = await this.load(sellerId, orderId);
    if (!order.shipment?.waybillCode) throw new BadRequestException('Chưa có vận đơn GHN để in.');
    const context = shipmentGhnContext(order.shipment.metadata);
    const urls = await this.orders.label(
      order.shipment.waybillCode,
      context.shopId,
      context.environment,
    );
    return { orderId, waybillCode: order.shipment.waybillCode, urls };
  }

  private async load(sellerId: string, orderId: string): Promise<DispatchOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, shipment: true, payments: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.sellerId !== sellerId)
      throw new ForbiddenException('Bạn không có quyền gửi đơn hàng này.');
    return order;
  }

  private async quote(order: DispatchOrder, dto?: DispatchGhnOrderDto): Promise<GhnShippingQuote> {
    const address = objectValue(order.shippingAddressSnapshot);
    const frozen = objectValue(address.ghn);
    const frozenParcel = objectValue(frozen.parcel);
    const request = objectValue(frozen.request);
    const items: GhnParcelItem[] = Array.isArray(frozenParcel.items)
      ? (frozenParcel.items as GhnParcelItem[])
      : order.items.map(({ product, quantity, unitPrice, selections }) => ({
          name: productChoiceLabel(product.title, selections),
          quantity,
          weight: product.weightGrams,
          length: product.lengthCm,
          width: product.widthCm,
          height: product.heightCm,
          price: Number(unitPrice),
        }));
    return this.shipping.quote(order.sellerId, address as GhnAddress, items, {
      fromDistrictId: request.fromDistrictId as number | undefined,
      fromWardCode: request.fromWardCode as string | undefined,
      toDistrictId: request.toDistrictId as number | undefined,
      toWardCode: request.toWardCode as string | undefined,
      originAddress: frozen.origin ? (objectValue(frozen.origin) as GhnAddress) : undefined,
      ...dto,
    });
  }

  async preview(
    sellerId: string,
    orderId: string,
    dto?: DispatchGhnOrderDto,
  ): Promise<GhnDispatchPreview> {
    const order = await this.load(sellerId, orderId);
    if (![OrderStatus.PAID, OrderStatus.PREPARING].includes(order.status as 'PAID' | 'PREPARING')) {
      throw new BadRequestException(
        'Chỉ báo giá gửi hàng cho đơn đã thanh toán hoặc đang chuẩn bị.',
      );
    }
    const quote = await this.quote(order, dto);
    return {
      carrier: 'GHN',
      buyerShippingFee: Number(order.shippingFee),
      carrierFee: quote.fee.total,
      difference: quote.fee.total - Number(order.shippingFee),
      differencePayer: 'SELLER',
      parcel: quote.parcel,
    };
  }

  async dispatch(
    sellerId: string,
    orderId: string,
    dto?: DispatchGhnOrderDto,
  ): Promise<GhnDispatchResult> {
    const order = await this.load(sellerId, orderId);
    if (order.shipment?.waybillCode) {
      const saved = objectValue(order.shipment.metadata);
      if (
        saved.code !== 200 ||
        saved.fallback ||
        objectValue(saved.data).order_code !== order.shipment.waybillCode
      ) {
        throw new ConflictException(
          'Vận đơn cũ chưa được GHN xác minh. Cần kiểm tra trước khi gửi hàng.',
        );
      }
      return this.result(order, order.shipment);
    }
    if (
      objectValue(order.shipment?.metadata).dispatchState &&
      objectValue(order.shipment?.metadata).dispatchState !== 'REJECTED'
    ) {
      throw new ConflictException(
        'Yêu cầu gửi hàng đã được ghi nhận. Hãy đối soát GHN trước khi gửi lại.',
      );
    }
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException(
        'Đơn hàng phải đã thanh toán hoặc đang chuẩn bị trước khi gửi GHN.',
      );
    }
    const quote = await this.quote(order, dto);
    const { origin, parcel, request } = quote;
    const address = objectValue(order.shippingAddressSnapshot);
    if (
      !origin?.phone ||
      !(origin.street || origin.formattedAddress) ||
      !address.phone ||
      !address.street ||
      !address.recipientName
    ) {
      throw new BadRequestException('Thiếu thông tin liên hệ hoặc địa chỉ gửi/nhận hàng.');
    }
    const isCodOrder = order.payments?.some((p) => p.provider === PaymentProvider.COD);
    const codAmount = isCodOrder ? Math.round(Number(order.totalAmount)) : 0;
    const clientOrderCode = `NX-${order.id}`;
    const payload = {
      client_order_code: clientOrderCode,
      payment_type_id: 1,
      cod_amount: codAmount,
      required_note: 'KHONGCHOXEMHANG',
      note: dto?.note || 'Giao hàng Project Nexus',
      to_name: address.recipientName,
      to_phone: address.phone,
      to_address: address.street,
      from_name: origin.storeName || origin.recipientName || 'Người bán Nexus',
      from_phone: origin.phone,
      from_address: origin.street || origin.formattedAddress,
      from_district_id: request.fromDistrictId,
      from_ward_code: normalizeGhnWardCode(request.fromWardCode),
      to_district_id: request.toDistrictId,
      to_ward_code: normalizeGhnWardCode(request.toWardCode),
      weight: parcel.weightGrams,
      length: parcel.lengthCm,
      width: parcel.widthCm,
      height: parcel.heightCm,
      service_type_id: request.serviceTypeId,
      service_id: request.serviceId,
      insurance_value: parcel.insuranceValue,
      items: parcel.items,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
      const current = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { shipment: true, afterSales: true },
      });
      if (current.afterSales && current.afterSales.status !== 'REJECTED')
        throw new ConflictException('Đơn đang có yêu cầu hủy/trả hàng.');
      const state = objectValue(current.shipment?.metadata).dispatchState;
      if (
        current.shipment?.waybillCode ||
        (state && state !== 'REJECTED') ||
        (current.status !== OrderStatus.PAID && current.status !== OrderStatus.PREPARING)
      ) {
        throw new ConflictException('Đơn đã được gửi hoặc đang chờ GHN xác nhận.');
      }
      const metadata = {
        dispatchState: 'CREATING',
        clientOrderCode,
        requestedAt: new Date().toISOString(),
        quotedCarrierFee: quote.fee.total,
        ghnShopId: request.shopId,
        ghnEnvironment: origin.ghnEnvironment,
        pickupPointId: origin.pickupPointId,
        differencePayer: 'SELLER',
        parcel,
        payload,
      };
      const data = {
        carrier: CarrierName.GHN,
        shippingFee: order.shippingFee,
        chargeableWeight: parcel.weightGrams / 1000,
        status: ShipmentStatus.CREATED,
        metadata: metadata as unknown as Prisma.InputJsonValue,
      };
      await tx.shipment.upsert({ where: { orderId }, create: { orderId, ...data }, update: data });
    });
    let response: unknown;
    try {
      response = await this.ghn.createShippingOrder(payload, request.shopId);
      const body = objectValue(response);
      const data = objectValue(body.data);
      if (body.code !== 200 || typeof data.order_code !== 'string' || !data.order_code.trim()) {
        throw new BadGatewayException(
          'GHN chưa xác nhận mã vận đơn. Hãy đối soát trước khi gửi lại.',
        );
      }
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
        const shipment = await tx.shipment.findUniqueOrThrow({ where: { orderId } });
        if (!shipment.waybillCode)
          await tx.shipment.update({
            where: { orderId },
            data: {
              metadata: {
                ...objectValue(shipment.metadata),
                dispatchState: error instanceof GhnCreateRejectedException ? 'REJECTED' : 'UNKNOWN',
              } as Prisma.InputJsonValue,
            },
          });
      });
      throw error;
    }
    return this.save(order, objectValue(response));
  }

  async reconcile(sellerId: string, orderId: string): Promise<GhnDispatchResult> {
    const order = await this.load(sellerId, orderId);
    if (order.shipment?.waybillCode) return this.result(order, order.shipment);
    const metadata = objectValue(order.shipment?.metadata);
    if (!metadata.clientOrderCode)
      throw new BadRequestException('Chưa có yêu cầu tạo vận đơn cần đối soát.');
    const context = shipmentGhnContext(metadata);
    const detail = await this.orders.byClientCode(
      String(metadata.clientOrderCode),
      context.shopId,
      context.environment,
    );
    return this.save(order, {
      code: 200,
      data: { order_code: detail.order_code },
      recoveredFromGhn: true,
    });
  }

  private async save(
    order: DispatchOrder,
    response: Record<string, unknown>,
  ): Promise<GhnDispatchResult> {
    const data = objectValue(response.data);
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
      const current = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { shipment: true, afterSales: true },
      });
      if (!current.shipment) throw new ConflictException('Không tìm thấy yêu cầu gửi hàng đã lưu.');
      if (current.shipment.waybillCode) return { order: current, shipment: current.shipment };
      const metadata = objectValue(current.shipment.metadata);
      const confirmedFee =
        Number.isSafeInteger(data.total_fee) && Number(data.total_fee) >= 0
          ? Number(data.total_fee)
          : null;
      const shipment = await tx.shipment.update({
        where: { orderId: order.id },
        data: {
          waybillCode: String(data.order_code),
          trackingNumber: String(data.order_code),
          status: ShipmentStatus.CREATED,
          metadata: {
            ...metadata,
            ...response,
            dispatchState: 'CONFIRMED',
            actualCarrierFee: confirmedFee,
            feeDifference: confirmedFee === null ? null : confirmedFee - Number(order.shippingFee),
          } as Prisma.InputJsonValue,
        },
      });
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: current.status === OrderStatus.PAID ? OrderStatus.PREPARING : current.status,
        },
      });
      await tx.notification.create({
        data: {
          userId: order.buyerId,
          type: NotificationType.ORDER,
          channel: NotificationChannel.IN_APP,
          title: 'Đã tạo vận đơn GHN',
          content: `Đơn #${order.id.slice(0, 8)} có vận đơn ${shipment.waybillCode}, đang chờ GHN lấy hàng.`,
        },
      });
      return { order: updated, shipment };
    });
    return this.result(result.order, result.shipment);
  }

  private result(
    order: { id: string; status: OrderStatus },
    shipment: {
      carrier: CarrierName;
      waybillCode: string | null;
      trackingNumber: string | null;
      status: ShipmentStatus;
      chargeableWeight: Prisma.Decimal;
    },
  ): GhnDispatchResult {
    return {
      success: true,
      message: 'Vận đơn đã được GHN xác nhận; trạng thái lấy hàng được đồng bộ riêng.',
      orderId: order.id,
      orderStatus: order.status,
      shipment: {
        carrier: shipment.carrier,
        waybillCode: shipment.waybillCode,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        chargeableWeightKg: Number(shipment.chargeableWeight),
      },
    };
  }
}
