import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
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
import { RegisterAuctionItemInput } from '../dtos/register-auction-item.dto';
import { ReviewAction, ReviewAuctionItemInput } from '../dtos/review-auction-item.dto';
import { StaffAuctionNoteInput } from '../dtos/staff-auction-note.dto';
import { formatVnd } from './auction-domain.utils';

@Injectable()
export class AuctionConsignmentHelper {
  private readonly logger = new Logger(AuctionConsignmentHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService?: ChatService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  /**
   * Seller consigns an independent auction item (not linked to retail catalog/inventory) into a scheduled room.
   */
  async registerAuctionItem(auctionId: string, sellerId: string, dto: RegisterAuctionItemInput) {
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
      throw new NotFoundException('Auction room not found.');
    }
    if (!seller || seller.role !== Role.SELLER) {
      throw new ForbiddenException('Only Seller accounts may submit auction consignments.');
    }
    if (seller.isShopSuspended) {
      throw new ForbiddenException({
        message: 'Your store is currently suspended and cannot consign items.',
        errorCode: AppErrorCode.SHOP_SUSPENDED,
      });
    }
    const effectiveTrustLevel = trustLevelFor(seller.reputationScore);
    if (
      seller.trustLevel === ReputationTrustLevel.PROBATION ||
      seller.trustLevel === ReputationTrustLevel.SUSPENDED ||
      effectiveTrustLevel === 'PROBATION' ||
      effectiveTrustLevel === 'SUSPENDED'
    ) {
      throw new BadRequestException(
        'Accounts on probation or suspended status cannot consign auction items.',
      );
    }
    if (seller.reputationScore < auction.minSellerReputation) {
      throw new ForbiddenException(
        `Minimum reputation score required to consign to this auction is ${auction.minSellerReputation}.`,
      );
    }
    if (auction.status !== AuctionStatus.SCHEDULED || auction.isConsignmentLocked) {
      throw new BadRequestException('Auction room has locked consignments or has already started.');
    }
    if (auction.consignmentDeadline && Date.now() > auction.consignmentDeadline.getTime()) {
      throw new BadRequestException('The consignment deadline for this auction has passed.');
    }

    if (
      dto.proposedReservePrice !== undefined &&
      dto.proposedStartingPrice < dto.proposedReservePrice
    ) {
      throw new BadRequestException(
        'Proposed starting price must be greater than or equal to the reserve price.',
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
      throw new NotFoundException('Auction room not found.');
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
  async adminReviewAuctionItem(itemId: string, adminId: string, dto: ReviewAuctionItemInput) {
    const item = await this.prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: { auction: true },
    });
    if (!item) {
      throw new NotFoundException('Consigned item not found.');
    }
    if (
      item.auction.status !== AuctionStatus.SCHEDULED &&
      item.auction.status !== AuctionStatus.DRAFT
    ) {
      throw new BadRequestException('Cannot review items after the auction has started.');
    }

    if (dto.action === ReviewAction.REJECT) {
      if (!dto.rejectionReason?.trim()) {
        throw new BadRequestException('Please provide a rejection reason for the item.');
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

      await publishNotification(
        this.prisma,
        {
          userId: item.sellerId,
          auctionId: item.auctionId,
          targetUrl: `/seller/auctions`,
          title: `Item "${item.title}" was not approved for auction`,
          content: `Admin rejected item "${item.title}" for auction "${item.auction.title}". Reason: ${dto.rejectionReason.trim()}`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
        },
        this.notifications,
      );

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
        'Official starting price cannot be lower than the reserve price so even the first bid meets the reserve.',
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

    await publishNotification(
      this.prisma,
      {
        userId: item.sellerId,
        auctionId: item.auctionId,
        targetUrl: auctionTargetUrl(item.auctionId),
        title: `Item "${item.title}" approved (Lot #${lotNumber})`,
        content: `Admin approved "${item.title}" as Lot #${lotNumber} in auction "${item.auction.title}" with starting price ${formatVnd(effectiveStartingPrice)}.`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
      },
      this.notifications,
    );

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
   * Support Staff operational overview for 3D Auction Support:
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
  async staffAddItemNote(itemId: string, staffId: string, dto: StaffAuctionNoteInput) {
    const item = await this.prisma.auctionItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Auction item not found.');
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
      throw new NotFoundException('Auction room not found.');
    }
    if (!this.chatService) {
      throw new ConflictException('Support chat service is currently unavailable.');
    }

    return this.chatService.requestSupport(userId, userRole, {
      contextType: 'AUCTION',
      contextId: auctionId,
      subject: `Auction room support: ${auction.title}`,
      message,
    });
  }
}
