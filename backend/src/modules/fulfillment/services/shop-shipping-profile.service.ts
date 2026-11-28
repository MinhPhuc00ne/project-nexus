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

  /**
   * Reads the approved shop address before any personal address fallback.
   * @param sellerId Shop owner.
   * @param db Database client or current transaction.
   * @param allowIncomplete Allows administrative display of profiles awaiting completion.
   * @returns The current shop contact and address.
   * @throws BadRequestException for non-sellers or incomplete shipping profiles.
   */
  async read(
    sellerId: string,
    db: Prisma.TransactionClient = this.prisma,
    allowIncomplete = false,
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
      throw new BadRequestException('Only seller accounts can register a pickup point.');
    const profile = user.sellerUpgradeRequests[0];
    const address = profile ?? user.addresses[0];
    if (
      !allowIncomplete &&
      (!address?.street?.trim() ||
        !address.city?.trim() ||
        !address.district?.trim() ||
        !address.ward?.trim())
    ) {
      throw new BadRequestException('Please complete your full address in the shop profile.');
    }
    return {
      name: (profile?.storeName || user.fullName).trim(),
      phone: (profile?.phone || user.phoneNumber || '').trim(),
      street: address?.street?.trim() ?? '',
      city: address?.city?.trim() ?? '',
      district: address?.district?.trim() ?? '',
      ward: address?.ward?.trim() ?? '',
      latitude:
        address?.latitude === null || address?.latitude === undefined
          ? undefined
          : Number(address.latitude),
      longitude:
        address?.longitude === null || address?.longitude === undefined
          ? undefined
          : Number(address.longitude),
    };
  }
}
