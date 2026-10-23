import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DistanceService } from './distance.service';
import { GhnLogisticsService } from './ghn-logistics.service';
import { ShippingQuoteDto } from '../dtos/shipping-quote.dto';

export interface ShippingQuoteResult {
  origin: {
    name: string;
    latitude: number;
    longitude: number;
    addressText?: string;
  };
  destination: {
    recipientName?: string;
    latitude: number;
    longitude: number;
    addressText?: string;
  };
  metrics: {
    distanceKm: number;
    durationMinutes: number;
    chargeableWeightKg: number;
    calculationMethod: 'OSRM_ROUTING' | 'HAVERSINE_ESTIMATION';
  };
  rates: {
    baseFee: number;
    distanceFee: number;
    weightFee: number;
    distanceTotalFee: number;
    ghnCarrierFee: number | null;
    finalShippingFee: number;
  };
  escrowPreview: {
    platformFeeRate: number;
    platformFeeExampleOn100k: number;
    ruleSummary: string;
  };
}

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  // Tọa độ kho hàng mặc định WH_001 tại TP.HCM (Quận 1)
  private readonly DEFAULT_WAREHOUSE_LAT = 10.7769;
  private readonly DEFAULT_WAREHOUSE_LON = 106.7009;

  constructor(
    private readonly prisma: PrismaService,
    private readonly distanceService: DistanceService,
    private readonly ghnService: GhnLogisticsService,
  ) {}

  /**
   * Tính báo giá cước vận chuyển linh hoạt (Dynamic Shipping Rate Quotation)
   * Kết hợp đo cự ly thực tế (OSRM/Haversine) và đối soát cước GHN Express
   */
  async calculateShippingQuote(
    userId: string,
    dto: ShippingQuoteDto,
  ): Promise<ShippingQuoteResult> {
    // 1. Xác định tọa độ điểm xuất phát (Origin)
    let originLat = dto.originLatitude;
    let originLon = dto.originLongitude;
    let originName = 'Kho xuất hàng trung tâm (WH_001)';
    let originAddressText = 'TP. Hồ Chí Minh';

    if (originLat === undefined || originLon === undefined) {
      if (dto.sellerId) {
        // Tìm gian hàng của Seller từ yêu cầu nâng cấp được duyệt
        const sellerRequest = await this.prisma.sellerUpgradeRequest.findFirst({
          where: { userId: dto.sellerId, status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
        });

        if (sellerRequest && sellerRequest.latitude && sellerRequest.longitude) {
          originLat = Number(sellerRequest.latitude);
          originLon = Number(sellerRequest.longitude);
          originName = `Gian hàng ${sellerRequest.storeName}`;
          originAddressText =
            sellerRequest.formattedAddress ||
            `${sellerRequest.street}, ${sellerRequest.ward}, ${sellerRequest.district}, ${sellerRequest.city}`;
        }
      }

      if (originLat === undefined || originLon === undefined) {
        // Sử dụng kho mặc định WH_001
        const warehouse = await this.prisma.warehouse.findFirst({
          where: dto.warehouseId ? { id: dto.warehouseId } : { code: 'WH_001' },
        });

        if (warehouse && warehouse.latitude && warehouse.longitude) {
          originLat = Number(warehouse.latitude);
          originLon = Number(warehouse.longitude);
          originName = warehouse.name;
          originAddressText = warehouse.address || originAddressText;
        } else {
          originLat = this.DEFAULT_WAREHOUSE_LAT;
          originLon = this.DEFAULT_WAREHOUSE_LON;
        }
      }
    }

    // 2. Xác định tọa độ điểm nhận hàng (Destination)
    let destLat = dto.destLatitude;
    let destLon = dto.destLongitude;
    let destRecipient = 'Người nhận';
    let destAddressText = 'Địa chỉ giao hàng';

    if (destLat === undefined || destLon === undefined) {
      let address;
      if (dto.addressId) {
        address = await this.prisma.userAddress.findUnique({
          where: { id: dto.addressId },
        });
      } else {
        // Lấy địa chỉ mặc định của Buyer
        address = await this.prisma.userAddress.findFirst({
          where: { userId, isDefault: true },
        });
        if (!address) {
          address = await this.prisma.userAddress.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      if (address) {
        destRecipient = address.recipientName;
        destAddressText =
          address.formattedAddress ||
          `${address.street}, ${address.ward || ''}, ${address.district || ''}, ${address.city}`;

        if (address.latitude && address.longitude) {
          destLat = Number(address.latitude);
          destLon = Number(address.longitude);
        }
      }
    }

    if (destLat === undefined || destLon === undefined) {
      throw new BadRequestException(
        'Không thể xác định tọa độ giao hàng. Vui lòng cung cấp tọa độ hoặc chọn sổ địa chỉ nhận hàng.',
      );
    }

    // 3. Tính toán trọng lượng quy đổi (Chargeable Weight)
    let totalActualGrams = 0;
    let maxVolumetricGrams = 0;

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const qty = item.quantity || 1;

        // Nếu DTO chưa có kích thước thì truy vấn từ Product
        let weight = item.weightGrams;
        let length = item.lengthCm;
        let width = item.widthCm;
        let height = item.heightCm;

        if (weight === undefined || length === undefined) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: {
              weightGrams: true,
              lengthCm: true,
              widthCm: true,
              heightCm: true,
            },
          });
          if (product) {
            weight = product.weightGrams;
            length = product.lengthCm;
            width = product.widthCm;
            height = product.heightCm;
          }
        }

        const itemWeight = (weight || 500) * qty;
        totalActualGrams += itemWeight;

        const itemVolumetricKg = (((length || 10) * (width || 10) * (height || 10)) / 5000) * qty;
        maxVolumetricGrams += itemVolumetricKg * 1000;
      }
    } else {
      totalActualGrams = 500;
    }

    const chargeableWeightKg = this.distanceService.calculateChargeableWeight(
      Math.max(totalActualGrams, maxVolumetricGrams),
      10,
      10,
      10,
    );

    // 4. Đo cự ly và tính cước theo khoảng cách (Distance Routing)
    const distanceResult = await this.distanceService.computeDistanceAndFee(
      originLat,
      originLon,
      destLat,
      destLon,
      chargeableWeightKg,
    );

    // 5. Thử tính cước GHN Express trực tiếp (nếu có đủ mã quận/phường)
    let ghnFee: number | null = null;
    if (dto.fromDistrictId && dto.toDistrictId && dto.toWardCode) {
      const ghnRes = await this.ghnService.calculateFee({
        fromDistrictId: dto.fromDistrictId,
        fromWardCode: dto.fromWardCode,
        toDistrictId: dto.toDistrictId,
        toWardCode: dto.toWardCode,
        weightGrams: totalActualGrams,
      });
      if (ghnRes) {
        ghnFee = ghnRes.total;
      }
    }

    // Phí vận chuyển cuối cùng áp dụng: ưu tiên GHN nếu cự ly xa (>30km) hoặc lấy cước khoảng cách
    let finalShippingFee = distanceResult.totalFee;
    if (ghnFee && distanceResult.distanceKm > 30) {
      finalShippingFee = ghnFee;
    }

    return {
      origin: {
        name: originName,
        latitude: originLat,
        longitude: originLon,
        addressText: originAddressText,
      },
      destination: {
        recipientName: destRecipient,
        latitude: destLat,
        longitude: destLon,
        addressText: destAddressText,
      },
      metrics: {
        distanceKm: distanceResult.distanceKm,
        durationMinutes: distanceResult.durationMinutes,
        chargeableWeightKg,
        calculationMethod: distanceResult.method,
      },
      rates: {
        baseFee: distanceResult.baseFee,
        distanceFee: distanceResult.distanceFee,
        weightFee: distanceResult.weightFee,
        distanceTotalFee: distanceResult.totalFee,
        ghnCarrierFee: ghnFee,
        finalShippingFee,
      },
      escrowPreview: {
        platformFeeRate: 7.0,
        platformFeeExampleOn100k: 7000,
        ruleSummary:
          'Tổng thanh toán = Tạm tính + Phí giao hàng. Tiền được ký quỹ Escrow HELD và giải ngân khi xác nhận giao hàng.',
      },
    };
  }
}
