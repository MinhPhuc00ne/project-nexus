import { Injectable, Logger } from '@nestjs/common';
import { CalculateShippingDto } from '../dtos';
import { ShippingCalculationResult, ShippingType } from '../interfaces/shipping-result.interface';
import { GhnLogisticsService } from '../../fulfillment/services/ghn-logistics.service';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  // Các hằng số tham số hệ thống theo quy chuẩn giao hàng
  private readonly DOMESTIC_BASE_FEE = 15500; // Pnền tiêu chuẩn GHN (đã gồm VAT)
  private readonly DOMESTIC_BASE_WEIGHT_KG = 1; // Wchuẩn (1kg đầu tiên)
  private readonly DOMESTIC_OVERWEIGHT_FEE_PER_KG = 5000; // Pvượt cân (mỗi kg tiếp theo)
  private readonly DOMESTIC_KM_FEE = 500; // Pkm (cho khoảng cách > 10km)

  private readonly INT_BASE_FEE = 200000; // Pnền_INT (~$8)
  private readonly INT_KG_FEE = 80000; // Pkg_INT
  private readonly INT_KM_FEE_PER_100KM = 2000; // Pkm_INT

  private readonly CUSTOMS_TAX_RATE = 0.1; // 10% VAT / Thuế nhập khẩu tổng hợp
  private readonly CUSTOMS_PROCESS_FEE = 50000; // Phí thủ tục hải quan

  constructor(private readonly ghnService: GhnLogisticsService) {}

  /**
   * Phân loại luồng dựa vào SĐT (+84, 84 hoặc 0 -> DOMESTIC, còn lại INTERNATIONAL)
   */
  public checkShippingType(phoneNumber: string): ShippingType {
    const cleanPhone = phoneNumber ? phoneNumber.trim().replace(/[\s.-]/g, '') : '';
    if (cleanPhone.startsWith('+84') || cleanPhone.startsWith('84') || cleanPhone.startsWith('0')) {
      return 'DOMESTIC';
    }
    return 'INTERNATIONAL';
  }

  /**
   * Tính Trọng lượng tính phí chuẩn logistics (Chargeable Weight - W)
   * W = max(W_thực, (D * R * C) / 5000)
   */
  public calculateChargeableWeight(
    actualWeightKg: number,
    lengthCm: number,
    widthCm: number,
    heightCm: number,
  ): number {
    const safeLength = Math.max(1, lengthCm || 10);
    const safeWidth = Math.max(1, widthCm || 10);
    const safeHeight = Math.max(1, heightCm || 10);
    const volumetricWeight = (safeLength * safeWidth * safeHeight) / 5000;
    return Math.max(actualWeightKg, volumetricWeight);
  }

  /**
   * Tính tổng cước phí vận chuyển chuẩn web giao hàng (GHN Express & Quốc tế)
   */
  public async calculateShippingFee(dto: CalculateShippingDto): Promise<ShippingCalculationResult> {
    const shippingType = this.checkShippingType(dto.phoneNumber);
    const chargeableWeight = this.calculateChargeableWeight(
      dto.actualWeightKg,
      dto.lengthCm,
      dto.widthCm,
      dto.heightCm,
    );

    // 1. Luồng nội địa: Ưu tiên gọi cổng tính phí chính thức của Giao Hàng Nhanh (GHN)
    if (shippingType === 'DOMESTIC') {
      if (dto.toDistrictId && dto.toWardCode) {
        try {
          const ghnRes = await this.ghnService.calculateFee({
            toDistrictId: dto.toDistrictId,
            toWardCode: dto.toWardCode,
            fromDistrictId: dto.fromDistrictId,
            fromWardCode: dto.fromWardCode,
            weightGrams: Math.max(100, Math.round(chargeableWeight * 1000)),
            lengthCm: Math.max(5, dto.lengthCm || 10),
            widthCm: Math.max(5, dto.widthCm || 10),
            heightCm: Math.max(5, dto.heightCm || 10),
            insuranceValue: dto.declaredValueVnd || 0,
            serviceTypeId: dto.serviceTypeId || 2,
          });

          if (ghnRes) {
            return {
              shippingType: 'DOMESTIC',
              carrier: 'Giao Hàng Nhanh (GHN Express)',
              chargeableWeightKg: Number(chargeableWeight.toFixed(2)),
              breakdown: {
                baseFee: ghnRes.serviceFee,
                overweightFee: 0,
                distanceFee: 0,
                insuranceFee: ghnRes.insuranceFee,
                codFee: ghnRes.codFee,
                r2sFee: ghnRes.r2sFee,
              },
              totalFeeVnd: ghnRes.total,
            };
          }
        } catch (err) {
          this.logger.warn(
            `GHN API fee query error, fallback to domestic rules: ${(err as Error).message}`,
          );
        }
      }

      return this.calculateDomesticShipping(
        chargeableWeight,
        dto.distanceKm,
        dto.declaredValueVnd ?? 0,
      );
    }

    // 2. Luồng ngoại quốc: Vận chuyển quốc tế + Thuế & Phí thủ tục hải quan
    return this.calculateInternationalShipping(
      chargeableWeight,
      dto.distanceKm,
      dto.declaredValueVnd ?? 0,
    );
  }

  /**
   * Tính phí Ship Nội Quốc (Domestic) theo quy chuẩn biểu cước chuẩn
   */
  private calculateDomesticShipping(
    weightKg: number,
    distanceKm: number,
    declaredValueVnd: number = 0,
  ): ShippingCalculationResult {
    const baseFee = this.DOMESTIC_BASE_FEE;

    // Phí vượt cân (làm tròn nấc kg theo chuẩn vận chuyển)
    const rawOverweightKg = Math.max(0, weightKg - this.DOMESTIC_BASE_WEIGHT_KG);
    const overweightKg = Math.ceil(rawOverweightKg);
    const overweightFee = overweightKg * this.DOMESTIC_OVERWEIGHT_FEE_PER_KG;

    // Phí khoảng cách (cho cự ly vượt 10km)
    const extraDistanceKm = Math.max(0, distanceKm - 10);
    const distanceFee = Math.round(extraDistanceKm * this.DOMESTIC_KM_FEE);

    // Phí bảo hiểm hàng hóa (>1.000.000 VNĐ thu 0.5% theo chuẩn GHN)
    let insuranceFee = 0;
    if (declaredValueVnd > 1000000) {
      insuranceFee = Math.round((declaredValueVnd - 1000000) * 0.005);
    }

    const rawTotal = baseFee + overweightFee + distanceFee + insuranceFee;
    const totalFeeVnd = Math.ceil(rawTotal / 1000) * 1000;

    return {
      shippingType: 'DOMESTIC',
      carrier: 'Project Nexus Logistics Standard',
      chargeableWeightKg: Number(weightKg.toFixed(2)),
      breakdown: {
        baseFee,
        overweightFee,
        distanceFee,
        insuranceFee,
      },
      totalFeeVnd,
    };
  }

  /**
   * Tính phí Ship Ngoại Quốc (International) + Thuế Hải Quan
   */
  private calculateInternationalShipping(
    weightKg: number,
    distanceKm: number,
    itemValueVnd: number,
  ): ShippingCalculationResult {
    // 1. Phí ship quốc tế
    const baseFee = this.INT_BASE_FEE;
    const overweightFee = Math.round(weightKg * this.INT_KG_FEE);
    const distanceFee = Math.round((distanceKm / 100) * this.INT_KM_FEE_PER_100KM);
    const intShippingFee = baseFee + overweightFee + distanceFee;

    // 2. Thuế hải quan = (Giá trị hàng * 10%) + Phí thủ tục (50.000 VNĐ)
    const customsDuty = Math.round(itemValueVnd * this.CUSTOMS_TAX_RATE);
    const customsProcessFee = this.CUSTOMS_PROCESS_FEE;
    const customsFee = customsDuty + customsProcessFee;

    const totalFeeVnd = intShippingFee + customsFee;

    return {
      shippingType: 'INTERNATIONAL',
      carrier: 'Nexus Cross-Border Express',
      chargeableWeightKg: Number(weightKg.toFixed(2)),
      breakdown: {
        baseFee,
        overweightFee,
        distanceFee,
        customsDuty,
        customsProcessFee,
        customsFee,
      },
      totalFeeVnd: Math.round(totalFeeVnd),
    };
  }
}
