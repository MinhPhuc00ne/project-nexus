import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

export interface ShopShippingProfile {
  name: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  street: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class ShopShippingProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async read(
    sellerId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<ShopShippingProfile> {
    const user = await db.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: 'APPROVED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: { where: { isDefault: true }, take: 1 },
      },
    });
    if (!user || user.role !== 'SELLER')
      throw new BadRequestException('Chỉ tài khoản seller được khai báo điểm lấy hàng.');
    const profile = user.sellerUpgradeRequests[0];
    const address = profile ?? user.addresses[0];
    if (
      !address?.street?.trim() ||
      !address.city?.trim() ||
      !address.district?.trim() ||
      !address.ward?.trim()
    ) {
      throw new BadRequestException('Vui lòng cập nhật đầy đủ địa chỉ trong hồ sơ gian hàng.');
    }
    return {
      name: (profile?.storeName || user.fullName).trim(),
      phone: (profile?.phone || user.phoneNumber || '').trim(),
      street: address.street.trim(),
      city: address.city.trim(),
      district: address.district.trim(),
      ward: address.ward.trim(),
      latitude:
        address.latitude === null || address.latitude === undefined
          ? undefined
          : Number(address.latitude),
      longitude:
        address.longitude === null || address.longitude === undefined
          ? undefined
          : Number(address.longitude),
    };
  }
}
