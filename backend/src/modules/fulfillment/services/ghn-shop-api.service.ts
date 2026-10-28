import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { objectValue } from './shipment-state';

export interface GhnShop {
  id: number;
  clientId: number;
  name: string;
  phone: string;
  address: string;
  districtId: number;
  wardCode: string;
  active: boolean;
}

@Injectable()
export class GhnShopApiService {
  constructor(private readonly config: ConfigService) {}

  async list(offset = 0, limit = 100): Promise<{ shops: GhnShop[]; nextOffset: number }> {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException('Tham số phân trang GHN không hợp lệ.');
    }
    const token = this.config.get<string>('GHN_TOKEN');
    if (!token?.trim()) throw new BadGatewayException('Chưa cấu hình GHN_TOKEN.');
    const raw = (
      this.config.get<string>('GHN_API_URL') || 'https://online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/+$/, '');
    const root = raw.endsWith('/v2') ? raw : `${raw}/v2`;
    try {
      const response = await fetch(`${root}/shop/all?offset=${offset}&limit=${limit}`, {
        headers: { Token: token },
        signal: AbortSignal.timeout(10000),
      });
      const body = objectValue(await response.json());
      const data = objectValue(body.data);
      if (
        !response.ok ||
        body.code !== 200 ||
        !Array.isArray(data.shops) ||
        !Number.isSafeInteger(data.last_offset) ||
        Number(data.last_offset) < 0
      ) {
        throw new BadGatewayException('GHN chưa trả danh sách điểm lấy hàng hợp lệ.');
      }
      const shops = data.shops.map((entry): GhnShop => {
        const shop = objectValue(entry);
        if (
          !Number.isSafeInteger(shop._id) ||
          Number(shop._id) <= 0 ||
          !Number.isSafeInteger(shop.client_id) ||
          !Number.isSafeInteger(shop.district_id) ||
          Number(shop.district_id) <= 0 ||
          [shop.name, shop.phone, shop.address, shop.ward_code].some(
            (value) => typeof value !== 'string' || !value.trim(),
          )
        ) {
          throw new BadGatewayException('Dữ liệu điểm GHN không hợp lệ.');
        }
        return {
          id: Number(shop._id),
          clientId: Number(shop.client_id),
          districtId: Number(shop.district_id),
          name: String(shop.name),
          phone: String(shop.phone),
          address: String(shop.address),
          wardCode: String(shop.ward_code),
          active: shop.status === 1,
        };
      });
      return { shops, nextOffset: Number(data.last_offset) };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Không kết nối được danh sách điểm lấy hàng GHN.');
    }
  }

  async find(shopId: number): Promise<GhnShop> {
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const result = await this.list(offset);
      const found = result.shops.find((shop) => shop.id === shopId);
      if (found) return found;
      if (!result.shops.length)
        throw new NotFoundException('Điểm GHN không thuộc tài khoản của sàn.');
      if (result.nextOffset <= offset)
        throw new BadGatewayException('GHN trả con trỏ phân trang không hợp lệ.');
      offset = result.nextOffset;
    }
    throw new BadGatewayException(
      'Chưa duyệt hết danh sách GHN. Hãy kiểm tra điểm lấy hàng trực tiếp trên GHN.',
    );
  }
}
