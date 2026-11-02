import { BadRequestException, Injectable } from '@nestjs/common';
import { SellerPickupService } from './seller-pickup.service';
import { GhnEnvironment } from './ghn-context';
import { GhnFeeRequest, GhnFeeResponse, GhnLogisticsService } from './ghn-logistics.service';
import { buildGhnParcel, GhnParcel, GhnParcelItem, normalizeGhnWardCode } from './ghn-parcel';

export interface GhnAddress {
  ghnShopId?: number;
  ghnEnvironment?: GhnEnvironment;
  pickupPointId?: string;
  districtId?: number;
  wardCode?: string;
  phone?: string;
  recipientName?: string;
  storeName?: string;
  country?: string;
  city?: string | null;
  district?: string | null;
  ward?: string | null;
  street?: string | null;
  formattedAddress?: string | null;
  latitude?: unknown;
  longitude?: unknown;
}

interface GhnLocationOverrides {
  originAddress?: GhnAddress;
  fromDistrictId?: number;
  fromWardCode?: string;
  toDistrictId?: number;
  toWardCode?: string;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface GhnShippingQuote {
  fee: GhnFeeResponse;
  parcel: GhnParcel;
  origin: GhnAddress | null;
  destination: GhnAddress;
  request: GhnFeeRequest & { shopId: number };
}

@Injectable()
export class GhnShippingService {
  constructor(
    private readonly pickup: SellerPickupService,
    private readonly ghn: GhnLogisticsService,
  ) {}

  async getSenderAddress(sellerId: string): Promise<GhnAddress> {
    const point = await this.pickup.requireVerified(sellerId);
    return {
      pickupPointId: point.id,
      ghnShopId: point.ghnShopId ?? undefined,
      ghnEnvironment: point.environment as GhnEnvironment,
      districtId: point.districtId,
      wardCode: point.wardCode,
      storeName: point.carrierName ?? point.name,
      phone: point.carrierPhone ?? point.phone,
      street: point.carrierAddress ?? point.street,
      formattedAddress: point.carrierAddress ?? point.street,
      city: point.city,
      district: point.district,
      ward: point.ward,
      country: 'VN',
      latitude: point.latitude,
      longitude: point.longitude,
    };
  }

  private async resolveAddress(
    address: GhnAddress,
    label: string,
  ): Promise<{ districtId: number; wardCode: string }> {
    if (!address.city?.trim() || !address.district?.trim() || !address.ward?.trim()) {
      throw new BadRequestException(`${label} phải có đầy đủ tỉnh/thành, quận/huyện và phường/xã.`);
    }
    const location = await this.ghn.resolveDistrictAndWard(
      address.city,
      address.district,
      address.ward,
    );
    if (!location?.districtId || !location.wardCode) {
      throw new BadRequestException(`GHN không xác định được ${label.toLowerCase()}.`);
    }
    return location;
  }

  async prepare(
    sellerId: string | undefined,
    destination: GhnAddress,
    items: GhnParcelItem[],
    overrides: GhnLocationOverrides = {},
  ): Promise<Omit<GhnShippingQuote, 'fee'>> {
    if (
      Boolean(overrides.fromDistrictId) !== Boolean(overrides.fromWardCode) ||
      Boolean(overrides.toDistrictId) !== Boolean(overrides.toWardCode)
    ) {
      throw new BadRequestException('Phải cung cấp cùng lúc mã quận/huyện và mã phường/xã GHN.');
    }
    const origin =
      overrides.originAddress ?? (sellerId ? await this.getSenderAddress(sellerId) : null);
    if (
      !origin?.pickupPointId ||
      !Number.isSafeInteger(origin.ghnShopId) ||
      Number(origin.ghnShopId) <= 0 ||
      !origin.districtId ||
      !origin.wardCode ||
      !origin.ghnEnvironment
    ) {
      throw new BadRequestException('Điểm lấy hàng chưa có cấu hình GHN đã xác minh.');
    }
    if (origin.ghnEnvironment !== this.pickup.environment()) {
      throw new BadRequestException(
        'Điểm GHN thuộc môi trường khác; không thể dùng lẫn sandbox và production.',
      );
    }
    const normalizedOverrideWard = normalizeGhnWardCode(overrides.fromWardCode);
    const normalizedOriginWard = normalizeGhnWardCode(origin.wardCode);
    if (
      (overrides.fromDistrictId && overrides.fromDistrictId !== origin.districtId) ||
      (normalizedOverrideWard && normalizedOverrideWard !== normalizedOriginWard)
    ) {
      throw new BadRequestException('Không được thay điểm gửi khác điểm lấy hàng đã xác minh.');
    }
    for (const address of [origin, destination]) {
      if (address?.country && address.country.toUpperCase() !== 'VN') {
        throw new BadRequestException('Hiện chỉ hỗ trợ giao hàng trong Việt Nam.');
      }
      if (address?.phone && !/^(0|\+?84)\d{9,10}$/.test(address.phone.replace(/[\s.-]/g, ''))) {
        throw new BadRequestException('Địa chỉ giao hàng phải dùng số điện thoại Việt Nam hợp lệ.');
      }
    }
    const from = {
      districtId: origin.districtId,
      wardCode: normalizeGhnWardCode(origin.wardCode)!,
    };
    const to =
      overrides.toDistrictId && overrides.toWardCode
        ? {
            districtId: overrides.toDistrictId,
            wardCode: normalizeGhnWardCode(overrides.toWardCode)!,
          }
        : await this.resolveAddress(destination, 'Địa chỉ nhận hàng');
    const parcel = buildGhnParcel(items);
    for (const key of ['weightGrams', 'lengthCm', 'widthCm', 'heightCm'] as const) {
      const value = overrides[key];
      if (value !== undefined) {
        if (!Number.isSafeInteger(value) || value <= 0) {
          throw new BadRequestException('Thông số kiện hàng GHN không hợp lệ.');
        }
        parcel[key] = value;
      }
    }
    parcel.serviceTypeId = parcel.weightGrams >= 20000 ? 5 : 2;
    const services = await this.ghn.getAvailableServices(
      from.districtId,
      to.districtId,
      origin.ghnShopId,
    );
    const service = services?.find((item) => item.serviceTypeId === parcel.serviceTypeId);
    if (services && !service) {
      throw new BadRequestException(
        'GHN chưa hỗ trợ dịch vụ phù hợp cho tuyến đường và kiện hàng này.',
      );
    }
    const request = {
      ...parcel,
      shopId: Number(origin.ghnShopId),
      fromDistrictId: from?.districtId,
      fromWardCode: normalizeGhnWardCode(from?.wardCode),
      toDistrictId: to.districtId,
      toWardCode: normalizeGhnWardCode(to.wardCode),
      serviceId: service?.serviceId,
    };
    return { parcel, origin, destination, request };
  }

  async quote(
    sellerId: string | undefined,
    destination: GhnAddress,
    items: GhnParcelItem[],
    overrides: GhnLocationOverrides = {},
  ): Promise<GhnShippingQuote> {
    const shipment = await this.prepare(sellerId, destination, items, overrides);
    const fee = await this.ghn.calculateFee(shipment.request);
    return { ...shipment, fee };
  }
}
