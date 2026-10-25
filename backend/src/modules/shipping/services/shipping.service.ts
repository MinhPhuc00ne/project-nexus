import { Injectable } from '@nestjs/common';
import { CalculateShippingDto } from '../dtos';
import { ShippingCalculationResult, ShippingType } from '../interfaces/shipping-result.interface';

@Injectable()
export class ShippingService {
  // Các hằng số tham số hệ thống
  private readonly DOMESTIC_BASE_FEE = 15000; // Pnền
  private readonly DOMESTIC_BASE_WEIGHT_KG = 1; // Wchuẩn
  private readonly DOMESTIC_OVERWEIGHT_FEE_PER_KG = 5000; // Pvượt cân
  private readonly DOMESTIC_KM_FEE = 500; // Pkm (cho khoảng cách > 10km)

  private readonly INT_BASE_FEE = 200000; // Pnền_INT (~$8)
  private readonly INT_KG_FEE = 80000; // Pkg_INT
  private readonly INT_KM_FEE_PER_100KM = 2000; // Pkm_INT

  private readonly CUSTOMS_TAX_RATE = 0.1; // 10% VAT / Thuế nhập khẩu tổng hợp
  private readonly CUSTOMS_PROCESS_FEE = 50000; // Phí thủ tục hải quan

  /**
   * Phân loại luồng dựa vào SĐT (+84 hoặc 0 -> DOMESTIC, còn lại INTERNATIONAL)
   */
  public checkShippingType(phoneNumber: string): ShippingType {
    const cleanPhone = phoneNumber.trim();
    if (cleanPhone.startsWith('+84') || cleanPhone.startsWith('0')) {
      return 'DOMESTIC';
    }
    return 'INTERNATIONAL';
  }

  /**
   * Tính Trọng lượng tính phí (Chargeable Weight - W)
   * W = max(W_thực, (D * R * C) / 5000)
   */
  public calculateChargeableWeight(
    actualWeightKg: number,
    lengthCm: number,
    widthCm: number,
    heightCm: number,
  ): number {
    const volumetricWeight = (lengthCm * widthCm * heightCm) / 5000;
    return Math.max(actualWeightKg, volumetricWeight);
  }

  /**
   * Tính tổng cước phí vận chuyển và hải quan
   */
  public calculateShippingFee(dto: CalculateShippingDto): ShippingCalculationResult {
    const shippingType = this.checkShippingType(dto.phoneNumber);
    const chargeableWeight = this.calculateChargeableWeight(
      dto.actualWeightKg,
      dto.lengthCm,
      dto.widthCm,
      dto.heightCm,
    );

    if (shippingType === 'DOMESTIC') {
      return this.calculateDomesticShipping(chargeableWeight, dto.distanceKm);
    }

    return this.calculateInternationalShipping(
      chargeableWeight,
      dto.distanceKm,
      dto.declaredValueVnd ?? 0,
    );
  }

  /**
   * Tính phí Ship Nội Quốc (Domestic)
   */
  private calculateDomesticShipping(
    weightKg: number,
    distanceKm: number,
  ): ShippingCalculationResult {
    const baseFee = this.DOMESTIC_BASE_FEE;

    // Phí vượt cân (chỉ tính khối lượng vượt quá W_chuẩn)
    const overweightKg = Math.max(0, weightKg - this.DOMESTIC_BASE_WEIGHT_KG);
    const overweightFee = overweightKg * this.DOMESTIC_OVERWEIGHT_FEE_PER_KG;

    // Phí khoảng cách (chỉ tính nếu K > 10 km)
    const extraDistanceKm = Math.max(0, distanceKm - 10);
    const distanceFee = extraDistanceKm * this.DOMESTIC_KM_FEE;

    const totalFeeVnd = baseFee + overweightFee + distanceFee;

    return {
      shippingType: 'DOMESTIC',
      chargeableWeightKg: Number(weightKg.toFixed(2)),
      breakdown: {
        baseFee,
        overweightFee,
        distanceFee,
      },
      totalFeeVnd: Math.round(totalFeeVnd),
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
    const overweightFee = weightKg * this.INT_KG_FEE;
    const distanceFee = (distanceKm / 100) * this.INT_KM_FEE_PER_100KM;
    const intShippingFee = baseFee + overweightFee + distanceFee;

    // 2. Thuế hải quan = (Giá trị hàng * 10%) + Phí thủ tục (50.000 VNĐ)
    const customsDuty = itemValueVnd * this.CUSTOMS_TAX_RATE;
    const customsProcessFee = this.CUSTOMS_PROCESS_FEE;
    const customsFee = customsDuty + customsProcessFee;

    const totalFeeVnd = intShippingFee + customsFee;

    return {
      shippingType: 'INTERNATIONAL',
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
