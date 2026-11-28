import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { effectivePrice } from '../../../core/domain/product-price';
import { ShippingQuoteInput } from '../dtos/shipping-quote.dto';
import { GhnAddress, GhnShippingQuote, GhnShippingService } from './ghn-shipping.service';
import { RouteDistance, RouteDistanceService } from './route-distance.service';

export interface ShippingQuoteResult {
  carrier: string;
  feeSource: string;
  origin: { name: string; latitude: number | null; longitude: number | null; addressText: string };
  destination: {
    recipientName?: string;
    latitude: number | null;
    longitude: number | null;
    addressText: string;
  };
  metrics: {
    distanceKm: number | null;
    durationMinutes: number | null;
    actualWeightKg: number;
    calculationMethod: RouteDistance['method'] | null;
  };
  rates: {
    baseFee: number;
    insuranceFee: number;
    codFee: number;
    r2sFee: number;
    ghnCarrierFee: number;
    finalShippingFee: number;
    distanceFee: number;
    weightFee: number;
  };
  serviceTypeId?: number;
  parcel: GhnShippingQuote['parcel'];
}

@Injectable()
export class FulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RouteDistanceService,
    private readonly shipping: GhnShippingService,
  ) {}

  async calculateShippingQuote(
    userId: string,
    dto: ShippingQuoteInput,
  ): Promise<ShippingQuoteResult> {
    const address = dto.addressId
      ? await this.prisma.userAddress.findUnique({ where: { id: dto.addressId } })
      : await this.prisma.userAddress.findFirst({
          where: { userId, isDefault: true },
        });
    if (dto.addressId && !address) throw new NotFoundException('Shipping address not found.');
    if (address && address.userId !== userId) {
      throw new ForbiddenException('You do not have permission to use this shipping address.');
    }
    if (!dto.items.length) throw new BadRequestException('Select items to quote shipping.');
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((item) => item.productId) } },
    });
    const sellers = new Set(products.map((product) => product.sellerId));
    if (sellers.size !== 1 || (dto.sellerId && !sellers.has(dto.sellerId))) {
      throw new BadRequestException('Each GHN quote applies to a single seller only.');
    }
    const sellerId = dto.sellerId ?? products[0]?.sellerId;
    const items = dto.items.map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) throw new NotFoundException('Product to ship not found.');
      return {
        name: product.title,
        quantity: item.quantity ?? 1,
        weight: product.weightGrams,
        length: product.lengthCm,
        width: product.widthCm,
        height: product.heightCm,
        price: effectivePrice(product),
      };
    });
    const quote = await this.shipping.quote(sellerId, address ?? {}, items, dto);
    const origin = quote.origin;
    const destination: GhnAddress = address ?? {};
    const coordinate = (value: unknown): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const number = Number(value);
      return Number.isFinite(number) ? number : undefined;
    };
    const originLat = dto.originLatitude ?? coordinate(origin?.latitude);
    const originLon = dto.originLongitude ?? coordinate(origin?.longitude);
    const destLat = dto.destLatitude ?? coordinate(destination.latitude);
    const destLon = dto.destLongitude ?? coordinate(destination.longitude);
    const route =
      originLat !== undefined &&
      originLon !== undefined &&
      destLat !== undefined &&
      destLon !== undefined
        ? await this.routing.getRoadDistanceAndDuration(originLat, originLon, destLat, destLon)
        : null;
    return {
      carrier: 'GHN',
      feeSource: 'GHN_API',
      origin: {
        name: 'Seller pickup address',
        latitude: originLat ?? null,
        longitude: originLon ?? null,
        addressText: origin?.formattedAddress ?? origin?.street ?? '',
      },
      destination: {
        recipientName: address?.recipientName,
        latitude: destLat ?? null,
        longitude: destLon ?? null,
        addressText: destination.formattedAddress ?? destination.street ?? '',
      },
      metrics: {
        distanceKm: route?.distanceKm ?? null,
        durationMinutes: route?.durationMinutes ?? null,
        actualWeightKg: quote.parcel.weightGrams / 1000,
        calculationMethod: route?.method ?? null,
      },
      rates: {
        baseFee: quote.fee.serviceFee,
        insuranceFee: quote.fee.insuranceFee,
        codFee: quote.fee.codFee,
        r2sFee: quote.fee.r2sFee,
        ghnCarrierFee: quote.fee.total,
        finalShippingFee: quote.fee.total,
        distanceFee: 0,
        weightFee: 0,
      },
      serviceTypeId: quote.request.serviceTypeId,
      parcel: quote.parcel,
    };
  }
}
