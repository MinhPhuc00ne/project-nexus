import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  HttpException,
} from '@nestjs/common';
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

  private validateConfig(requireShopId = false): void {
    if (!this.token || !this.token.trim()) {
      throw new BadGatewayException(
        'Cấu hình GHN lỗi: GHN_TOKEN chưa được thiết lập. Vui lòng kiểm tra biến môi trường.',
      );
    }
    if (requireShopId && (!this.shopId || !this.shopId.trim())) {
      throw new BadGatewayException(
        'Cấu hình GHN lỗi: GHN_SHOP_ID chưa được thiết lập. Vui lòng kiểm tra biến môi trường.',
      );
    }
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
   * Chẩn đoán token, shop ID, URL môi trường và kết nối GHN
   */
  async getDiagnostic() {
    const tokenConfigured = Boolean(this.token && this.token.trim());
    const shopIdConfigured = Boolean(this.shopId && this.shopId.trim());
    const environment = this.masterDataBaseUrl.includes('dev-online-gateway')
      ? 'SANDBOX'
      : 'PRODUCTION';

    let pingStatus = 'UNKNOWN';
    let latencyMs = 0;
    let message = '';
    let ghnCode: number | null = null;

    if (!tokenConfigured) {
      pingStatus = 'TOKEN_MISSING';
      message = 'GHN_TOKEN chưa được thiết lập trong biến môi trường.';
    } else {
      const start = Date.now();
      try {
        const res = await fetch(`${this.masterDataBaseUrl}/master-data/province`, {
          headers: this.getHeaders(false),
        });
        latencyMs = Date.now() - start;
        const json = (await res.json()) as { code?: number; message?: string };
        ghnCode = json.code ?? null;
        if (json.code === 200) {
          pingStatus = 'CONNECTED';
          message = 'Kết nối cổng GHN thành công';
        } else {
          pingStatus = 'GHN_API_ERROR';
          message = json.message || `GHN API trả mã phản hồi: ${json.code}`;
        }
      } catch (err) {
        latencyMs = Date.now() - start;
        pingStatus = 'CONNECTION_FAILED';
        message = (err as Error).message;
      }
    }

    return {
      tokenConfigured,
      tokenMasked: tokenConfigured ? `${this.token.slice(0, 4)}...${this.token.slice(-4)}` : null,
      shopIdConfigured,
      shopId: this.shopId || null,
      masterDataBaseUrl: this.masterDataBaseUrl,
      orderApiBaseUrl: this.orderApiBaseUrl,
      environment,
      ping: {
        status: pingStatus,
        ghnCode,
        latencyMs,
        message,
      },
    };
  }

  /**
   * 1. Lấy danh sách 63 Tỉnh/Thành phố toàn quốc từ GHN Master Data
   */
  async getProvinces() {
    this.validateConfig(false);
    try {
      const url = `${this.masterDataBaseUrl}/master-data/province`;
      const response = await fetch(url, {
        headers: this.getHeaders(false),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(`Cổng GHN trả mã HTTP ${response.status}: ${errText}`);
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: Array<{ ProvinceID: number; ProvinceName: string; Code: string }>;
      };
      if (data.code !== 200) {
        this.logger.error(`GHN getProvinces code ${data.code}: ${data.message}`);
        throw new BadGatewayException(
          `GHN API trả lỗi (${data.code}): ${data.message || 'Không thể lấy danh sách Tỉnh/Thành'}`,
        );
      }
      if (Array.isArray(data.data)) {
        return data.data.map((p) => ({
          provinceId: p.ProvinceID,
          provinceName: p.ProvinceName,
          code: p.Code,
        }));
      }
      return [];
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi khi gọi GHN Master Data: ${err}`);
      throw new BadGatewayException(
        `Không thể kết nối đến cổng dịch vụ GHN: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 2. Lấy danh sách Quận/Huyện theo Tỉnh/Thành
   */
  async getDistricts(provinceId: number) {
    if (!provinceId || isNaN(provinceId) || provinceId <= 0) {
      throw new BadRequestException('Mã Tỉnh/Thành (provinceId) phải là số nguyên dương hợp lệ.');
    }
    this.validateConfig(false);
    try {
      const url = `${this.masterDataBaseUrl}/master-data/district`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ province_id: Number(provinceId) }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(`Cổng GHN trả mã HTTP ${response.status}: ${errText}`);
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: Array<{ DistrictID: number; DistrictName: string; Code: string }>;
      };
      if (data.code !== 200) {
        this.logger.error(`GHN getDistricts code ${data.code}: ${data.message}`);
        throw new BadGatewayException(
          `GHN API trả lỗi (${data.code}): ${data.message || 'Không thể lấy danh sách Quận/Huyện'}`,
        );
      }
      if (Array.isArray(data.data)) {
        return data.data.map((d) => ({
          districtId: d.DistrictID,
          districtName: d.DistrictName,
          code: d.Code,
        }));
      }
      return [];
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi khi lấy danh sách Quận/Huyện từ GHN: ${err}`);
      throw new BadGatewayException(
        `Không thể kết nối đến cổng dịch vụ GHN: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 3. Lấy danh sách Phường/Xã theo Quận/Huyện
   */
  async getWards(districtId: number) {
    if (!districtId || isNaN(districtId) || districtId <= 0) {
      throw new BadRequestException('Mã Quận/Huyện (districtId) phải là số nguyên dương hợp lệ.');
    }
    this.validateConfig(false);
    try {
      const url = `${this.masterDataBaseUrl}/master-data/ward?district_id=${districtId}`;
      const response = await fetch(url, {
        headers: this.getHeaders(false),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(`Cổng GHN trả mã HTTP ${response.status}: ${errText}`);
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: Array<{ WardCode: string; WardName: string }>;
      };
      if (data.code !== 200) {
        this.logger.error(`GHN getWards code ${data.code}: ${data.message}`);
        throw new BadGatewayException(
          `GHN API trả lỗi (${data.code}): ${data.message || 'Không thể lấy danh sách Phường/Xã'}`,
        );
      }
      if (Array.isArray(data.data)) {
        return data.data.map((w) => ({
          wardCode: w.WardCode,
          wardName: w.WardName,
        }));
      }
      return [];
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi khi lấy danh sách Phường/Xã từ GHN: ${err}`);
      throw new BadGatewayException(
        `Không thể kết nối đến cổng dịch vụ GHN: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 4. Lấy danh sách các gói dịch vụ GHN khả dụng giữa 2 quận
   */
  async getAvailableServices(fromDistrictId: number, toDistrictId: number) {
    if (!fromDistrictId || isNaN(fromDistrictId) || fromDistrictId <= 0) {
      throw new BadRequestException('Mã Quận/Huyện gửi (fromDistrictId) không hợp lệ.');
    }
    if (!toDistrictId || isNaN(toDistrictId) || toDistrictId <= 0) {
      throw new BadRequestException('Mã Quận/Huyện nhận (toDistrictId) không hợp lệ.');
    }
    this.validateConfig(true);
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
      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(`Cổng GHN trả mã HTTP ${response.status}: ${errText}`);
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: Array<{ service_id: number; short_name: string; service_type_id: number }>;
      };
      if (data.code !== 200) {
        throw new BadGatewayException(
          `GHN API trả lỗi (${data.code}): ${data.message || 'Không tìm thấy gói dịch vụ'}`,
        );
      }
      if (Array.isArray(data.data)) {
        return data.data.map((s) => ({
          serviceId: s.service_id,
          shortName: s.short_name,
          serviceTypeId: s.service_type_id,
        }));
      }
      return [];
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi khi lấy danh sách dịch vụ GHN khả dụng: ${err}`);
      throw new BadGatewayException(
        `Không thể kết nối đến cổng dịch vụ GHN: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 5. Tính trước cước phí vận chuyển GHN (Shipping Fee Calculation)
   */
  async calculateFee(req: GhnFeeRequest): Promise<GhnFeeResponse | null> {
    this.validateConfig(true);
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/fee`;

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

      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(
          `Cổng GHN tính phí trả mã HTTP ${response.status}: ${errText}`,
        );
      }

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
      throw new BadGatewayException(
        `GHN tính phí trả lỗi (${resData.code}): ${resData.message || 'Không thể tính phí'}`,
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi khi gọi API tính phí GHN: ${err}`);
      throw new BadGatewayException(
        `Không thể kết nối đến cổng tính phí GHN: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 6. Tạo đơn giao hàng chính thức trên GHN
   */
  async createShippingOrder(orderPayload: Record<string, unknown>) {
    this.validateConfig(true);
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(orderPayload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(
          `Cổng GHN tạo đơn trả mã HTTP ${response.status}: ${errText}`,
        );
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: unknown;
      };
      if (data.code !== 200) {
        throw new BadGatewayException(
          `GHN tạo đơn trả lỗi (${data.code}): ${data.message || 'Không thể tạo vận đơn'}`,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi tạo vận đơn GHN: ${err}`);
      throw new BadGatewayException(
        `Không thể kết nối đến cổng vận chuyển GHN: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 7. Tra cứu thông tin hành trình vận đơn qua GHN
   */
  async trackOrder(orderCode: string) {
    this.validateConfig(true);
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/detail`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ order_code: orderCode }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new BadGatewayException(
          `Cổng GHN tra cứu vận đơn trả HTTP ${response.status}: ${errText}`,
        );
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: unknown;
      };
      if (data.code !== 200) {
        throw new BadGatewayException(
          `GHN tra cứu vận đơn lỗi (${data.code}): ${data.message || 'Không tìm thấy vận đơn'}`,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Lỗi tra cứu vận đơn GHN ${orderCode}: ${err}`);
      throw new BadGatewayException(`Không thể kết nối tra cứu GHN: ${(err as Error).message}`);
    }
  }
}
