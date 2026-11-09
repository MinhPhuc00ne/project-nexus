import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
  Prisma,
  ProductStatus,
  ReputationLog,
  ReputationTrustLevel,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  AdjustReputationDto,
  AwardProfileCompletionDto,
  ReputationSummaryResponse,
} from '../dtos/reputation.dto';

/**
 * Centralized service managing user reputation scores, trust tier transitions,
 * automated disciplinary actions, and in-app milestone notifications.
 */
@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Determines the corresponding trust tier based on a normalized reputation score.
   *
   * @param score - Numerical reputation score within the interval [0, 100]
   * @returns Computed ReputationTrustLevel classification
   */
  calculateTrustLevel(score: number): ReputationTrustLevel {
    if (score >= 90) return ReputationTrustLevel.EXCELLENT;
    if (score >= 80) return ReputationTrustLevel.GOOD;
    if (score >= 30) return ReputationTrustLevel.STANDARD;
    if (score >= 20) return ReputationTrustLevel.PROBATION;
    return ReputationTrustLevel.SUSPENDED;
  }

  /**
   * Adjusts a user's reputation score by a signed delta, updates trust tier status,
   * enforces automated shop suspension when score falls below 20, and persists an audit log.
   *
   * @param dto - Reputation adjustment payload
   * @param tx - Optional active Prisma database transaction client
   * @returns Updated reputation summary or null when target user is non-rated personnel
   * @throws NotFoundException when the user does not exist
   */
  async adjustScore(
    dto: AdjustReputationDto,
    tx?: Prisma.TransactionClient,
  ): Promise<ReputationSummaryResponse | null> {
    const prismaClient = tx || this.prisma;

    const user = await prismaClient.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        role: true,
        reputationScore: true,
        trustLevel: true,
        isShopSuspended: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${dto.userId}' not found.`);
    }

    if (user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF) {
      this.logger.debug(
        `Skipping reputation score modification for administrative staff '${dto.userId}' with role '${user.role}'.`,
      );
      return null;
    }

    const previousScore = user.reputationScore;
    const newScore = Math.min(100, Math.max(0, previousScore + dto.deltaPoints));
    const newTrustLevel = this.calculateTrustLevel(newScore);
    const isSuspended = newTrustLevel === ReputationTrustLevel.SUSPENDED;

    await prismaClient.user.update({
      where: { id: dto.userId },
      data: {
        reputationScore: newScore,
        trustLevel: newTrustLevel,
        ...(isSuspended
          ? {
              isShopSuspended: true,
              suspensionReason: 'Điểm uy tín dưới 20 (SUSPENDED)',
            }
          : {}),
      },
    });

    if (isSuspended && user.role === Role.SELLER) {
      await prismaClient.product.updateMany({
        where: { sellerId: dto.userId, status: ProductStatus.ACTIVE },
        data: { status: ProductStatus.INACTIVE },
      });
      this.logger.warn(
        `Seller '${dto.userId}' dropped below threshold with score ${newScore}. Shop automatically suspended and active listings hidden.`,
      );
    }

    await prismaClient.reputationLog.create({
      data: {
        userId: dto.userId,
        deltaPoints: dto.deltaPoints,
        balanceAfter: newScore,
        reason: dto.reason.trim(),
        penaltyType: dto.penaltyType ?? null,
        referenceId: dto.referenceId ?? null,
      },
    });

    this.logger.log(
      `Reputation updated for User '${dto.userId}': ${previousScore} -> ${newScore} (${dto.deltaPoints >= 0 ? '+' : ''}${dto.deltaPoints}). Trust: ${newTrustLevel}`,
    );

    if (!dto.skipNotification) {
      await this.dispatchReputationNotification(
        dto.userId,
        dto.deltaPoints,
        newScore,
        newTrustLevel,
        dto.reason,
        prismaClient,
      );
    }

    return {
      userId: dto.userId,
      score: newScore,
      trustLevel: newTrustLevel,
      isSuspended: isSuspended || user.isShopSuspended,
      canSell: !isSuspended && newScore >= 20,
      isVerifiedShop: newScore >= 80,
    };
  }

  /**
   * Awards one-time profile completion reputation points with strict idempotency verification.
   *
   * @param dto - Profile completion milestone payload
   * @param tx - Optional active Prisma database transaction client
   * @returns Boolean indicating whether reward points were newly granted
   */
  async awardProfileCompletion(
    dto: AwardProfileCompletionDto,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const prismaClient = tx || this.prisma;
    const refKey = `PROFILE_${dto.fieldKey}`;

    const alreadyAwarded = await prismaClient.reputationLog.findFirst({
      where: {
        userId: dto.userId,
        referenceId: refKey,
      },
    });

    if (alreadyAwarded) {
      this.logger.debug(
        `Profile milestone '${dto.fieldKey}' already awarded for user '${dto.userId}'. Skipping duplicate reward.`,
      );
      return false;
    }

    await this.adjustScore(
      {
        userId: dto.userId,
        deltaPoints: dto.points,
        reason: dto.reason,
        referenceId: refKey,
      },
      prismaClient,
    );

    return true;
  }

  /**
   * Retrieves user reputation score, trust classification, and operational privileges.
   *
   * @param userId - Unique user identifier
   * @returns Consolidated reputation summary
   * @throws NotFoundException when the user does not exist
   */
  async getReputationSummary(userId: string): Promise<ReputationSummaryResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        reputationScore: true,
        trustLevel: true,
        isShopSuspended: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found.`);
    }

    return {
      userId: user.id,
      score: user.reputationScore,
      trustLevel: user.trustLevel,
      isSuspended: user.isShopSuspended,
      canSell: !user.isShopSuspended && user.reputationScore >= 20,
      isVerifiedShop: user.reputationScore >= 80,
    };
  }

  /**
   * Retrieves paginated reputation audit trail logs for an individual user.
   *
   * @param userId - Target user identifier
   * @param page - Page offset number (1-based)
   * @param limit - Number of records per page
   * @returns Paginated reputation audit log entries and total count
   */
  async getReputationLogs(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: ReputationLog[]; total: number; page: number; limit: number }> {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(100, Math.max(1, limit));
    const skip = (normalizedPage - 1) * normalizedLimit;

    const [items, total] = await Promise.all([
      this.prisma.reputationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: normalizedLimit,
      }),
      this.prisma.reputationLog.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  /**
   * Constructs and dispatches descriptive in-app notification alerts for score fluctuations.
   */
  private async dispatchReputationNotification(
    userId: string,
    delta: number,
    newScore: number,
    trustLevel: ReputationTrustLevel,
    reason: string,
    prismaClient: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    let title: string;
    let content: string;

    if (delta > 0) {
      title = `Điểm uy tín tăng (+${delta})`;
      content = `Bạn vừa được cộng +${delta} điểm uy tín. Lý do: ${reason}. Điểm hiện tại: ${newScore}/100 (${trustLevel}).`;
    } else {
      title = `Cảnh báo: Điểm uy tín bị trừ (${delta})`;
      content = `Bạn vừa bị trừ ${delta} điểm uy tín. Lý do: ${reason}. Điểm hiện tại: ${newScore}/100 (${trustLevel}).`;

      if (trustLevel === ReputationTrustLevel.PROBATION) {
        content +=
          ' Cảnh báo: Tài khoản đang ở mức PROBATION (20-29 điểm) và bị hạn chế tham gia đấu giá VIP.';
      } else if (trustLevel === ReputationTrustLevel.SUSPENDED) {
        content +=
          ' Khẩn cấp: Gian hàng đã bị tạm khóa do điểm uy tín rớt xuống dưới 20. Vui lòng gửi đơn giải trình lên Ban Quản Trị để được hỗ trợ.';
      }
    }

    try {
      await prismaClient.notification.create({
        data: {
          userId,
          title,
          content,
          type: delta > 0 ? NotificationType.SYSTEM : NotificationType.DISPUTE,
          channel: NotificationChannel.IN_APP,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist in-app reputation notification for user '${userId}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
