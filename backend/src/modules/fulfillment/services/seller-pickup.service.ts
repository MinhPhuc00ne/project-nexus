import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ShopShippingProfileService } from './shop-shipping-profile.service';
import { SellerPickupInput } from '../dtos/seller-pickup.dto';
import { GhnLogisticsService } from './ghn-logistics.service';
import { GhnShopApiService } from './ghn-shop-api.service';
import { GhnAccountStatus } from '@prisma/client';
import { GhnEnvironment, ghnEnvironment } from './ghn-context';

import {
  SellerPickupView,
  phoneKey,
  pickupFingerprint,
  pickupView,
} from './seller-ghn-account.util';

/** Synchronizes carrier accounts using shop profiles as the only pickup address source. */
@Injectable()
export class SellerPickupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logistics: GhnLogisticsService,
    private readonly shops: GhnShopApiService,
    private readonly profiles: ShopShippingProfileService,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /** Reads the carrier environment. @returns Sandbox or production. */
  environment(): GhnEnvironment {
    return ghnEnvironment(this.config);
  }

  /** Synchronizes the current shop. @param sellerId Shop owner. @returns Current pickup view. */
  async mine(sellerId: string): Promise<SellerPickupView | null> {
    return this.synchronize(sellerId);
  }

  /** Lists carrier accounts awaiting verification. @returns Current profiles and carrier metadata. */
  async pending(): Promise<SellerPickupView[]> {
    const accounts = await this.prisma.sellerGhnAccount.findMany({
      where: { environment: ghnEnvironment(this.config), status: GhnAccountStatus.PENDING },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
    return Promise.all(
      accounts.map(async (account) =>
        pickupView(account, await this.profiles.read(account.sellerId, this.prisma, true)),
      ),
    );
  }

  /** Reconnects a matching profile. @param sellerId Shop owner. @param dto Expected profile. @returns Verified view. */
  async propose(sellerId: string, dto: SellerPickupInput): Promise<SellerPickupView> {
    return this.synchronize(sellerId, dto);
  }

  /** Invalidates both environments atomically. @param tx Profile transaction. @param sellerId Shop owner. @returns Completion. */
  async invalidate(tx: Prisma.TransactionClient, sellerId: string): Promise<void> {
    await tx.sellerGhnAccount.updateMany({
      where: { sellerId },
      data: {
        status: 'PENDING',
        verifiedAt: null,
        profileFingerprint: null,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Serializes carrier registration with shop profile changes.
   * @param sellerId Shop owner.
   * @param expected Optional expected profile supplied by the caller.
   * @returns Verified carrier account and current shop address.
   * @throws BadRequestException for invalid profiles or carrier responses.
   */
  async synchronize(sellerId: string, expected?: SellerPickupInput): Promise<SellerPickupView> {
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
                expected[key as keyof SellerPickupInput]?.toString().trim() !==
                dto[key as keyof typeof dto]?.toString().trim(),
            ))
        ) {
          throw new BadRequestException(
            'Pickup point must use the shop profile address. Please update your shop profile first.',
          );
        }
        if ((dto.latitude !== undefined) !== (dto.longitude !== undefined)) {
          throw new BadRequestException(
            'Both latitude and longitude must be provided or both omitted.',
          );
        }
        if (
          !/^(0|\+?84)\d{9,10}$/.test(dto.phone.replace(/[\s.-]/g, '')) ||
          [dto.name, dto.street, dto.city, dto.district, dto.ward].some((value) => !value.trim())
        ) {
          throw new BadRequestException('Missing pickup address or valid Vietnam phone number.');
        }
        const location = await this.logistics.resolveDistrictAndWard(
          dto.city,
          dto.district,
          dto.ward,
        );
        if (!location?.districtId || !location.wardCode)
          throw new BadRequestException('GHN could not resolve the pickup address.');
        const environment = ghnEnvironment(this.config);
        const data = {
          profileFingerprint: pickupFingerprint(dto),
          districtId: location.districtId,
          wardCode: location.wardCode,
          status: GhnAccountStatus.PENDING,
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
        const point = await tx.sellerGhnAccount.upsert({
          where: { sellerId_environment: { sellerId, environment } },
          create: { sellerId, environment, ...data },
          update: { version: { increment: 1 } },
        });
        const sameAddress =
          point.profileFingerprint === data.profileFingerprint &&
          point.districtId === data.districtId &&
          point.wardCode === data.wardCode;
        if (
          sameAddress &&
          point.status === GhnAccountStatus.VERIFIED &&
          point.ghnShopId &&
          point.verifiedAt &&
          point.carrierAddress &&
          point.carrierPhone
        ) {
          return pickupView(point, dto);
        }
        const assigned = await tx.sellerGhnAccount.findMany({
          where: { environment, sellerId: { not: sellerId }, ghnShopId: { not: null } },
          select: { ghnShopId: true },
        });
        const shop = await this.shops.ensure(
          {
            name: dto.name.trim(),
            phone: phoneKey(dto.phone),
            address: `${dto.street}, ${dto.ward}, ${dto.district}, ${dto.city}`,
            districtId: data.districtId,
            wardCode: data.wardCode,
          },
          assigned.flatMap((entry) => (entry.ghnShopId ? [entry.ghnShopId] : [])),
        );
        if (
          !shop.active ||
          shop.districtId !== data.districtId ||
          shop.wardCode !== data.wardCode ||
          phoneKey(shop.phone) !== phoneKey(dto.phone)
        ) {
          throw new BadRequestException(
            'GHN returned a pickup point that does not match the saved address.',
          );
        }
        const updated = await tx.sellerGhnAccount.update({
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
        return pickupView(updated, dto);
      },
      { timeout: 60000, maxWait: 10000 },
    );
  }

  /**
   * Manually verifies carrier metadata against the current profile.
   * @param pointId Stable account identifier retained from the former pickup record.
   * @param shopId Carrier shop identifier.
   * @param adminId Reviewing administrator.
   * @returns Verified account and current profile.
   * @throws ConflictException for concurrent profile changes or duplicate carrier ownership.
   * @throws BadRequestException for a mismatched carrier address.
   * @throws NotFoundException for a missing account in this environment.
   */
  async verify(pointId: string, shopId: number, adminId: string): Promise<SellerPickupView> {
    const account = await this.prisma.sellerGhnAccount.findUnique({ where: { id: pointId } });
    if (!account || account.environment !== ghnEnvironment(this.config))
      throw new NotFoundException('Pickup point not found in the current environment.');
    const point = pickupView(account, await this.profiles.read(account.sellerId));
    const expectedFingerprint = pickupFingerprint(point);
    const location = await this.logistics.resolveDistrictAndWard(
      point.city,
      point.district,
      point.ward,
    );
    if (!location?.districtId || !location.wardCode)
      throw new BadRequestException('GHN could not resolve the pickup address.');
    const shop = await this.shops.find(shopId);
    const addressKey = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\u0111/g, 'd')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (
      !shop.active ||
      shop.districtId !== location?.districtId ||
      shop.wardCode !== location?.wardCode ||
      phoneKey(shop.phone) !== phoneKey(point.phone)
    ) {
      throw new BadRequestException(
        'GHN point must be active and match the declared district/ward and phone number.',
      );
    }
    if (!` ${addressKey(shop.address)} `.includes(` ${addressKey(point.street)} `)) {
      throw new BadRequestException(
        'Street/house address does not match the GHN point. Please reconcile before verifying.',
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${point.sellerId} FOR UPDATE`;
        const profile = await this.profiles.read(point.sellerId, tx);
        if (pickupFingerprint(profile) !== expectedFingerprint)
          throw new ConflictException('Pickup point no longer matches the shop profile.');
        const updated = await tx.sellerGhnAccount.updateMany({
          where: { id: pointId, version: point.version },
          data: {
            status: 'VERIFIED',
            profileFingerprint: expectedFingerprint,
            districtId: location.districtId,
            wardCode: location.wardCode,
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
          throw new ConflictException('Seller just updated the pickup point. Please verify again.');
        await this.auditLog?.record(
          {
            eventName: 'admin.pickup_point.verified',
            operatorId: adminId,
            payload: {
              pickupPointId: pointId,
              sellerId: point.sellerId,
              ghnShopId: shop.id,
              environment: account.environment,
            },
          },
          tx,
        );
        return pickupView(
          await tx.sellerGhnAccount.findUniqueOrThrow({ where: { id: pointId } }),
          profile,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'This GHN Shop ID is already linked to another seller in this environment.',
        );
      }
      throw error;
    }
  }

  /** Requires a current carrier registration. @param sellerId Shop owner. @returns Verified pickup view. @throws BadRequestException for incomplete registration. */
  async requireVerified(sellerId: string): Promise<SellerPickupView> {
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
        'GHN pickup point has not been set up. Please save a pickup address in shipping settings.',
      );
    }
    return point;
  }
}
