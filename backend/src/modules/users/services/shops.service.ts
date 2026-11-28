import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { NotificationType, Role, SellerRequestStatus } from '@prisma/client';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { NotificationPublisher } from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SellerPickupService } from '../../fulfillment/services/seller-pickup.service';
import { UpdateShopProfileInput } from '../dtos/update-shop-profile.dto';

/**
 * The shop side of a seller account: storefront details, the pickup address a
 * carrier collects from, and the reputation a buyer sees.
 *
 * This was 256 lines inside UsersService, which also held personal profiles,
 * seller onboarding and account mode. A shop is a different thing from the
 * person who owns it, changes for different reasons, and is the half that
 * fulfillment and the storefront care about.
 */
@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pickup: SellerPickupService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}
  /**
   * Retrieves merchant shop profile, operating addresses, and reputation scores.
   *
   * @param sellerId - Unique identifier of the seller
   * @returns Shop profile entity
   * @throws NotFoundException when seller does not exist
   */
  async getShopProfile(sellerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'User account not found.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }

    const latestApproved = user.sellerUpgradeRequests[0];
    const defaultAddress = user.addresses[0];

    return {
      id: user.id,
      storeName: latestApproved?.storeName || user.fullName,
      shopAvatarUrl: user.shopAvatarUrl,
      avatarUrl: user.shopAvatarUrl,
      storeDescription: latestApproved?.storeDescription || null,
      phone: latestApproved?.phone || user.phoneNumber,
      businessEmail: latestApproved?.businessEmail || user.email,
      address: latestApproved
        ? {
            street: latestApproved.street,
            ward: latestApproved.ward,
            district: latestApproved.district,
            city: latestApproved.city,
            formattedAddress: latestApproved.formattedAddress,
            latitude: latestApproved.latitude ? Number(latestApproved.latitude) : null,
            longitude: latestApproved.longitude ? Number(latestApproved.longitude) : null,
            placeId: latestApproved.placeId,
          }
        : defaultAddress
          ? {
              street: defaultAddress.street,
              ward: defaultAddress.ward,
              district: defaultAddress.district,
              city: defaultAddress.city,
              formattedAddress: defaultAddress.formattedAddress,
              latitude: defaultAddress.latitude ? Number(defaultAddress.latitude) : null,
              longitude: defaultAddress.longitude ? Number(defaultAddress.longitude) : null,
              placeId: defaultAddress.placeId,
            }
          : null,
      isSellerActive: user.isSellerActive,
      isShopSuspended: user.isShopSuspended,
      suspensionReason: user.suspensionReason,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      createdAt: latestApproved?.createdAt || user.createdAt,
      updatedAt: latestApproved?.updatedAt || user.updatedAt,
    };
  }

  /**
   * Updates merchant shop profile including branding, description, contact details, and pickup address.
   *
   * @param sellerId - Unique identifier of the seller
   * @param dto - Shop update payload
   * @returns Updated shop profile
   * @throws NotFoundException when user is not found
   * @throws ForbiddenException when user is not authorized or shop is suspended
   */
  async updateShopProfile(sellerId: string, dto: UpdateShopProfileInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        message: 'User account not found.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }

    if (user.role !== Role.SELLER && user.role !== Role.ADMIN) {
      throw new ForbiddenException({
        message: 'Only Seller accounts have permission to edit shop information.',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }

    if (user.isShopSuspended) {
      throw new ForbiddenException({
        message: `Your shop is currently suspended by Admin.${
          user.suspensionReason ? ` Reason: ${user.suspensionReason}` : ''
        } Cannot edit shop profile.`,
        errorCode: AppErrorCode.SHOP_SUSPENDED,
      });
    }

    if (dto.storeName) {
      assertCleanContent(dto.storeName, 'Shop name');
    }
    if (dto.storeDescription) {
      assertCleanContent(dto.storeDescription, 'Shop description');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: sellerId } });
      if (current.isShopSuspended) {
        throw new ForbiddenException({
          message: 'Shop is suspended.',
          errorCode: AppErrorCode.SHOP_SUSPENDED,
        });
      }
      const latestApproved = await tx.sellerUpgradeRequest.findFirst({
        where: { userId: sellerId, status: SellerRequestStatus.APPROVED },
        orderBy: { updatedAt: 'desc' },
      });
      if (dto.shopAvatarUrl !== undefined) {
        await tx.user.update({
          where: { id: sellerId },
          data: { shopAvatarUrl: dto.shopAvatarUrl?.trim() || null },
        });
      }

      let updatedRequest;
      if (latestApproved) {
        updatedRequest = await tx.sellerUpgradeRequest.update({
          where: { id: latestApproved.id },
          data: {
            storeName: dto.storeName?.trim() || latestApproved.storeName,
            storeDescription:
              dto.storeDescription !== undefined
                ? dto.storeDescription?.trim() || null
                : latestApproved.storeDescription,
            phone: dto.phone?.trim() || latestApproved.phone,
            businessEmail:
              dto.businessEmail !== undefined
                ? dto.businessEmail?.trim() || null
                : latestApproved.businessEmail,
            street: dto.street !== undefined ? dto.street?.trim() || null : latestApproved.street,
            ward: dto.ward !== undefined ? dto.ward?.trim() || null : latestApproved.ward,
            district:
              dto.district !== undefined ? dto.district?.trim() || null : latestApproved.district,
            city: dto.city !== undefined ? dto.city?.trim() || null : latestApproved.city,
            latitude:
              dto.latitude !== undefined
                ? dto.latitude !== null
                  ? Number(dto.latitude)
                  : null
                : latestApproved.latitude,
            longitude:
              dto.longitude !== undefined
                ? dto.longitude !== null
                  ? Number(dto.longitude)
                  : null
                : latestApproved.longitude,
            formattedAddress:
              dto.formattedAddress !== undefined
                ? dto.formattedAddress?.trim() || null
                : latestApproved.formattedAddress,
            placeId:
              dto.placeId !== undefined ? dto.placeId?.trim() || null : latestApproved.placeId,
            updatedAt: new Date(),
          },
        });
      } else {
        updatedRequest = await tx.sellerUpgradeRequest.create({
          data: {
            userId: sellerId,
            storeName: dto.storeName?.trim() || user.fullName,
            storeDescription: dto.storeDescription?.trim() || null,
            phone: dto.phone?.trim() || user.phoneNumber || '0900000000',
            businessEmail: dto.businessEmail?.trim() || user.email,
            street: dto.street?.trim() || null,
            ward: dto.ward?.trim() || null,
            district: dto.district?.trim() || null,
            city: dto.city?.trim() || null,
            latitude:
              dto.latitude !== undefined && dto.latitude !== null ? Number(dto.latitude) : null,
            longitude:
              dto.longitude !== undefined && dto.longitude !== null ? Number(dto.longitude) : null,
            formattedAddress: dto.formattedAddress?.trim() || null,
            placeId: dto.placeId?.trim() || null,
            status: SellerRequestStatus.APPROVED,
          },
        });
      }

      const shippingChanged =
        !latestApproved ||
        ['storeName', 'phone', 'street', 'ward', 'district', 'city', 'latitude', 'longitude'].some(
          (key) =>
            String(latestApproved[key as keyof typeof latestApproved] ?? '') !==
            String(updatedRequest[key as keyof typeof updatedRequest] ?? ''),
        );
      if (shippingChanged) await this.pickup.invalidate(tx, sellerId);
      return updatedRequest;
    });

    let shippingSync: 'VERIFIED' | 'PENDING' = 'PENDING';
    try {
      await this.pickup.synchronize(sellerId);
      shippingSync = 'VERIFIED';
    } catch {
      this.logger.warn(
        `GHN pickup sync pending for seller ${sellerId}; retry on next shipping request.`,
      );
      await notifyAllAdmins(
        this.prisma,
        {
          title: 'Seller pickup point awaiting GHN verification',
          content: `Shop "${result.storeName}" updated its pickup details and is awaiting GHN verification.`,
          type: NotificationType.SYSTEM,
          targetUrl: '/admin/stores',
        },
        this.notifications,
      );
    }

    this.logger.log(`Seller ${sellerId} updated shop profile: ${result.storeName}`);

    return {
      success: true,
      message: 'Shop profile updated successfully!',
      shippingSync,
      shop: {
        id: sellerId,
        shopAvatarUrl:
          dto.shopAvatarUrl !== undefined ? dto.shopAvatarUrl?.trim() || null : user.shopAvatarUrl,
        avatarUrl:
          dto.shopAvatarUrl !== undefined ? dto.shopAvatarUrl?.trim() || null : user.shopAvatarUrl,
        storeName: result.storeName,
        storeDescription: result.storeDescription,
        phone: result.phone,
        businessEmail: result.businessEmail,
        address: {
          street: result.street,
          ward: result.ward,
          district: result.district,
          city: result.city,
          formattedAddress: result.formattedAddress,
          latitude: result.latitude ? Number(result.latitude) : null,
          longitude: result.longitude ? Number(result.longitude) : null,
          placeId: result.placeId,
        },
        updatedAt: result.updatedAt,
      },
    };
  }
}
