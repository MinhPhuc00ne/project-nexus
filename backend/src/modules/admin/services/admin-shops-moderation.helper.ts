import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { ShopViolationPenaltyLevel } from '@prisma/client';
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import {
  NotificationType,
  ProductStatus,
  Role,
  SellerRequestStatus,
  ShopActionType,
  ViolationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { trustLevelFor } from '../../../core/domain/reputation-policy';
import { ReputationService } from '../../users/services/reputation.service';
import { CreateShopViolationInput } from '../dtos/create-shop-violation.dto';
import { ResolveShopAppealInput } from '../dtos/resolve-shop-appeal.dto';
import { UpdateShopStatusInput } from '../dtos/update-shop-status.dto';
import { WarnShopInput } from '../dtos/warn-shop.dto';

@Injectable()
export class AdminShopsModerationHelper {
  private readonly logger = new Logger('AdminShopsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Suspends or restores store operations, toggling product visibility and logging admin audit entries.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Shop status update payload
   * @returns Updated shop status confirmation
   * @throws NotFoundException when the seller does not exist
   */
  async updateShopStatus(sellerId: string, adminId: string, dto: UpdateShopStatusInput) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Seller store not found.');
    }

    const isSuspending = !dto.isSellerActive;
    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const actionReason =
      dto.reason?.trim() ||
      (isSuspending
        ? 'Store temporarily suspended by Administrator'
        : 'Store restored by Administrator');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      const updatedUser = await tx.user.update({
        where: { id: sellerId },
        data: {
          isSellerActive: dto.isSellerActive,
          isShopSuspended: isSuspending,
          suspensionReason: isSuspending ? actionReason : null,
        },
      });

      if (isSuspending) {
        await tx.product.updateMany({
          where: { sellerId, status: ProductStatus.ACTIVE },
          data: { status: ProductStatus.INACTIVE, hiddenByShopSuspension: true },
        });
      } else {
        await tx.product.updateMany({
          where: { sellerId, status: ProductStatus.INACTIVE, hiddenByShopSuspension: true },
          data: { status: ProductStatus.ACTIVE, hiddenByShopSuspension: false },
        });
      }

      await tx.shopActionLog.create({
        data: {
          shopId: sellerId,
          adminId,
          action: isSuspending ? ShopActionType.SUSPEND : ShopActionType.RESTORE,
          reason: actionReason,
        },
      });

      await publishNotification(
        tx,
        {
          userId: sellerId,
          title: isSuspending
            ? 'Your store has been temporarily suspended ⚠️'
            : 'Your store has been reopened 🎉',
          content: isSuspending
            ? `Your store "${storeName}" was temporarily suspended by an Administrator. Reason: ${actionReason}. All store products have been temporarily hidden. You can still use your account for regular shopping.`
            : `Your store "${storeName}" has been restored. Products hidden due to suspension are visible again; individually hidden products remain unchanged.`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );

      await this.auditLog?.record(
        {
          eventName: 'admin.shop.status_updated',
          operatorId: adminId,
          payload: { sellerId, storeName, isSuspending, reason: actionReason },
        },
        tx,
      );

      return updatedUser;
    });

    this.logger.log(
      `Admin (${adminId}) changed store ${storeName} (${sellerId}) status to ${dto.isSellerActive ? 'ACTIVE' : 'SUSPENDED'}.`,
    );

    return {
      success: true,
      message: isSuspending
        ? `Store "${storeName}" has been suspended. Store products have been hidden from the marketplace.`
        : `Store "${storeName}" has been reopened.`,
      shop: {
        id: result.id,
        storeName,
        isSellerActive: result.isSellerActive,
        isShopSuspended: result.isShopSuspended,
        suspensionReason: result.suspensionReason,
        status: result.isShopSuspended
          ? 'SUSPENDED'
          : result.isSellerActive
            ? 'ACTIVE'
            : 'INACTIVE',
      },
    };
  }

  /**
   * Issues a formal warning to a seller store, optionally deducting reputation points.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the administrator
   * @param dto - Warning details including reason and penalty points
   * @returns Created warning action log
   * @throws NotFoundException when the seller store does not exist
   */
  async warnShop(sellerId: string, adminId: string, dto: WarnShopInput) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Seller store not found.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const penaltyPoints = Math.max(0, dto.penaltyPoints || 0);

    const log = await this.prisma.$transaction(async (tx) => {
      if (penaltyPoints > 0) {
        await this.reputation.adjustScore(
          {
            userId: sellerId,
            deltaPoints: -penaltyPoints,
            reason: `Store policy warning: ${dto.reason.trim()}`,
            skipNotification: true,
          },
          tx,
        );
      }

      const createdLog = await tx.shopActionLog.create({
        data: {
          shopId: sellerId,
          adminId,
          action: ShopActionType.WARN,
          reason: dto.reason.trim(),
        },
        include: {
          admin: { select: { id: true, fullName: true, email: true } },
        },
      });

      await publishNotification(
        tx,
        {
          userId: sellerId,
          title: 'Store policy violation warning ⚠️',
          content: `Your store "${storeName}" received a warning from an Administrator. Reason: ${dto.reason.trim()}.${
            penaltyPoints > 0 ? ` ${penaltyPoints} reputation points were deducted.` : ''
          } Please review your store details and business operations to avoid temporary suspension.`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );

      await this.auditLog?.record(
        {
          eventName: 'admin.shop.warned',
          operatorId: adminId,
          payload: { sellerId, storeName, reason: dto.reason.trim(), penaltyPoints },
        },
        tx,
      );

      return createdLog;
    });

    return {
      success: true,
      message: `Warning notice sent to store "${storeName}" successfully.`,
      warning: {
        id: log.id,
        action: log.action,
        reason: log.reason,
        createdAt: log.createdAt,
        penaltyPointsDeducted: penaltyPoints,
        admin: log.admin,
      },
    };
  }

  /**
   * Records a confirmed violation report for a seller store.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Violation creation payload
   * @returns Created violation record
   * @throws NotFoundException when the seller store does not exist
   */
  async createShopViolation(sellerId: string, adminId: string, dto: CreateShopViolationInput) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Seller store not found.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;

    const violation = await this.prisma.$transaction(async (tx) => {
      const v = await tx.shopViolation.create({
        data: {
          shopId: sellerId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          evidenceUrls: dto.evidenceUrls || [],
          penaltyLevel: dto.penaltyLevel ?? ShopViolationPenaltyLevel.WARNING,
          status: dto.status || ViolationStatus.CONFIRMED,
          resolutionNotes: dto.resolutionNotes?.trim() || null,
          handledByAdminId: adminId,
          handledAt: new Date(),
        },
        include: {
          handledBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      await publishNotification(
        tx,
        {
          userId: sellerId,
          title: 'Confirmed marketplace policy violation ⚠️',
          content: `A violation report was recorded for store "${storeName}": "${dto.title}". Penalty level: ${
            dto.penaltyLevel || 'Warning'
          }.${dto.resolutionNotes ? ` Resolution notes: ${dto.resolutionNotes}` : ''}`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );

      return v;
    });

    return {
      success: true,
      message: `Violation record created for store "${storeName}".`,
      violation,
    };
  }

  /**
   * Retrieves violation records for a specific seller store.
   *
   * @param sellerId - Unique identifier of the seller
   * @returns List of shop violations
   */
  async getShopViolations(sellerId: string) {
    const violations = await this.prisma.shopViolation.findMany({
      where: { shopId: sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        handledBy: { select: { id: true, fullName: true, email: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      total: violations.length,
      items: violations,
    };
  }

  /**
   * Retrieves administrator action audit logs for a seller store.
   *
   * @param sellerId - Unique identifier of the seller
   * @returns List of shop action logs
   */
  async getShopActionLogs(sellerId: string) {
    const logs = await this.prisma.shopActionLog.findMany({
      where: { shopId: sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      total: logs.length,
      items: logs,
    };
  }

  /**
   * Approves an appeal for a suspended or penalized seller store, restores reputation standing,
   * reactivates catalog products, and records an administrative audit log.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the acting administrator
   * @param dto - Appeal resolution details
   * @returns Resolution confirmation and updated store status
   * @throws NotFoundException when the seller store does not exist
   */
  async resolveShopAppeal(sellerId: string, adminId: string, dto: ResolveShopAppealInput) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Seller store not found.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const targetScore = Math.max(50, Math.min(2147483647, dto.restoredScore ?? 100));
    const deltaPoints = targetScore - seller.reputationScore;

    const newTrustLevel = trustLevelFor(targetScore);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: sellerId },
        data: {
          reputationScore: targetScore,
          trustLevel: newTrustLevel,
          isShopSuspended: false,
          suspensionReason: null,
          isSellerActive: true,
        },
      });

      await tx.product.updateMany({
        where: { sellerId, status: ProductStatus.INACTIVE },
        data: { status: ProductStatus.ACTIVE },
      });

      await tx.reputationLog.create({
        data: {
          userId: sellerId,
          deltaPoints,
          balanceAfter: targetScore,
          reason: `Store appeal approved: ${dto.reason.trim()}`,
        },
      });

      const actionLog = await tx.shopActionLog.create({
        data: {
          shopId: sellerId,
          adminId,
          action: ShopActionType.RESTORE,
          reason: dto.reason.trim(),
        },
        include: {
          admin: { select: { id: true, fullName: true, email: true } },
        },
      });

      await publishNotification(
        tx,
        {
          userId: sellerId,
          title: 'Your store account has been restored!',
          content: `Your appeal was approved by Administration. Store "${storeName}" has been unlocked and your reputation score has been restored to ${targetScore} (${newTrustLevel}). Your product listings are active again.`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );

      await this.auditLog?.record(
        {
          eventName: 'admin.shop.appeal_resolved',
          operatorId: adminId,
          payload: { sellerId, storeName, restoredScore: targetScore, newTrustLevel },
        },
        tx,
      );

      return { updatedUser, actionLog };
    });

    this.logger.log(
      `Admin (${adminId}) approved appeal for store '${storeName}' (${sellerId}). Restored score: ${targetScore}, Trust: ${newTrustLevel}.`,
    );

    return {
      success: true,
      message: `Approved appeal and restored operations for store "${storeName}".`,
      shop: {
        id: seller.id,
        storeName,
        reputationScore: targetScore,
        trustLevel: newTrustLevel,
        isShopSuspended: false,
        restoredByAdmin: result.actionLog.admin,
      },
    };
  }
}
