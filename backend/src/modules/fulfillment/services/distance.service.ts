import { Injectable, Logger } from '@nestjs/common';

export interface DistanceCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  method: 'OSRM_ROUTING' | 'HAVERSINE_ESTIMATION';
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  totalFee: number;
  chargeableWeightKg: number;
}

@Injectable()
export class DistanceService {
  private readonly logger = new Logger(DistanceService.name);

  // Constants định mức cước phí theo SRS & Business Rules
  private readonly BASE_DISTANCE_KM = 3;
  private readonly BASE_FEE_VND = 16500;
  private readonly TIER_1_MAX_KM = 10;
  private readonly TIER_1_RATE_PER_KM = 4000;
  private readonly TIER_2_MAX_KM = 30;
  private readonly TIER_2_RATE_PER_KM = 3500;
  private readonly TIER_3_RATE_PER_KM = 2500;

  private readonly BASE_WEIGHT_KG = 2.0;
  private readonly OVERWEIGHT_RATE_PER_KG = 5000;

  /**
   * Tính khoảng cách đường chim bay theo công thức Haversine (tính bằng km)
   */
  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = earthRadiusKm * c;

    // Nhân hệ số uốn lượn đường bộ (Urban Detour Factor ~1.25)
    return Math.round(distanceKm * 1.25 * 100) / 100;
  }

  /**
   * Đo khoảng cách thực tế mạng lưới đường bộ qua OSRM (Open Source Routing Machine)
   * Kèm timeout dự phòng và tự động fallback sang Haversine nếu mạng chậm
   */
  async getRoadDistanceAndDuration(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number,
  ): Promise<{
    distanceKm: number;
    durationMinutes: number;
    method: 'OSRM_ROUTING' | 'HAVERSINE_ESTIMATION';
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // OSRM yêu cầu định dạng: lon,lat;lon,lat
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;

      const response = await fetch(osrmUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ProjectNexus-Logistics/1.0' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as {
          code: string;
          routes?: Array<{ distance: number; duration: number }>;
        };

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const meters = data.routes[0].distance;
          const seconds = data.routes[0].duration;

          const distanceKm = Math.round((meters / 1000) * 100) / 100;
          const durationMinutes = Math.max(1, Math.round(seconds / 60));

          return {
            distanceKm,
            durationMinutes,
            method: 'OSRM_ROUTING',
          };
        }
      }
    } catch (err) {
      this.logger.warn(
        `OSRM routing request timed out or failed. Falling back to Haversine: ${err}`,
      );
    }

    // Fallback: Haversine
    const haversineKm = this.calculateHaversineDistance(originLat, originLon, destLat, destLon);
    // Ước lượng vận tốc nội thành trung bình 25 km/h
    const estimatedMinutes = Math.max(5, Math.round((haversineKm / 25) * 60));

    return {
      distanceKm: haversineKm,
      durationMinutes: estimatedMinutes,
      method: 'HAVERSINE_ESTIMATION',
    };
  }

  /**
   * Quy đổi trọng lượng thể tích và trọng lượng thực tế sang trọng lượng tính cước
   * Chargeable Weight = max(Weight_actual, Weight_volumetric)
   * Weight_volumetric = (Length * Width * Height) / 5000 (kg)
   */
  calculateChargeableWeight(
    weightGrams: number = 500,
    lengthCm: number = 10,
    widthCm: number = 10,
    heightCm: number = 10,
  ): number {
    const actualWeightKg = Math.max(0.1, weightGrams / 1000);
    const volumetricWeightKg = (lengthCm * widthCm * heightCm) / 5000;
    return Math.round(Math.max(actualWeightKg, volumetricWeightKg) * 100) / 100;
  }

  /**
   * Công thức tính cước vận chuyển chuẩn theo cự ly khoảng cách và trọng lượng
   */
  calculateShippingFee(
    distanceKm: number,
    chargeableWeightKg: number = 0.5,
  ): {
    baseFee: number;
    distanceFee: number;
    weightFee: number;
    totalFee: number;
  } {
    const baseFee = this.BASE_FEE_VND;
    let distanceFee = 0;

    // Phân bậc cước khoảng cách
    if (distanceKm <= this.BASE_DISTANCE_KM) {
      distanceFee = 0;
    } else if (distanceKm <= this.TIER_1_MAX_KM) {
      // 3km - 10km
      distanceFee = (distanceKm - this.BASE_DISTANCE_KM) * this.TIER_1_RATE_PER_KM;
    } else if (distanceKm <= this.TIER_2_MAX_KM) {
      // 10km - 30km
      const tier1Fee = (this.TIER_1_MAX_KM - this.BASE_DISTANCE_KM) * this.TIER_1_RATE_PER_KM;
      const tier2Fee = (distanceKm - this.TIER_1_MAX_KM) * this.TIER_2_RATE_PER_KM;
      distanceFee = tier1Fee + tier2Fee;
    } else {
      // > 30km
      const tier1Fee = (this.TIER_1_MAX_KM - this.BASE_DISTANCE_KM) * this.TIER_1_RATE_PER_KM;
      const tier2Fee = (this.TIER_2_MAX_KM - this.TIER_1_MAX_KM) * this.TIER_2_RATE_PER_KM;
      const tier3Fee = (distanceKm - this.TIER_2_MAX_KM) * this.TIER_3_RATE_PER_KM;
      distanceFee = tier1Fee + tier2Fee + tier3Fee;
    }

    // Phụ phí trọng lượng vượt mức (> 2kg)
    let weightFee = 0;
    if (chargeableWeightKg > this.BASE_WEIGHT_KG) {
      const overweightKg = Math.ceil(chargeableWeightKg - this.BASE_WEIGHT_KG);
      weightFee = overweightKg * this.OVERWEIGHT_RATE_PER_KG;
    }

    // Làm tròn đến đơn vị 1.000 VNĐ
    const rawTotal = baseFee + distanceFee + weightFee;
    const totalFee = Math.ceil(rawTotal / 1000) * 1000;

    return {
      baseFee,
      distanceFee: Math.round(distanceFee),
      weightFee,
      totalFee,
    };
  }

  /**
   * Tính toán toàn diện: Đo cự ly OSRM + Quy đổi tiền giao hàng
   */
  async computeDistanceAndFee(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number,
    chargeableWeightKg: number = 0.5,
  ): Promise<DistanceCalculationResult> {
    const routeInfo = await this.getRoadDistanceAndDuration(originLat, originLon, destLat, destLon);

    const feeBreakdown = this.calculateShippingFee(routeInfo.distanceKm, chargeableWeightKg);

    return {
      distanceKm: routeInfo.distanceKm,
      durationMinutes: routeInfo.durationMinutes,
      method: routeInfo.method,
      chargeableWeightKg,
      ...feeBreakdown,
    };
  }
}
