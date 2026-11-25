import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuctionItemStatus,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  ReputationTrustLevel,
  Role,
} from '@prisma/client';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ChatService } from '../../chat/services/chat.service';
import { trustLevelFor } from '../../../core/domain/reputation-policy';
import { RegisterAuctionItemDto } from '../dtos/register-auction-item.dto';
import { ReviewAction, ReviewAuctionItemDto } from '../dtos/review-auction-item.dto';
import { StaffAuctionNoteDto } from '../dtos/staff-auction-note.dto';
import { formatVnd } from './auction-domain.utils';

@Injectable()
export class AuctionConsignmentHelper {
  private readonly logger = new Logger(AuctionConsignmentHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService?: ChatService,
  ) {}

  /**
   * Seller consigns an independent auction item (not linked to retail catalog/inventory) into a scheduled room.
   */
  async registerAuctionItem(auctionId: string, sellerId: string, dto: RegisterAuctionItemDto) {
    const [auction, seller] = await Promise.all([
      this.prisma.auction.findUnique({ where: { id: auctionId } }),
      this.prisma.user.findUnique({
        where: { id: sellerId },
        select: {
          id: true,
          role: true,
          reputationScore: true,
          trustLevel: true,
          isShopSuspended: true,
        },
      }),
    ]);

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }
    if (!seller || seller.role !== Role.SELLER) {
      throw new ForbiddenException('Chỉ tài khoản Người bán mới được gửi vật phẩm ký gửi đấu giá.');
    }
    if (seller.isShopSuspended) {
      throw new ForbiddenException(
        'Gian hàng của bạn đang bị tạm khóa, không thể ký gửi vật phẩm.',
      );
    }
    const effectiveTrustLevel = trustLevelFor(seller.reputationScore);
    if (
      seller.trustLevel === ReputationTrustLevel.PROBATION ||
      seller.trustLevel === ReputationTrustLevel.SUSPENDED ||
      effectiveTrustLevel === 'PROBATION' ||
      effectiveTrustLevel === 'SUSPENDED'
    ) {
      throw new BadRequestException(
        'Tài khoản đang ở mức thử thách hoặc bị đình chỉ, không thể ký gửi vật phẩm đấu giá.',
      );
    }
    if (seller.reputationScore < auction.minSellerReputation) {
      throw new ForbiddenException(
        `Điểm uy tín tối thiểu để ký gửi vào phiên này là ${auction.minSellerReputation}.`,
      );
    }
    if (auction.status !== AuctionStatus.SCHEDULED || auction.isConsignmentLocked) {
      throw new BadRequestException('Phiên đấu giá đã khóa nhận ký gửi hoặc đã bắt đầu.');
    }
    if (auction.consignmentDeadline && Date.now() > auction.consignmentDeadline.getTime()) {
      throw new BadRequestException('Đã quá hạn chót đăng ký vật phẩm ký gửi cho phiên này.');
    }

    if (
      dto.proposedReservePrice !== undefined &&
      dto.proposedStartingPrice < dto.proposedReservePrice
    ) {
      throw new BadRequestException(
        'Giá khởi điểm đề xuất phải lớn hơn hoặc bằng giá sàn (reserve price).',
      );
    }

    return this.prisma.auctionItem.create({
      data: {
        auctionId,
        sellerId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        images: dto.images,
        threeModelKey: dto.threeModelKey?.trim() || null,
        proposedStartingPrice: dto.proposedStartingPrice,
        proposedReservePrice: dto.proposedReservePrice ?? null,
        proposedBidIncrement: dto.proposedBidIncrement ?? 100000,
        weightGrams: dto.weightGrams ?? 500,
        lengthCm: dto.lengthCm ?? 20,
        widthCm: dto.widthCm ?? 15,
        heightCm: dto.heightCm ?? 10,
        appraisalCertificateNumber: dto.appraisalCertificateNumber?.trim() || null,
        appraisalAgency: dto.appraisalAgency?.trim() || null,
        certificateImages: dto.certificateImages,
        certificateIssueDate: dto.certificateIssueDate ? new Date(dto.certificateIssueDate) : null,
        status: AuctionItemStatus.PENDING_REVIEW,
        lotStatus: AuctionStatus.SCHEDULED,
      },
    });
  }

  /**
   * Admin and Support Staff inspect all consigned items in an auction room (including pending/rejected).
   */
  async adminGetAuctionItems(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }

    const items = await this.prisma.auctionItem.findMany({
      where: { auctionId },
      orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
            platformEmail: true,
            avatarUrl: true,
            shopAvatarUrl: true,
            reputationScore: true,
            trustLevel: true,
            isShopSuspended: true,
          },
        },
        reviewedByAdmin: { select: { id: true, fullName: true } },
        awards: {
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: { select: { id: true, fullName: true, email: true, reputationScore: true } },
          },
        },
        _count: { select: { bids: true, complaints: true } },
      },
    });

    return {
      auctionId: auction.id,
      auctionTitle: auction.title,
      auctionStatus: auction.status,
      totalCount: items.length,
      items,
    };
  }

  /**
   * Admin approves or rejects a consigned auction item.
   * When approved, enforces startingPrice >= reservePrice (if reservePrice is set) and assigns lot pricing.
   */
  async adminReviewAuctionItem(itemId: string, adminId: string, dto: ReviewAuctionItemDto) {
    const item = await this.prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: { auction: true },
    });
    if (!item) {
      throw new NotFoundException('Không tìm thấy vật phẩm ký gửi.');
    }
    if (
      item.auction.status !== AuctionStatus.SCHEDULED &&
      item.auction.status !== AuctionStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Không thể xét duyệt vật phẩm sau khi phiên đấu giá đã bắt đầu.',
      );
    }

    if (dto.action === ReviewAction.REJECT) {
      if (!dto.rejectionReason?.trim()) {
        throw new BadRequestException('Vui lòng nhập lý do từ chối vật phẩm.');
      }

      const rejected = await this.prisma.auctionItem.update({
        where: { id: itemId },
        data: {
          status: AuctionItemStatus.REJECTED,
          rejectionReason: dto.rejectionReason.trim(),
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: item.sellerId,
          auctionId: item.auctionId,
          targetUrl: `/seller/auctions`,
          title: `Vật phẩm "${item.title}" chưa được duyệt đấu giá`,
          content: `Admin đã từ chối vật phẩm "${item.title}" cho phiên "${item.auction.title}". Lý do: ${dto.rejectionReason.trim()}`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
        },
      });

      return rejected;
    }

    const effectiveStartingPrice = dto.startingPrice ?? Number(item.proposedStartingPrice);
    const effectiveReservePrice =
      dto.reservePrice !== undefined
        ? dto.reservePrice
        : item.proposedReservePrice !== null
          ? Number(item.proposedReservePrice)
          : null;
    const effectiveBidIncrement = dto.bidIncrement ?? Number(item.proposedBidIncrement);

    if (effectiveReservePrice !== null && effectiveStartingPrice < effectiveReservePrice) {
      throw new BadRequestException(
        'Giá khởi điểm chính thức không được thấp hơn giá sàn (reserve price) để đảm bảo ngay cả người đặt đầu tiên vẫn đạt giá sàn.',
      );
    }

    let lotNumber = dto.lotNumber ?? item.lotNumber;
    if (!lotNumber) {
      const maxLot = await this.prisma.auctionItem.aggregate({
        where: { auctionId: item.auctionId, status: AuctionItemStatus.APPROVED },
        _max: { lotNumber: true },
      });
      lotNumber = (maxLot._max.lotNumber ?? 0) + 1;
    }

    const approved = await this.prisma.auctionItem.update({
      where: { id: itemId },
      data: {
        status: AuctionItemStatus.APPROVED,
        lotStatus: AuctionStatus.SCHEDULED,
        rejectionReason: null,
        lotNumber,
        startingPrice: effectiveStartingPrice,
        reservePrice: effectiveReservePrice,
        bidIncrement: effectiveBidIncrement,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: item.sellerId,
        auctionId: item.auctionId,
        targetUrl: auctionTargetUrl(item.auctionId),
        title: `Vật phẩm "${item.title}" đã được duyệt (Lô #${lotNumber})`,
        content: `Admin đã duyệt "${item.title}" vào Lô #${lotNumber} của phiên "${item.auction.title}" với giá khởi điểm ${formatVnd(effectiveStartingPrice)}.`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
      },
    });

    return approved;
  }

  /**
   * Lists consigned items owned by the authenticated seller across all auction sessions.
   */
  async getSellerConsignments(sellerId: string) {
    return this.prisma.auctionItem.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            status: true,
            startTime: true,
            endTime: true,
            consignmentDeadline: true,
          },
        },
        awards: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: {
            id: true,
            tier: true,
            status: true,
            offerAmount: true,
            depositAmount: true,
            expiresAt: true,
          },
        },
      },
    });
  }

  /**
   * Support Staff operational overview for "Hỗ Trợ Đấu Giá 3D":
   * active/scheduled rooms, lots awaiting review or closing, open complaints, and auction support chats.
   */
  async getStaffOverview() {
    const [auctions, openComplaints, pendingAwards, auctionSupportChats] = await Promise.all([
      this.prisma.auction.findMany({
        where: {
          status: {
            in: [
              AuctionStatus.SCHEDULED,
              AuctionStatus.ACTIVE,
              AuctionStatus.EXTENDED,
              AuctionStatus.ENDED,
            ],
          },
        },
        orderBy: [{ status: 'asc' }, { endTime: 'asc' }],
        take: 30,
        include: {
          items: {
            orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
            include: {
              seller: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      }),
      this.prisma.auctionComplaint.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          auction: { select: { id: true, title: true } },
          auctionItem: { select: { id: true, title: true, lotNumber: true } },
          reporter: { select: { id: true, fullName: true, role: true } },
        },
      }),
      this.prisma.auctionAward.findMany({
        where: {
          status: { in: ['AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT'] },
        },
        orderBy: { expiresAt: 'asc' },
        take: 50,
        include: {
          auction: { select: { id: true, title: true } },
          auctionItem: { select: { id: true, title: true, lotNumber: true } },
          buyer: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.chatConversation.findMany({
        where: { contextType: 'AUCTION', status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { lastMessageAt: 'desc' },
        take: 30,
        include: {
          participant1: { select: { id: true, fullName: true, role: true } },
          assignedStaff: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      auctions,
      openComplaints,
      pendingAwards: pendingAwards.map((award) => ({
        ...award,
        offerAmount: Number(award.offerAmount),
        depositAmount: Number(award.depositAmount),
      })),
      auctionSupportChats,
    };
  }

  /**
   * Support Staff attaches an internal verification or live-room support note to an auction lot
   * to assist Admin during pre-approval or post-auction handling.
   */
  async staffAddItemNote(itemId: string, staffId: string, dto: StaffAuctionNoteDto) {
    const item = await this.prisma.auctionItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy vật phẩm đấu giá.');
    }
    const noteText = dto.staffNote?.trim() || null;
    this.logger.log(`Support Staff ${staffId} updated note on auction item ${itemId}`);

    return this.prisma.auctionItem.update({
      where: { id: itemId },
      data: { staffNote: noteText },
    });
  }

  /**
   * Opens or routes a dedicated auction support conversation between a Buyer or Seller
   * and an online Support Staff agent via StaffQueueService.
   */
  async requestAuctionSupportChat(
    auctionId: string,
    userId: string,
    userRole: Role,
    message: string,
  ) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true, title: true },
    });
    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }
    if (!this.chatService) {
      throw new ConflictException('Dịch vụ trò chuyện hỗ trợ hiện chưa khả dụng.');
    }

    return this.chatService.requestSupport(userId, userRole, {
      contextType: 'AUCTION',
      contextId: auctionId,
      subject: `Hỗ trợ phòng đấu giá: ${auction.title}`,
      message,
    });
  }
}
