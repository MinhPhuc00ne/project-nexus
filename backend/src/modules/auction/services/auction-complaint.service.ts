import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuctionComplaintStatus,
  NotificationChannel,
  NotificationType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAdminsAndStaff } from '../../../core/notifications/admin-notification.util';
import { auctionTargetUrlForRole } from '../../../core/navigation/auction-navigation';
import {
  CreateAuctionComplaintInput,
  ResolveAuctionComplaintDecision,
  ResolveAuctionComplaintInput,
} from '../dtos/auction-complaint.dto';

/**
 * Manages unified auction complaints submitted by Sellers and Buyers and resolved by Admin.
 */
@Injectable()
export class AuctionComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits a formal auction complaint from a Seller (with an item in the auction)
   * or a Buyer (who participated via bids or post-auction awards).
   */
  async createComplaint(
    auctionId: string,
    reporterId: string,
    reporterRole: Role,
    dto: CreateAuctionComplaintInput,
  ) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true, title: true, sellerId: true },
    });
    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }

    if (dto.auctionItemId) {
      const lot = await this.prisma.auctionItem.findFirst({
        where: { id: dto.auctionItemId, auctionId },
        select: { id: true },
      });
      if (!lot) {
        throw new NotFoundException('Không tìm thấy lô hàng thuộc phòng đấu giá này.');
      }
    }

    const [ownsItem, hasParticipated] = await Promise.all([
      this.prisma.auctionItem.findFirst({
        where: {
          auctionId,
          sellerId: reporterId,
          ...(dto.auctionItemId ? { id: dto.auctionItemId } : {}),
        },
        select: { id: true },
      }),
      this.prisma.bid.findFirst({
        where: {
          auctionId,
          bidderId: reporterId,
          ...(dto.auctionItemId ? { auctionItemId: dto.auctionItemId } : {}),
        },
        select: { id: true },
      }),
    ]);

    const isSellerParticipant = auction.sellerId === reporterId || Boolean(ownsItem);
    const isBuyerParticipant = Boolean(hasParticipated);

    if (
      reporterRole !== Role.ADMIN &&
      reporterRole !== Role.SUPPORT_STAFF &&
      !isSellerParticipant &&
      !isBuyerParticipant
    ) {
      throw new ForbiddenException(
        'Chỉ người bán có vật phẩm hoặc người mua đã tham gia phiên đấu giá mới được gửi khiếu nại.',
      );
    }

    const complaint = await this.prisma.$transaction(async (tx) => {
      const created = await tx.auctionComplaint.create({
        data: {
          auctionId,
          auctionItemId: dto.auctionItemId ?? null,
          reporterId,
          reporterRole,
          reason: dto.reason.trim(),
          evidenceUrls: dto.evidenceUrls ?? [],
          status: AuctionComplaintStatus.OPEN,
        },
        include: {
          auction: { select: { id: true, title: true } },
          auctionItem: { select: { id: true, title: true, lotNumber: true } },
          reporter: { select: { id: true, fullName: true, email: true, role: true } },
        },
      });

      await notifyAdminsAndStaff(tx, {
        title: `Khiếu nại đấu giá mới từ ${reporterRole === Role.SELLER ? 'Người bán' : 'Người mua'}`,
        content: `Phiên "${auction.title}": ${dto.reason.trim()}`,
        type: NotificationType.DISPUTE,
        adminTargetUrl: '/admin/auctions',
        staffTargetUrl: auctionTargetUrlForRole(auctionId, Role.SUPPORT_STAFF),
        auctionId,
        metadata: {
          entityType: 'AUCTION_COMPLAINT',
          actionType: 'AUCTION_COMPLAINT_CREATED',
          complaintId: created.id,
          auctionId,
          auctionItemId: dto.auctionItemId ?? null,
          reporterId,
          reporterRole,
        },
      });

      return created;
    });

    return complaint;
  }

  /**
   * Lists auction complaints. Admin and Support Staff see all records;
   * Buyers and Sellers see only complaints they submitted.
   */
  async listComplaints(
    userId: string,
    role: Role,
    query: { auctionId?: string; status?: AuctionComplaintStatus } = {},
  ) {
    const isStaffOrAdmin = role === Role.ADMIN || role === Role.SUPPORT_STAFF;
    if (query.status && !Object.values(AuctionComplaintStatus).includes(query.status)) {
      throw new BadRequestException('Trạng thái khiếu nại không hợp lệ.');
    }

    return this.prisma.auctionComplaint.findMany({
      where: {
        ...(query.auctionId ? { auctionId: query.auctionId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(!isStaffOrAdmin ? { reporterId: userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        auction: { select: { id: true, title: true, status: true } },
        auctionItem: {
          select: {
            id: true,
            title: true,
            lotNumber: true,
            lotStatus: true,
            sellerId: true,
          },
        },
        reporter: { select: { id: true, fullName: true, email: true, role: true } },
        handledBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  /**
   * Admin accepts or rejects an auction complaint and dispatches a decision notification
   * back to the requester.
   */
  async resolveComplaint(complaintId: string, adminId: string, dto: ResolveAuctionComplaintInput) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auction_complaints WHERE id = ${complaintId} FOR UPDATE`;
      const existing = await tx.auctionComplaint.findUnique({
        where: { id: complaintId },
        include: { auction: { select: { id: true, title: true } } },
      });
      if (!existing) {
        throw new NotFoundException('Không tìm thấy yêu cầu khiếu nại đấu giá.');
      }
      if (existing.status !== AuctionComplaintStatus.OPEN) {
        throw new ConflictException('Khiếu nại này đã được xử lý trước đó.');
      }

      const updated = await tx.auctionComplaint.update({
        where: { id: complaintId },
        data: {
          status: dto.status as unknown as AuctionComplaintStatus,
          adminNote: dto.adminNote?.trim() || null,
          handledById: adminId,
          handledAt: new Date(),
        },
        include: {
          auction: { select: { id: true, title: true } },
          auctionItem: { select: { id: true, title: true, lotNumber: true } },
          reporter: { select: { id: true, fullName: true, email: true, role: true } },
          handledBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      const isAccepted = dto.status === ResolveAuctionComplaintDecision.ACCEPTED;
      const decisionLabel = isAccepted ? 'Đã tiếp nhận / Chấp thuận' : 'Đã từ chối';
      const noteText = dto.adminNote?.trim() ? ` Ghi chú từ Admin: ${dto.adminNote.trim()}` : '';

      await tx.notification.create({
        data: {
          userId: existing.reporterId,
          auctionId: existing.auctionId,
          targetUrl: `/auction/${existing.auctionId}`,
          title: `Kết quả khiếu nại đấu giá: ${decisionLabel}`,
          content: `Admin đã phản hồi khiếu nại của bạn tại phiên "${existing.auction.title}": ${decisionLabel}.${noteText}`,
          type: NotificationType.DISPUTE,
          channel: NotificationChannel.IN_APP,
          metadata: {
            actionType: 'AUCTION_COMPLAINT_RESOLVED',
            complaintId: updated.id,
            auctionId: existing.auctionId,
            auctionItemId: existing.auctionItemId,
            status: updated.status,
            adminNote: updated.adminNote,
          },
        },
      });

      return updated;
    });
  }
}
