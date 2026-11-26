import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GhnParcelItem, normalizeGhnWardCode } from './ghn-parcel';
import { GhnCreateRejectedException } from './ghn-create-error';

export interface GhnFeeRequest {
  shopId?: number;
  fromDistrictId?: number;
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
  items?: GhnParcelItem[];
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
  private readonly masterDataBaseUrl: string;
  private readonly orderApiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('GHN_TOKEN') || '';
    this.shopId = this.configService.get<string>('GHN_SHOP_ID') || '';

    const rawApiUrl =
      this.configService.get<string>('GHN_API_URL') ||
      'https://online-gateway.ghn.vn/shiip/public-api/v2';

    const normalizedUrl = rawApiUrl.trim().replace(/\/+$/, '');
    this.masterDataBaseUrl = normalizedUrl.replace(/\/v2$/, '');
    this.orderApiBaseUrl = `${this.masterDataBaseUrl}/v2`;
  }

  private validateConfig(requireShopId = false, shopId?: number): void {
    if (!this.token || !this.token.trim()) {
      throw new BadGatewayException(
        'Cấu hình GHN lỗi: GHN_TOKEN chưa được thiết lập. Vui lòng kiểm tra biến môi trường.',
      );
    }
    const selectedShop = shopId ?? Number(this.shopId);
    if (requireShopId && (!Number.isSafeInteger(selectedShop) || selectedShop <= 0)) {
      throw new BadGatewayException(
        'Cấu hình GHN lỗi: GHN_SHOP_ID chưa được thiết lập. Vui lòng kiểm tra biến môi trường.',
      );
    }
  }

  private getHeaders(includeShopId = true, shopId?: number): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: this.token,
    };
    const selectedShop = shopId ?? Number(this.shopId);
    if (includeShopId && Number.isSafeInteger(selectedShop) && selectedShop > 0) {
      headers.ShopId = String(selectedShop);
    }
    return headers;
  }

  /**
   * Diagnoses GHN token configuration, shop identifiers, environment URLs, and API connectivity.
   *
   * @returns Health metrics, latency, and status diagnostics
   */
  async getDiagnostic() {
    const tokenConfigured = Boolean(this.token && this.token.trim());
    const shopIdConfigured = Number.isSafeInteger(Number(this.shopId)) && Number(this.shopId) > 0;
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
          signal: AbortSignal.timeout(10000),
        });
        latencyMs = Date.now() - start;
        const json = (await res.json()) as { code?: number; message?: string; data?: unknown };
        ghnCode = json.code ?? null;
        if (
          res.ok &&
          json.code === 200 &&
          Array.isArray(json.data) &&
          json.data.length > 0 &&
          json.data.every(
            (row: { ProvinceID?: number; ProvinceName?: string }) =>
              Number.isSafeInteger(row?.ProvinceID) &&
              Number(row.ProvinceID) > 0 &&
              typeof row.ProvinceName === 'string' &&
              row.ProvinceName.trim(),
          )
        ) {
          pingStatus = 'CONNECTED';
          message = 'Kết nối cổng GHN thành công';
        } else {
          pingStatus = 'GHN_API_ERROR';
          message =
            'GHN trả lỗi hoặc thiếu dữ liệu tỉnh/thành. Kiểm tra token, URL và môi trường GHN.';
        }
      } catch (err) {
        latencyMs = Date.now() - start;
        pingStatus = 'CONNECTION_FAILED';
        message = (err as Error).message;
      }
    }

    return {
      tokenConfigured,
      tokenMasked: tokenConfigured ? '********' : null,
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
        signal: AbortSignal.timeout(10000),
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
      if (
        Array.isArray(data.data) &&
        data.data.length > 0 &&
        data.data.every(
          (p) =>
            Number.isSafeInteger(p?.ProvinceID) &&
            p.ProvinceID > 0 &&
            typeof p.ProvinceName === 'string' &&
            p.ProvinceName.trim(),
        )
      ) {
        return data.data.map((p) => ({
          provinceId: p.ProvinceID,
          provinceName: p.ProvinceName,
          code: p.Code,
        }));
      }
      throw new BadGatewayException(
        'GHN trả thiếu/sai dữ liệu tỉnh/thành. Kiểm tra token, URL và môi trường GHN.',
      );
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
    if (!Number.isSafeInteger(provinceId) || provinceId <= 0) {
      throw new BadRequestException('Mã Tỉnh/Thành (provinceId) phải là số nguyên dương hợp lệ.');
    }
    this.validateConfig(false);
    try {
      const url = `${this.masterDataBaseUrl}/master-data/district`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ province_id: Number(provinceId) }),
        signal: AbortSignal.timeout(10000),
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
      if (
        Array.isArray(data.data) &&
        data.data.every(
          (d) =>
            Number.isSafeInteger(d?.DistrictID) &&
            d.DistrictID > 0 &&
            typeof d.DistrictName === 'string' &&
            d.DistrictName.trim(),
        )
      ) {
        return data.data.map((d) => ({
          districtId: d.DistrictID,
          districtName: d.DistrictName,
          code: d.Code,
        }));
      }
      throw new BadGatewayException(
        'GHN trả thiếu/sai dữ liệu quận/huyện. Kiểm tra token, URL và môi trường GHN.',
      );
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
    if (!Number.isSafeInteger(districtId) || districtId <= 0) {
      throw new BadRequestException('Mã Quận/Huyện (districtId) phải là số nguyên dương hợp lệ.');
    }
    this.validateConfig(false);
    try {
      const url = `${this.masterDataBaseUrl}/master-data/ward?district_id=${districtId}`;
      const response = await fetch(url, {
        headers: this.getHeaders(false),
        signal: AbortSignal.timeout(10000),
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
      if (
        Array.isArray(data.data) &&
        data.data.every(
          (w) =>
            typeof w?.WardCode === 'string' &&
            w.WardCode.trim() &&
            typeof w.WardName === 'string' &&
            w.WardName.trim(),
        )
      ) {
        return data.data.map((w) => ({
          wardCode: w.WardCode,
          wardName: w.WardName,
        }));
      }
      throw new BadGatewayException(
        'GHN trả thiếu/sai dữ liệu phường/xã. Kiểm tra token, URL và môi trường GHN.',
      );
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
  async getAvailableServices(fromDistrictId: number, toDistrictId: number, shopId?: number) {
    if (!fromDistrictId || isNaN(fromDistrictId) || fromDistrictId <= 0) {
      throw new BadRequestException('Mã Quận/Huyện gửi (fromDistrictId) không hợp lệ.');
    }
    if (!toDistrictId || isNaN(toDistrictId) || toDistrictId <= 0) {
      throw new BadRequestException('Mã Quận/Huyện nhận (toDistrictId) không hợp lệ.');
    }
    this.validateConfig(true, shopId);
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/available-services`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({
          shop_id: shopId ?? Number(this.shopId),
          from_district: Number(fromDistrictId),
          to_district: Number(toDistrictId),
        }),
        signal: AbortSignal.timeout(10000),
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
  async calculateFee(req: GhnFeeRequest): Promise<GhnFeeResponse> {
    this.validateConfig(true, req.shopId);
    if (
      !Number.isSafeInteger(req.weightGrams) ||
      req.weightGrams <= 0 ||
      !Number.isSafeInteger(req.toDistrictId) ||
      req.toDistrictId <= 0 ||
      !req.toWardCode?.trim()
    ) {
      throw new BadRequestException('Thiếu địa chỉ GHN hoặc khối lượng kiện hàng không hợp lệ.');
    }
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/fee`;

      const serviceTypeId = req.serviceTypeId ?? (req.weightGrams >= 20000 ? 5 : 2);
      if (serviceTypeId === 5 && !req.items?.length) {
        throw new BadRequestException(
          'Dịch vụ hàng nặng GHN yêu cầu thông tin từng sản phẩm/kiện hàng.',
        );
      }

      const payload: Record<string, unknown> = {
        service_type_id: serviceTypeId,
        to_district_id: Number(req.toDistrictId),
        to_ward_code: normalizeGhnWardCode(String(req.toWardCode)),
        weight: req.weightGrams,
        length: Math.round(req.lengthCm ?? 10),
        width: Math.round(req.widthCm ?? 10),
        height: Math.round(req.heightCm ?? 10),
        insurance_value: Math.round(req.insuranceValue ?? 0),
        items: req.items,
      };

      if (req.fromDistrictId) {
        payload.from_district_id = Number(req.fromDistrictId);
      }
      if (req.fromWardCode) {
        payload.from_ward_code = normalizeGhnWardCode(String(req.fromWardCode));
      }
      if (req.serviceId) {
        payload.service_id = req.serviceId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true, req.shopId),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
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

      if (
        resData.code === 200 &&
        resData.data &&
        Number.isSafeInteger(resData.data.total) &&
        resData.data.total >= 0 &&
        Number.isSafeInteger(resData.data.service_fee) &&
        resData.data.service_fee >= 0
      ) {
        return {
          total: resData.data.total,
          serviceFee: resData.data.service_fee,
          insuranceFee: resData.data.insurance_fee ?? 0,
          r2sFee: resData.data.r2s_fee ?? 0,
          codFee: resData.data.cod_fee ?? 0,
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
   * Tự động phân giải Tỉnh/Thành, Quận/Huyện, Phường/Xã dạng chuỗi sang mã GHN
   */
  async resolveDistrictAndWard(
    cityName: string,
    districtName: string,
    wardName?: string | null,
  ): Promise<{ districtId: number; wardCode: string } | null> {
    const provinces = await this.getProvinces();
    const normalize = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|phuong|xa|thi tran)\s*/i, '')
        .replace(/\b0+(\d)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    const cleanCity = normalize(cityName);
    const matchedProvince = provinces.find((p) => {
      return normalize(p.provinceName) === cleanCity;
    });
    if (!matchedProvince) return null;

    const districts = await this.getDistricts(matchedProvince.provinceId);
    const cleanDistrict = normalize(districtName);
    const matchedDistrict = districts.find((d) => {
      return normalize(d.districtName) === cleanDistrict;
    });
    if (!matchedDistrict) return null;

    if (!wardName) {
      return { districtId: matchedDistrict.districtId, wardCode: '' };
    }

    const wards = await this.getWards(matchedDistrict.districtId);
    const cleanWard = normalize(wardName);
    const matchedWard = wards.find((w) => {
      return normalize(w.wardName) === cleanWard;
    });

    return {
      districtId: matchedDistrict.districtId,
      wardCode: matchedWard ? matchedWard.wardCode : '',
    };
  }

  /**
   * 6. Tạo đơn giao hàng chính thức trên GHN
   */
  async createShippingOrder(orderPayload: Record<string, unknown>, shopId: number) {
    if (!Number.isSafeInteger(shopId) || shopId <= 0)
      throw new BadRequestException('Thiếu điểm GHN cho đơn hàng này.');
    this.validateConfig(true, shopId);
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true, shopId),
        body: JSON.stringify(orderPayload),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        const errText = await response.text();
        if (response.status >= 400 && response.status < 500) {
          throw new GhnCreateRejectedException(`GHN từ chối tạo vận đơn: ${errText}`);
        }
        throw new BadGatewayException('GHN chưa xác nhận kết quả tạo vận đơn; cần đối soát.');
      }
      const data = (await response.json()) as {
        code: number;
        message: string;
        data?: unknown;
      };
      if (data.code !== 200) {
        if (data.code >= 400 && data.code < 500) {
          throw new GhnCreateRejectedException(`GHN từ chối tạo vận đơn: ${data.message}`);
        }
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
  async trackOrder(orderCode: string, shopId: number) {
    if (!Number.isSafeInteger(shopId) || shopId <= 0)
      throw new BadRequestException('Thiếu điểm GHN cho vận đơn này.');
    this.validateConfig(true, shopId);
    try {
      const url = `${this.orderApiBaseUrl}/shipping-order/detail?order_code=${encodeURIComponent(orderCode)}`;
      const response = await fetch(url, {
        headers: this.getHeaders(true, shopId),
        signal: AbortSignal.timeout(10000),
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
