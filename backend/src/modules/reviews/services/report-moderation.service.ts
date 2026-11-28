import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma, ShopViolation } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import { QueryReportsInput, ReviewReportInput } from '../dtos/report-moderation.dto';

/** Authenticated moderator identity supplied by the HTTP guard, never by the request body. */
export interface ReportModerator {
  id: string;
  role: string;
}

/** Summarized shop identity projected for display in moderation queues. */
export interface ReportShopSummary {
  id: string;
  fullName: string;
  email: string;
  shopAvatarUrl: string | null;
  storeName: string;
}

/** Summarized product identity projected for display in moderation queues. */
export interface ReportProductSummary {
  id: string;
  title: string;
  status: string;
}

/** Summarized reporter identity projected for display in moderation queues. */
export interface ReportReporterSummary {
  id: string;
  fullName: string;
  email: string;
}

/** Extended violation record including display names and related entity summaries for UI presentation. */
export interface ReportListItem extends ShopViolation {
  shopName: string | null;
  productTitle: string | null;
  productName: string | null;
  reporterName: string | null;
  shop: ReportShopSummary | null;
  product: ReportProductSummary | null;
  reporter: ReportReporterSummary | null;
}

/** Provides report ownership, queue access, terminal decisions, and single-application sanctions. */
@Injectable()
export class ReportModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Retrieves a bounded report queue or a reporter's own submissions with enriched display names.
   * @param query Validated filters.
   * @param reporterId Optional ownership constraint for the public authenticated route.
   * @returns Enriched report records and pagination metadata.
   */
  async list(
    query: QueryReportsInput,
    reporterId?: string,
  ): Promise<{ items: ReportListItem[]; total: number; page: number; limit: number }> {
    const where: Prisma.ShopViolationWhereInput = {
      ...(reporterId ? { reporterId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rawItems, total] = await Promise.all([
      this.prisma.shopViolation.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          shop: {
            select: {
              id: true,
              fullName: true,
              email: true,
              shopAvatarUrl: true,
              sellerUpgradeRequests: {
                where: { status: 'APPROVED' },
                orderBy: { reviewedAt: 'desc' },
                take: 1,
                select: { storeName: true },
              },
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          reporter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.shopViolation.count({ where }),
    ]);

    const items: ReportListItem[] = rawItems.map((raw) => {
      const { shop, product, reporter, ...violation } = raw;
      const storeName = shop?.sellerUpgradeRequests?.[0]?.storeName || shop?.fullName || null;
      return {
        ...violation,
        shopName: storeName,
        productTitle: product?.title ?? null,
        productName: product?.title ?? null,
        reporterName: reporter?.fullName ?? null,
        shop: shop
          ? {
              id: shop.id,
              fullName: shop.fullName,
              email: shop.email,
              shopAvatarUrl: shop.shopAvatarUrl,
              storeName: storeName ?? shop.fullName,
            }
          : null,
        product: product
          ? {
              id: product.id,
              title: product.title,
              status: product.status,
            }
          : null,
        reporter: reporter
          ? {
              id: reporter.id,
              fullName: reporter.fullName,
              email: reporter.email,
            }
          : null,
      };
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  /**
   * Serializes a moderation decision with its audit entry and optional documented fraud sanction.
   * @param reportId Target report identifier.
   * @param actor Authenticated moderator.
   * @param dto Requested decision and rationale.
   * @returns Updated report, including the retained result for an identical retry.
   * @throws ForbiddenException when the actor lacks moderation or sanction privileges.
   * @throws ConflictException when a terminal verdict would be overwritten.
   */
  async review(
    reportId: string,
    actor: ReportModerator,
    dto: ReviewReportInput,
  ): Promise<ShopViolation> {
    if (!['ADMIN', 'SUPPORT_STAFF'].includes(actor.role))
      throw new ForbiddenException('Only staff can handle violation reports.');
    if (dto.penaltyType && (actor.role !== 'ADMIN' || dto.status !== 'CONFIRMED'))
      throw new ForbiddenException('Only Admin can confirm fraud penalties.');
    if (dto.reason.trim().length < 5)
      throw new BadRequestException('Please provide a resolution reason of at least 5 characters.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shop_violations WHERE id = ${reportId} FOR UPDATE`;
      const report = await tx.shopViolation.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundException('Report not found.');
      if (['CONFIRMED', 'DISMISSED'].includes(report.status)) {
        if (report.status === dto.status && (report.penaltyLevel ?? undefined) === dto.penaltyType)
          return report;
        throw new ConflictException('This report already has a final decision.');
      }
      if (report.status === dto.status && report.resolutionNotes === dto.reason.trim())
        return report;
      if (dto.penaltyType) {
        await this.reputation.adjustScore(
          {
            userId: report.shopId,
            deltaPoints: -50,
            penaltyType: dto.penaltyType,
            referenceId: report.id,
            reason: dto.reason.trim(),
            skipNotification: true,
          },
          tx,
        );
        await tx.user.update({
          where: { id: report.shopId },
          data: {
            trustLevel: 'SUSPENDED',
            isShopSuspended: true,
            isSellerActive: false,
            suspensionReason: dto.reason.trim(),
          },
        });
        await tx.product.updateMany({
          where: { sellerId: report.shopId, status: 'ACTIVE' },
          data: { status: 'INACTIVE' },
        });
      }
      const result = await tx.shopViolation.update({
        where: { id: reportId },
        data: {
          status: dto.status,
          resolutionNotes: dto.reason.trim(),
          handledByAdminId: actor.id,
          handledAt: dto.status === 'INVESTIGATING' ? null : new Date(),
          penaltyLevel: dto.penaltyType ?? null,
        },
      });
      if (dto.status === 'CONFIRMED' || dto.status === 'DISMISSED') {
        const isConfirmed = dto.status === 'CONFIRMED';
        if (report.reporterId) {
          await publishNotification(
            tx,
            {
              userId: report.reporterId,
              title: 'Violation report processed 🛡️',
              content: `Your report regarding the ${report.productId ? 'product' : 'shop'} has been reviewed by Admin. Outcome: ${isConfirmed ? 'Violation confirmed and penalty applied' : 'No violation found'}. Thank you for helping keep the community safe!`,
              type: NotificationType.SYSTEM,
              channel: NotificationChannel.IN_APP,
            },
            this.notifications,
          );
        }
      }
      if (this.auditLog) {
        await this.auditLog.record(
          {
            eventName: 'ReportReviewed',
            operatorId: actor.id,
            payload: {
              reportId,
              from: report.status,
              to: dto.status,
              penaltyType: dto.penaltyType ?? null,
            },
          },
          tx,
        );
      } else {
        await tx.eventLog.create({
          data: {
            eventName: 'ReportReviewed',
            operatorId: actor.id,
            payload: {
              reportId,
              from: report.status,
              to: dto.status,
              penaltyType: dto.penaltyType ?? null,
            },
          },
        });
      }
      return result;
    });
  }
}
