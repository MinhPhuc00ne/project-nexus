import { ShopViolationPenaltyLevel } from '@prisma/client';
import { Logger, NotFoundException } from '@nestjs/common';
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
import { CreateShopViolationDto } from '../dtos/create-shop-violation.dto';
import { ResolveShopAppealDto } from '../dtos/resolve-shop-appeal.dto';
import { UpdateShopStatusDto } from '../dtos/update-shop-status.dto';
import { WarnShopDto } from '../dtos/warn-shop.dto';

export class AdminShopsModerationHelper {
  private readonly logger = new Logger('AdminShopsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
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
  async updateShopStatus(sellerId: string, adminId: string, dto: UpdateShopStatusDto) {
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
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const isSuspending = !dto.isSellerActive;
    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const actionReason =
      dto.reason?.trim() ||
      (isSuspending
        ? 'Gian hàng bị Quản trị viên tạm đình chỉ hoạt động'
        : 'Gian hàng được Quản trị viên khôi phục hoạt động');

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

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: isSuspending
            ? 'Gian hàng của bạn đã bị tạm đình chỉ hoạt động ⚠️'
            : 'Gian hàng của bạn đã được mở lại 🎉',
          content: isSuspending
            ? `Gian hàng "${storeName}" đã bị Quản trị viên tạm đình chỉ. Lý do: ${actionReason}. Toàn bộ sản phẩm của gian hàng đã được tạm ẩn. Bạn vẫn có thể sử dụng tài khoản để mua sắm bình thường.`
            : `Gian hàng "${storeName}" đã được khôi phục. Sản phẩm bị ẩn do đình chỉ đã được hiển thị lại; sản phẩm bị ẩn riêng vẫn giữ nguyên.`,
          type: NotificationType.SYSTEM,
        },
      });

      return updatedUser;
    });

    this.logger.log(
      `Admin (${adminId}) đã chuyển trạng thái gian hàng ${storeName} (${sellerId}) thành ${dto.isSellerActive ? 'ACTIVE' : 'SUSPENDED'}.`,
    );

    return {
      success: true,
      message: isSuspending
        ? `Đã tạm đình chỉ hoạt động gian hàng "${storeName}". Sản phẩm của shop đã được ẩn khỏi sàn.`
        : `Đã mở lại hoạt động cho gian hàng "${storeName}".`,
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
  async warnShop(sellerId: string, adminId: string, dto: WarnShopDto) {
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
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const penaltyPoints = Math.max(0, dto.penaltyPoints || 0);

    const log = await this.prisma.$transaction(async (tx) => {
      if (penaltyPoints > 0) {
        await this.reputation.adjustScore(
          {
            userId: sellerId,
            deltaPoints: -penaltyPoints,
            reason: `Cảnh cáo vi phạm gian hàng: ${dto.reason.trim()}`,
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

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Cảnh cáo vi phạm quy định gian hàng ⚠️',
          content: `Gian hàng "${storeName}" đã nhận cảnh cáo từ Quản trị viên. Lý do: ${dto.reason.trim()}.${
            penaltyPoints > 0 ? ` Tài khoản bị trừ ${penaltyPoints} điểm uy tín.` : ''
          } Vui lòng rà soát lại thông tin và hoạt động kinh doanh để tránh bị tạm đình chỉ.`,
          type: NotificationType.SYSTEM,
        },
      });

      return createdLog;
    });

    return {
      success: true,
      message: `Đã gửi văn bản cảnh cáo tới gian hàng "${storeName}" thành công.`,
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
  async createShopViolation(sellerId: string, adminId: string, dto: CreateShopViolationDto) {
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
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
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

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Xác nhận vi phạm quy chế sàn thương mại điện tử ⚠️',
          content: `Gian hàng "${storeName}" vừa bị lập biên bản vi phạm: "${dto.title}". Mức xử lý: ${
            dto.penaltyLevel || 'Cảnh cáo'
          }.${dto.resolutionNotes ? ` Hướng giải quyết: ${dto.resolutionNotes}` : ''}`,
          type: NotificationType.SYSTEM,
        },
      });

      return v;
    });

    return {
      success: true,
      message: `Đã ghi nhận hồ sơ vi phạm của gian hàng "${storeName}" thành công.`,
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
  async resolveShopAppeal(sellerId: string, adminId: string, dto: ResolveShopAppealDto) {
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
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
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
          reason: `Chấp thuận giải trình kháng cáo gian hàng: ${dto.reason.trim()}`,
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

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Tài khoản gian hàng đã được khôi phục!',
          content: `Giải trình của bạn đã được Ban Quản Trị chấp thuận. Gian hàng "${storeName}" đã được mở khóa và khôi phục điểm uy tín lên ${targetScore} (${newTrustLevel}). Danh sách sản phẩm của bạn đã hoạt động trở lại.`,
          type: NotificationType.SYSTEM,
        },
      });

      return { updatedUser, actionLog };
    });

    this.logger.log(
      `Admin (${adminId}) approved appeal for store '${storeName}' (${sellerId}). Restored score: ${targetScore}, Trust: ${newTrustLevel}.`,
    );

    return {
      success: true,
      message: `Đã chấp thuận giải trình và khôi phục hoạt động cho gian hàng "${storeName}".`,
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
