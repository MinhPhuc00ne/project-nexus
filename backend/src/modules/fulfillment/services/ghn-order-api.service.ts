import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { objectValue } from './shipment-state';
import { ghnEnvironment } from './ghn-context';

export interface GhnOrderDetail extends Record<string, unknown> {
  order_code: string;
  client_order_code: string;
  status: string;
  shop_id: number;
}

@Injectable()
export class GhnOrderApiService {
  constructor(private readonly config: ConfigService) {}

  private shopHeader(shopId: number, environment?: string): string {
    if (environment && environment !== ghnEnvironment(this.config)) {
      throw new BadRequestException('Vận đơn thuộc môi trường GHN khác.');
    }
    const selected = shopId;
    if (!Number.isSafeInteger(selected) || selected <= 0)
      throw new BadGatewayException('Thiếu shop ID GHN hợp lệ.');
    return String(selected);
  }

  async label(
    orderCode: string,
    shopId: number,
    environment?: string,
  ): Promise<{ a5: string; size80x80: string; size52x70: string }> {
    const token = this.config.get<string>('GHN_TOKEN');
    const selectedShopId = this.shopHeader(shopId, environment);
    if (!token) throw new BadGatewayException('Chưa cấu hình tài khoản GHN.');
    const base = (
      this.config.get<string>('GHN_API_URL') || 'https://online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/$/, '');
    const root = base.endsWith('/v2') ? base : `${base}/v2`;
    try {
      const response = await fetch(`${root}/a5/gen-token`, {
        method: 'POST',
        headers: { Token: token, ShopId: selectedShopId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_codes: [orderCode] }),
        signal: AbortSignal.timeout(10000),
      });
      const body = objectValue(await response.json());
      const data = objectValue(body.data);
      if (
        !response.ok ||
        body.code !== 200 ||
        typeof data.token !== 'string' ||
        !data.token.trim()
      ) {
        throw new BadGatewayException('GHN chưa cấp phiếu gửi hàng cho vận đơn này.');
      }
      const origin = new URL(base).origin;
      const key = encodeURIComponent(data.token);
      return {
        a5: `${origin}/a5/public-api/printA5?token=${key}`,
        size80x80: `${origin}/a5/public-api/print80x80?token=${key}`,
        size52x70: `${origin}/a5/public-api/print52x70?token=${key}`,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Không lấy được phiếu gửi hàng GHN.');
    }
  }

  private async read(
    endpoint: string,
    key: string,
    value: string,
    shopId: number,
    environment?: string,
  ): Promise<Record<string, unknown>> {
    const token = this.config.get<string>('GHN_TOKEN');
    const selectedShopId = this.shopHeader(shopId, environment);
    if (!token) throw new BadGatewayException('Chưa cấu hình tài khoản GHN.');
    const base = (
      this.config.get<string>('GHN_API_URL') || 'https://online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/$/, '');
    const root = base.endsWith('/v2') ? base : `${base}/v2`;
    try {
      const response = await fetch(
        `${root}/shipping-order/${endpoint}?${key}=${encodeURIComponent(value)}`,
        {
          headers: { Token: token, ShopId: selectedShopId },
          signal: AbortSignal.timeout(10000),
        },
      );
      const body = objectValue(await response.json());
      if (response.status === 404) throw new NotFoundException('GHN chưa tìm thấy vận đơn.');
      if (!response.ok || body.code !== 200 || !body.data) {
        throw new BadGatewayException('GHN chưa xác minh được thông tin vận đơn.');
      }
      return objectValue(body.data);
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof NotFoundException) throw error;
      throw new BadGatewayException(
        'Kết nối tra cứu GHN bị gián đoạn. Vui lòng đối soát trước khi gửi lại.',
      );
    }
  }

  private validateOrder(data: Record<string, unknown>, shopId: number): GhnOrderDetail {
    if (
      typeof data.order_code !== 'string' ||
      !data.order_code.trim() ||
      typeof data.status !== 'string' ||
      typeof data.client_order_code !== 'string' ||
      Number(data.shop_id) !== Number(this.shopHeader(shopId))
    ) {
      throw new BadGatewayException('Vận đơn GHN không hợp lệ hoặc không thuộc shop đã cấu hình.');
    }
    return data as GhnOrderDetail;
  }

  async detail(orderCode: string, shopId: number, environment?: string): Promise<GhnOrderDetail> {
    const data = this.validateOrder(
      await this.read('detail', 'order_code', orderCode, shopId, environment),
      shopId,
    );
    if (data.order_code !== orderCode) throw new BadGatewayException('Mã vận đơn GHN không khớp.');
    return data;
  }

  async byClientCode(
    clientCode: string,
    shopId: number,
    environment?: string,
  ): Promise<GhnOrderDetail> {
    const data = this.validateOrder(
      await this.read(
        'detail-by-client-code',
        'client_order_code',
        clientCode,
        shopId,
        environment,
      ),
      shopId,
    );
    if (data.client_order_code !== clientCode)
      throw new BadGatewayException('Mã đơn nội bộ không khớp.');
    return data;
  }

  async fees(
    orderCode: string,
    shopId: number,
    environment?: string,
  ): Promise<{ total: number; detail: Record<string, unknown> }> {
    const data = await this.read('soc', 'order_code', orderCode, shopId, environment);
    const detail = objectValue(data.detail);
    if (data.order_code !== orderCode || !Number.isSafeInteger(detail.main_service)) {
      throw new BadGatewayException('GHN chưa trả bảng phí hợp lệ.');
    }
    const components = Object.entries(detail).filter(([key]) => key !== 'total');
    if (
      components.some(
        ([key, value]) => !Number.isSafeInteger(value) || (Number(value) < 0 && key !== 'coupon'),
      )
    ) {
      throw new BadGatewayException('Bảng phí GHN có thành phần không hợp lệ.');
    }
    const total = detail.total ?? components.reduce((sum, [, value]) => sum + Number(value), 0);
    if (!Number.isSafeInteger(total) || Number(total) < 0)
      throw new BadGatewayException('Tổng phí GHN không hợp lệ.');
    return { total: Number(total), detail };
  }
}
