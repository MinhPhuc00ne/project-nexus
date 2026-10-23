import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GhnFeeRequest {
  fromDistrictId: number;
  fromWardCode?: string;
  toDistrictId: number;
  toWardCode: string;
  weightGrams: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  serviceId?: number;
  serviceTypeId?: number;
  insuranceValue?: number;
}

export interface GhnFeeResponse {
  total: number;
  serviceFee: number;
  insuranceFee: number;
  r2sFee: number;
  codFee: number;
}

@Injectable()
export class GhnLogisticsService {
  private readonly logger = new Logger(GhnLogisticsService.name);

  private readonly token: string;
  private readonly shopId: string;
  private readonly clientId: string;
  private readonly masterDataBaseUrl: string;
  private readonly orderApiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('GHN_TOKEN') || '';
    this.shopId = this.configService.get<string>('GHN_SHOP_ID') || '';
    this.clientId = this.configService.get<string>('GHN_CLIENT_ID') || '';

    // GHN sử dụng online-gateway hoặc dev-online-gateway
    const rawApiUrl =
      this.configService.get<string>('GHN_API_URL') ||
      'https://online-gateway.ghn.vn/shiip/public-api/v2';

    // Master data endpoint (Tỉnh/Thành, Quận/Huyện) không có tiền tố /v2
    this.masterDataBaseUrl = rawApiUrl.replace(/\/v2$/, '');
    this.orderApiBaseUrl = rawApiUrl.endsWith('/v2') ? rawApiUrl : `${rawApiUrl}/v2`;
  }

  private getHeaders(includeShopId = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: this.token,
    };
    if (includeShopId && this.shopId) {
      headers.ShopId = this.shopId;
    }
    return headers;
  }

  /**
   * 1. Lấy danh sách 63 Tỉnh/Thành phố toàn quốc từ GHN Master Data
   */
  async getProvinces() {
    try {
      const url = `${this.masterDataBaseUrl}/master-data/province`;
      const response = await fetch(url, {
        headers: this.getHeaders(false),
      });
      const data = (await response.json()) as {
        code: number;
        message: string;
        data: Array<{ ProvinceID: number; ProvinceName: string; Code: string }>;
      };
      if (data.code === 200 && Array.isArray(data.data)) {
        return data.data.map((p) => ({
          provinceId: p.ProvinceID,
          provinceName: p.ProvinceName,
          code: p.Code,
        }));
      }
      return [];
    } catch (err) {
      this.logger.error(`Lỗi khi lấy danh sách Tỉnh/Thành từ GHN: ${err}`);
      return [];
    }
  }

  /**
   * 2. Lấy danh sách Quận/Huyện theo Tỉnh/Thành
   */
  async getDistricts(provinceId: number) {
    try {
      const url = `${this.masterDataBaseUrl}/master-data/district`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ province_id: Number(provinceId) }),
      });
      const data = (await response.json()) as {
        code: number;
        message: string;
        data: Array<{ DistrictID: number; DistrictName: string; Code: string }>;
      };
      if (data.code === 200 && Array.isArray(data.data)) {
        return data.data.map((d) => ({
          districtId: d.DistrictID,
          districtName: d.DistrictName,
          code: d.Code,
        }));
      }
      return [];
    } catch (err) {
      this.logger.error(`Lỗi khi lấy danh sách Quận/Huyện từ GHN: ${err}`);
      return [];
    }
  }

  /**
   * 3. Lấy danh sách Phường/Xã theo Quận/Huyện
   */
  async getWards(districtId: number) {
    try {
      const url = `${this.masterDataBaseUrl}/master-data/ward?district_id=${districtId}`;
      const response = await fetch(url, {
        headers: this.getHeaders(false),
      });
      const data = (await response.json()) as {
        code: number;
        message: string;
        data: Array<{ WardCode: string; WardName: string }>;
      };
      if (data.code === 200 && Array.isArray(data.data)) {
        return data.data.map((w) => ({
          wardCode: w.WardCode,
          wardName: w.WardName,
        }));
      }
      return [];
    } catch (err) {
      this.logger.error(`Lỗi khi lấy danh sách Phường/Xã từ GHN: ${err}`);
      return [];
    }
  }

  /**
   * 4. Lấy danh sách các gói dịch vụ GHN khả dụng giữa 2 quận
   */
  async getAvailableServices(fromDistrictId: number, toDistrictId: number) {
    if (!this.token || !this.shopId) {
      this.logger.warn('GHN_TOKEN hoặc GHN_SHOP_ID chưa được cấu hình.');
      return [];
    }
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/available-services`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({
          shop_id: Number(this.shopId),
          from_district: Number(fromDistrictId),
          to_district: Number(toDistrictId),
        }),
      });
      const data = (await response.json()) as {
        code: number;
        message: string;
        data: Array<{ service_id: number; short_name: string; service_type_id: number }>;
      };
      if (data.code === 200 && Array.isArray(data.data)) {
        return data.data.map((s) => ({
          serviceId: s.service_id,
          shortName: s.short_name,
          serviceTypeId: s.service_type_id,
        }));
      }
      return [];
    } catch (err) {
      this.logger.error(`Lỗi khi lấy danh sách dịch vụ GHN khả dụng: ${err}`);
      return [];
    }
  }

  /**
   * 5. Tính trước cước phí vận chuyển GHN (Shipping Fee Calculation)
   */
  async calculateFee(req: GhnFeeRequest): Promise<GhnFeeResponse | null> {
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/fee`;

      if (!this.token || !this.shopId) {
        this.logger.warn('GHN_TOKEN hoặc GHN_SHOP_ID chưa được cấu hình.');
        return null;
      }

      // Mặc định dịch vụ Chuẩn (service_type_id = 2)
      const serviceTypeId = req.serviceTypeId || 2;

      const payload: Record<string, unknown> = {
        service_type_id: serviceTypeId,
        from_district_id: Number(req.fromDistrictId),
        ...(req.fromWardCode && { from_ward_code: String(req.fromWardCode) }),
        to_district_id: Number(req.toDistrictId),
        to_ward_code: String(req.toWardCode),
        weight: Math.max(100, Math.round(req.weightGrams)),
        length: Math.max(5, Math.round(req.lengthCm || 10)),
        width: Math.max(5, Math.round(req.widthCm || 10)),
        height: Math.max(5, Math.round(req.heightCm || 10)),
        insurance_value: Math.min(5000000, Math.round(req.insuranceValue || 0)),
      };

      if (req.serviceId) {
        payload.service_id = req.serviceId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });

      const resData = (await response.json()) as {
        code: number;
        message: string;
        data?: {
          total: number;
          service_fee: number;
          insurance_fee: number;
          r2s_fee: number;
          cod_fee: number;
        };
      };

      if (resData.code === 200 && resData.data) {
        return {
          total: resData.data.total,
          serviceFee: resData.data.service_fee,
          insuranceFee: resData.data.insurance_fee,
          r2sFee: resData.data.r2s_fee,
          codFee: resData.data.cod_fee,
        };
      }

      this.logger.warn(`GHN fee response code ${resData.code}: ${resData.message}`);
      return null;
    } catch (err) {
      this.logger.error(`Lỗi khi gọi API tính phí GHN: ${err}`);
      return null;
    }
  }

  /**
   * 6. Tạo đơn giao hàng chính thức trên GHN
   */
  async createShippingOrder(orderPayload: Record<string, unknown>) {
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(orderPayload),
      });
      const data = await response.json();
      return data;
    } catch (err) {
      this.logger.error(`Lỗi tạo vận đơn GHN: ${err}`);
      throw new BadRequestException('Không thể kết nối đến cổng vận chuyển GHN.');
    }
  }

  /**
   * 7. Tra cứu thông tin hành trình vận đơn qua GHN
   */
  async trackOrder(orderCode: string) {
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/detail`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ order_code: orderCode }),
      });
      const data = await response.json();
      return data;
    } catch (err) {
      this.logger.error(`Lỗi tra cứu vận đơn GHN ${orderCode}: ${err}`);
      return null;
    }
  }
}
