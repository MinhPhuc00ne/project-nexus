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

export interface GhnShopInput {
  name: string;
  phone: string;
  address: string;
  districtId: number;
  wardCode: string;
}

@Injectable()
export class GhnShopApiService {
  constructor(private readonly config: ConfigService) {}

  // Recover an earlier registration after a timeout before attempting a new one.
  async ensure(input: GhnShopInput, excludedIds: number[]): Promise<GhnShop> {
    const key = (value: string): string => value.normalize('NFC').trim().toLowerCase();
    const phone = (value: string): string => value.replace(/[\s.-]/g, '').replace(/^\+?84/, '0');
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const result = await this.list(offset);
      const found = result.shops.find(
        (shop) =>
          shop.active &&
          !excludedIds.includes(shop.id) &&
          shop.districtId === input.districtId &&
          shop.wardCode === input.wardCode &&
          phone(shop.phone) === phone(input.phone) &&
          key(shop.name) === key(input.name) &&
          key(shop.address) === key(input.address),
      );
      if (found) return found;
      if (!result.shops.length || result.nextOffset === 0 || result.nextOffset <= offset) {
        return this.register(input);
      }
      offset = result.nextOffset;
    }
    throw new BadGatewayException(
      'Unable to finish scanning GHN pickup points. Please try again later.',
    );
  }

  private async register(input: GhnShopInput): Promise<GhnShop> {
    const token = this.config.get<string>('GHN_TOKEN');
    const parentShop = Number(this.config.get<string>('GHN_SHOP_ID'));
    if (!token?.trim() || !Number.isSafeInteger(parentShop) || parentShop <= 0)
      throw new BadGatewayException('Marketplace GHN account and shop are not configured.');
    const raw = (
      this.config.get<string>('GHN_API_URL') || 'https://online-gateway.ghn.vn/shiip/public-api/v2'
    ).replace(/\/+$/, '');
    const root = raw.endsWith('/v2') ? raw : `${raw}/v2`;
    try {
      const response = await fetch(`${root}/shop/register`, {
        method: 'POST',
        headers: { Token: token, ShopId: String(parentShop), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          address: input.address,
          district_id: input.districtId,
          ward_code: input.wardCode,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const body = objectValue(await response.json());
      const id = objectValue(body.data).shop_id;
      if (!response.ok || body.code !== 200 || !Number.isSafeInteger(id) || Number(id) <= 0)
        throw new BadGatewayException(
          'GHN did not confirm the pickup point. Check the address and try saving again.',
        );
      return this.find(Number(id));
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(
        'GHN connection was interrupted. Save again so the system can check the created point.',
      );
    }
  }

  async list(offset = 0, limit = 100): Promise<{ shops: GhnShop[]; nextOffset: number }> {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException('Invalid GHN pagination parameters.');
    }
    const token = this.config.get<string>('GHN_TOKEN');
    if (!token?.trim()) throw new BadGatewayException('GHN_TOKEN is not configured.');
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
      const rawShops = Array.isArray(data.shops)
        ? data.shops
        : data.shops === null || data.shops === undefined
          ? []
          : null;
      if (
        !response.ok ||
        body.code !== 200 ||
        rawShops === null ||
        !Number.isSafeInteger(data.last_offset) ||
        Number(data.last_offset) < 0
      ) {
        throw new BadGatewayException('GHN did not return a valid pickup point list.');
      }
      const shops: GhnShop[] = [];
      for (const entry of rawShops) {
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
          continue;
        }
        shops.push({
          id: Number(shop._id),
          clientId: Number(shop.client_id),
          districtId: Number(shop.district_id),
          name: String(shop.name),
          phone: String(shop.phone),
          address: String(shop.address),
          wardCode: String(shop.ward_code),
          active: shop.status === 1,
        });
      }
      return { shops, nextOffset: Number(data.last_offset) };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Unable to connect to the GHN pickup point list.');
    }
  }

  async find(shopId: number): Promise<GhnShop> {
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const result = await this.list(offset);
      const found = result.shops.find((shop) => shop.id === shopId);
      if (found) return found;
      if (!result.shops.length || result.nextOffset === 0 || result.nextOffset <= offset) {
        throw new NotFoundException('GHN pickup point does not belong to the marketplace account.');
      }
      offset = result.nextOffset;
    }
    throw new BadGatewayException(
      'Unable to scan the entire GHN list. Please check the pickup point directly on GHN.',
    );
  }
}
