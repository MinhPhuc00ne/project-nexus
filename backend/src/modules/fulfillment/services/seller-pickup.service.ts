import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SellerPickupPoint } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ShopShippingProfileService } from '../../users/services/shop-shipping-profile.service';
import { SellerPickupDto } from '../dtos/seller-pickup.dto';
import { GhnLogisticsService } from './ghn-logistics.service';
import { GhnShopApiService } from './ghn-shop-api.service';
import { ghnEnvironment, GhnEnvironment } from './ghn-context';

const phoneKey = (value: string): string => value.replace(/[\s.-]/g, '').replace(/^\+?84/, '0');

@Injectable()
export class SellerPickupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logistics: GhnLogisticsService,
    private readonly shops: GhnShopApiService,
    private readonly profiles: ShopShippingProfileService,
  ) {}

  environment(): GhnEnvironment {
    return ghnEnvironment(this.config);
  }

  async mine(sellerId: string): Promise<SellerPickupPoint | null> {
    return this.synchronize(sellerId);
  }

  async pending(): Promise<SellerPickupPoint[]> {
    return this.prisma.sellerPickupPoint.findMany({
      where: { environment: ghnEnvironment(this.config), status: 'PENDING' },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
  }

  async propose(sellerId: string, dto: SellerPickupDto): Promise<SellerPickupPoint> {
    return this.synchronize(sellerId, dto);
  }

  async invalidate(tx: Prisma.TransactionClient, sellerId: string): Promise<void> {
    // Invalidate both environments atomically with the profile change.
    await tx.sellerPickupPoint.updateMany({
      where: { sellerId },
      data: { status: 'PENDING', verifiedAt: null, version: { increment: 1 } },
    });
  }

  async synchronize(sellerId: string, expected?: SellerPickupDto): Promise<SellerPickupPoint> {
    return this.prisma.$transaction(
      async (tx) => {
        // Profile saves and GHN setup share the same lock and always read fresh data.
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
        const dto = await this.profiles.read(sellerId, tx);
        if (
          expected &&
          (phoneKey(expected.phone) !== phoneKey(dto.phone) ||
            ['name', 'city', 'district', 'ward', 'street'].some(
              (key) =>
                expected[key as keyof SellerPickupDto]?.toString().trim() !==
                dto[key as keyof typeof dto]?.toString().trim(),
            ))
        ) {
          throw new BadRequestException(
            'Điểm lấy hàng phải dùng địa chỉ hồ sơ gian hàng. Hãy cập nhật hồ sơ trước.',
          );
        }
        if ((dto.latitude !== undefined) !== (dto.longitude !== undefined)) {
          throw new BadRequestException('Phải cung cấp cả vĩ độ và kinh độ hoặc bỏ trống cả hai.');
        }
        if (
          !/^(0|\+?84)\d{9,10}$/.test(dto.phone.replace(/[\s.-]/g, '')) ||
          [dto.name, dto.street, dto.city, dto.district, dto.ward].some((value) => !value.trim())
        ) {
          throw new BadRequestException(
            'Thiếu địa chỉ lấy hàng hoặc số điện thoại Việt Nam hợp lệ.',
          );
        }
        const location = await this.logistics.resolveDistrictAndWard(
          dto.city,
          dto.district,
          dto.ward,
        );
        if (!location?.districtId || !location.wardCode)
          throw new BadRequestException('GHN không xác định được địa chỉ lấy hàng.');
        const environment = ghnEnvironment(this.config);
        const data = {
          name: dto.name.trim(),
          phone: phoneKey(dto.phone),
          city: dto.city.trim(),
          district: dto.district.trim(),
          ward: dto.ward.trim(),
          street: dto.street.trim(),
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          districtId: location.districtId,
          wardCode: location.wardCode,
          status: 'PENDING',
          ghnShopId: null,
          ghnClientId: null,
          carrierName: null,
          carrierPhone: null,
          carrierAddress: null,
          verifiedBy: null,
          verifiedAt: null,
        };
        // Upsert locks this seller/environment row until commit. Concurrent saves
        // wait, then observe the completed binding instead of registering twice.
        const point = await tx.sellerPickupPoint.upsert({
          where: { sellerId_environment: { sellerId, environment } },
          create: { sellerId, environment, ...data },
          update: { version: { increment: 1 } },
        });
        const sameAddress = [
          'name',
          'phone',
          'city',
          'district',
          'ward',
          'street',
          'districtId',
          'wardCode',
        ].every((key) => point[key as keyof typeof point] === data[key as keyof typeof data]);
        if (
          sameAddress &&
          point.status === 'VERIFIED' &&
          point.ghnShopId &&
          point.verifiedAt &&
          point.carrierAddress &&
          point.carrierPhone
        ) {
          return tx.sellerPickupPoint.update({
            where: { id: point.id },
            data: { latitude: data.latitude, longitude: data.longitude },
          });
        }
        const assigned = await tx.sellerPickupPoint.findMany({
          where: { environment, sellerId: { not: sellerId }, ghnShopId: { not: null } },
          select: { ghnShopId: true },
        });
        const shop = await this.shops.ensure(
          {
            name: data.name,
            phone: data.phone,
            address: `${data.street}, ${data.ward}, ${data.district}, ${data.city}`,
            districtId: data.districtId,
            wardCode: data.wardCode,
          },
          assigned.flatMap((entry) => (entry.ghnShopId ? [entry.ghnShopId] : [])),
        );
        if (
          !shop.active ||
          shop.districtId !== data.districtId ||
          shop.wardCode !== data.wardCode ||
          phoneKey(shop.phone) !== data.phone
        ) {
          throw new BadRequestException('GHN trả điểm lấy hàng không khớp địa chỉ đã lưu.');
        }
        return tx.sellerPickupPoint.update({
          where: { id: point.id },
          data: {
            ...data,
            status: 'VERIFIED',
            ghnShopId: shop.id,
            ghnClientId: shop.clientId,
            carrierName: shop.name,
            carrierPhone: shop.phone,
            carrierAddress: shop.address,
            verifiedBy: null,
            verifiedAt: new Date(),
          },
        });
      },
      { timeout: 60000, maxWait: 10000 },
    );
  }

  async verify(pointId: string, shopId: number, adminId: string): Promise<SellerPickupPoint> {
    const point = await this.prisma.sellerPickupPoint.findUnique({ where: { id: pointId } });
    if (!point || point.environment !== ghnEnvironment(this.config))
      throw new NotFoundException('Không tìm thấy điểm lấy hàng trong môi trường hiện tại.');
    const shop = await this.shops.find(shopId);
    const addressKey = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (
      !shop.active ||
      shop.districtId !== point.districtId ||
      shop.wardCode !== point.wardCode ||
      phoneKey(shop.phone) !== phoneKey(point.phone)
    ) {
      throw new BadRequestException(
        'Điểm GHN phải đang hoạt động, khớp quận/phường và số điện thoại đã khai báo.',
      );
    }
    if (!` ${addressKey(shop.address)} `.includes(` ${addressKey(point.street)} `)) {
      throw new BadRequestException(
        'Địa chỉ đường/số nhà không khớp điểm GHN. Hãy đối chiếu lại trước khi xác minh.',
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${point.sellerId} FOR UPDATE`;
        const profile = await this.profiles.read(point.sellerId, tx);
        if (
          phoneKey(profile.phone) !== phoneKey(point.phone) ||
          ['name', 'city', 'district', 'ward', 'street'].some(
            (key) =>
              String(profile[key as keyof typeof profile] ?? '') !==
              String(point[key as keyof typeof point] ?? ''),
          )
        )
          throw new ConflictException('Điểm lấy hàng không còn khớp hồ sơ gian hàng.');
        const updated = await tx.sellerPickupPoint.updateMany({
          where: { id: pointId, version: point.version },
          data: {
            status: 'VERIFIED',
            ghnShopId: shop.id,
            ghnClientId: shop.clientId,
            carrierName: shop.name,
            carrierPhone: shop.phone,
            carrierAddress: shop.address,
            verifiedBy: adminId,
            verifiedAt: new Date(),
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1)
          throw new ConflictException('Seller vừa thay đổi điểm lấy hàng. Hãy kiểm tra lại.');
        return tx.sellerPickupPoint.findUniqueOrThrow({ where: { id: pointId } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Shop ID GHN đã được gắn với seller khác trong môi trường này.',
        );
      }
      throw error;
    }
  }

  async requireVerified(sellerId: string): Promise<SellerPickupPoint> {
    const point = await this.synchronize(sellerId);
    if (
      !point ||
      point.status !== 'VERIFIED' ||
      !point.ghnShopId ||
      !point.verifiedAt ||
      !point.carrierAddress ||
      !point.carrierPhone
    ) {
      throw new BadRequestException(
        'Chưa thiết lập điểm lấy hàng GHN. Vui lòng lưu địa chỉ lấy hàng trong cài đặt vận chuyển.',
      );
    }
    return point;
  }
}
