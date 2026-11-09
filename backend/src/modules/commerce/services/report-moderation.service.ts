import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShopViolation } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import { QueryReportsDto, ReviewReportDto } from '../dtos/report-moderation.dto';

/** Authenticated moderator identity supplied by the HTTP guard, never by the request body. */
export interface ReportModerator {
  id: string;
  role: string;
}

/** Provides report ownership, queue access, terminal decisions, and single-application sanctions. */
@Injectable()
export class ReportModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
  ) {}

  /**
   * Retrieves a bounded report queue or a reporter's own submissions.
   * @param query Validated filters.
   * @param reporterId Optional ownership constraint for the public authenticated route.
   * @returns Report records and pagination metadata.
   */
  async list(
    query: QueryReportsDto,
    reporterId?: string,
  ): Promise<{ items: ShopViolation[]; total: number; page: number; limit: number }> {
    const where: Prisma.ShopViolationWhereInput = {
      ...(reporterId ? { reporterId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.shopViolation.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.shopViolation.count({ where }),
    ]);
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
    dto: ReviewReportDto,
  ): Promise<ShopViolation> {
    if (!['ADMIN', 'SUPPORT_STAFF'].includes(actor.role))
      throw new ForbiddenException('Chỉ nhân viên được xử lý báo cáo.');
    if (dto.penaltyType && (actor.role !== 'ADMIN' || dto.status !== 'CONFIRMED'))
      throw new ForbiddenException('Chỉ Admin được xác nhận chế tài gian lận.');
    if (dto.reason.trim().length < 5)
      throw new BadRequestException('Cần nêu lý do xử lý ít nhất 5 ký tự.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM shop_violations WHERE id = ${reportId} FOR UPDATE`;
      const report = await tx.shopViolation.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundException('Không tìm thấy báo cáo.');
      if (['CONFIRMED', 'DISMISSED'].includes(report.status)) {
        if (report.status === dto.status && (report.penaltyLevel ?? undefined) === dto.penaltyType)
          return report;
        throw new ConflictException('Báo cáo đã có kết quả cuối cùng.');
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
      return result;
    });
  }
}
