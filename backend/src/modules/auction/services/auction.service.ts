import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@nexus/types';
import {
  AuctionItemStatus,
  AuctionStatus,
  BidStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
  ReputationTrustLevel,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionGateway } from '../gateways/auction.gateway';
import { AuctionQueryDto } from '../dtos/auction-query.dto';
import { CreateAuctionDto } from '../dtos/create-auction.dto';
import { PlaceBidDto } from '../dtos/place-bid.dto';
import { AdminCreateAuctionDto } from '../dtos/admin-create-auction.dto';
import { AdminUpdateAuctionDto } from '../dtos/admin-update-auction.dto';
import { RegisterAuctionItemDto } from '../dtos/register-auction-item.dto';
import { ReviewAction, ReviewAuctionItemDto } from '../dtos/review-auction-item.dto';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { AuctionCheckoutService } from '../../commerce/services/auction-checkout.service';
import { trustLevelFor } from '../../users/services/reputation-policy';

/**
 * Service orchestrating admin auction session lifecycle, seller consignment with online appraisal,
 * reputation-based eligibility checks, and live bidding room operations.
 */
@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionGateway: AuctionGateway,
    private readonly stock: AuctionStockService,
    private readonly checkout: AuctionCheckoutService,
  ) {}

  /**
   * Links a session's sole approved consignment to a catalog product before bids exist.
   * @param auctionId Auction session identifier.
   * @param productId Fulfillable catalog item selected by the administrator.
   * @returns Updated auction with exactly one unit reserved.
   * @throws BadRequestException when the session is closed, ambiguous, or already has bids.
   */
  async bindProduct(
    auctionId: string,
    productId: string,
  ): Promise<Prisma.AuctionGetPayload<object>> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction) throw new NotFoundException('Không tìm thấy phiên đấu giá.');
      if (!['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(auction.status) || auction.totalBidsCount > 0)
        throw new BadRequestException('Chỉ gắn sản phẩm trước khi nhận giá.');
      if (auction.productId && auction.productId !== productId)
        await this.stock.release(tx, auction.id);
      const product = await this.stock.reserve(tx, {
        productId,
        referenceId: auction.id,
        expiresAt: new Date(auction.endTime.getTime() + 86400000),
      });
      if (auction.createdByAdminId) {
        const approved = await tx.auctionItem.findMany({
          where: { auctionId, status: 'APPROVED' },
          select: { sellerId: true },
        });
        if (approved.length !== 1 || approved[0].sellerId !== product.sellerId)
          throw new BadRequestException(
            'Mỗi phòng nhận giá cần đúng một lô đã duyệt, cùng người bán với sản phẩm.',
          );
      }
      return tx.auction.update({
        where: { id: auctionId },
        data: { productId, sellerId: product.sellerId },
      });
    });
  }

  /**
   * Retrieves paginated auction listings with optional status, seller and search filters.
   */
  async getAuctions(query: AuctionQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuctionWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.search?.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } },
        { product: { title: { contains: query.search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auction.count({ where }),
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { startTime: 'asc' }],
        include: {
          createdByAdmin: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          seller: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              threeModelKey: true,
              images: true,
              basePrice: true,
            },
          },
          _count: {
            select: {
              items: true,
              bids: true,
            },
          },
          items: {
            where: { status: AuctionItemStatus.APPROVED },
            take: 4,
            select: {
              id: true,
              title: true,
              images: true,
              lotNumber: true,
              startingPrice: true,
              appraisalAgency: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single auction details including approved items, certificates, and eligibility telemetry.
   */
  async getAuctionDetail(id: string, currentUserId?: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        product: {
          include: {
            category: true,
            images: true,
          },
        },
        items: {
          where: { status: AuctionItemStatus.APPROVED },
          orderBy: { lotNumber: 'asc' },
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                shopAvatarUrl: true,
              },
            },
          },
        },
        bids: {
          take: 25,
          orderBy: { placedAt: 'desc' },
          include: {
            bidder: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá tương ứng.');
    }

    const now = new Date();
    if (auction.status === AuctionStatus.SCHEDULED && now >= auction.startTime) {
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { status: AuctionStatus.ACTIVE },
      });
      auction.status = AuctionStatus.ACTIVE;
    }

    let buyerEligibility: {
      isEligible: boolean;
      isFlaggedViewOnly: boolean;
      reason?: string;
      currentScore?: number;
      requiredScore: number;
    } = {
      isEligible: true,
      isFlaggedViewOnly: false,
      requiredScore: auction.minBuyerReputation,
    };

    if (currentUserId) {
      const eligibility = await this.checkBuyerEligibility(auction.id, currentUserId);
      buyerEligibility = eligibility;
    }

    return {
      ...auction,
      buyerEligibility,
      bids: auction.bids.map((bid) => ({
        id: bid.id,
        bidAmount: Number(bid.bidAmount),
        status: bid.status,
        placedAt: bid.placedAt,
        bidder: {
          id: bid.bidder.id,
          fullName: this.maskName(bid.bidder.fullName),
          avatarUrl: bid.bidder.avatarUrl,
        },
      })),
    };
  }

  // ==========================================
  // ADMIN AUCTION LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Admin creates and schedules a new central auction session/event.
   * Real date constraint is not enforced strictly per demo requirements.
   */
  async adminCreateAuction(adminId: string, dto: AdminCreateAuctionDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (
      !Number.isFinite(endTime.getTime()) ||
      !Number.isFinite(startTime.getTime()) ||
      endTime.getTime() - startTime.getTime() < 3600000 ||
      endTime.getTime() - startTime.getTime() > 7 * 86400000
    ) {
      throw new BadRequestException('Phiên đấu giá phải kéo dài từ 60 phút đến 7 ngày.');
    }

    const now = new Date();
    const status = startTime <= now ? AuctionStatus.ACTIVE : AuctionStatus.SCHEDULED;

    return this.prisma.auction.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        startTime,
        endTime,
        originalEndTime: endTime,
        minBuyerReputation: dto.minBuyerReputation ?? 40,
        minSellerReputation: dto.minSellerReputation ?? 50,
        createdByAdminId: adminId,
        status,
        startingPrice: 0,
        currentHighestBid: 0,
        bidIncrement: 100000,
        totalBidsCount: 0,
        isExtended: false,
      },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Admin updates an upcoming auction.
   * Strict Rule: Prohibits editing when auction is ACTIVE or EXTENDED.
   */
  async adminUpdateAuction(auctionId: string, dto: AdminUpdateAuctionDto) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá.');
    }

    if (auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.EXTENDED) {
      throw new BadRequestException(
        'Phiên đấu giá đang diễn ra, tuyệt đối không được phép chỉnh sửa!',
      );
    }

    if (
      auction.status === AuctionStatus.ENDED ||
      auction.status === AuctionStatus.FAILED ||
      auction.status === AuctionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Phiên đấu giá đã kết thúc hoặc bị hủy (${auction.status}), không thể chỉnh sửa.`,
      );
    }

    const updateData: Prisma.AuctionUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.minBuyerReputation !== undefined)
      updateData.minBuyerReputation = dto.minBuyerReputation;
    if (dto.minSellerReputation !== undefined)
      updateData.minSellerReputation = dto.minSellerReputation;

    const newStart = dto.startTime ? new Date(dto.startTime) : auction.startTime;
    const newEnd = dto.endTime ? new Date(dto.endTime) : auction.endTime;

    if (
      newEnd.getTime() - newStart.getTime() < 3600000 ||
      newEnd.getTime() - newStart.getTime() > 7 * 86400000
    ) {
      throw new BadRequestException('Phiên đấu giá phải kéo dài từ 60 phút đến 7 ngày.');
    }

    if (dto.startTime) {
      updateData.startTime = newStart;
    }
    if (dto.endTime) {
      updateData.endTime = newEnd;
      updateData.originalEndTime = newEnd;
    }

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: updateData,
      include: {
        createdByAdmin: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Admin deletes an auction room.
   * Strict Rule: Prohibits deletion when auction is ACTIVE or EXTENDED.
   */
  async adminDeleteAuction(auctionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          _count: {
            select: { items: true, bids: true },
          },
        },
      });

      if (!auction) {
        throw new NotFoundException('Không tìm thấy phiên đấu giá.');
      }

      if (auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.EXTENDED) {
        throw new BadRequestException(
          'Phiên đấu giá đang diễn ra, tuyệt đối không được phép xóa phiên!',
        );
      }

      if (auction._count.bids > 0 || ['ENDED', 'SETTLED', 'FAILED'].includes(auction.status))
        throw new BadRequestException('Không được hủy hoặc xóa lịch sử phiên đã nhận giá.');
      await this.stock.release(tx, auctionId);

      if (auction._count.items > 0 || auction._count.bids > 0) {
        await tx.auction.update({
          where: { id: auctionId },
          data: { status: AuctionStatus.CANCELLED },
        });
        return {
          success: true,
          message:
            'Phiên đấu giá đã có hàng ký gửi hoặc lịch sử, hệ thống đã chuyển sang CANCELLED.',
        };
      }

      await tx.auction.delete({
        where: { id: auctionId },
      });

      return {
        success: true,
        message: 'Đã xóa phiên đấu giá thành công.',
      };
    });
  }

  // ==========================================
  // SELLER CONSIGNMENT & ONLINE APPRAISAL
  // ==========================================

  /**
   * Seller submits an item with online appraisal certificates into a scheduled auction.
   * Evaluates seller reputation requirement and flags prior probation/penalty history.
   */
  async registerAuctionItem(auctionId: string, sellerId: string, dto: RegisterAuctionItemDto) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá.');
    }

    if (
      auction.status !== AuctionStatus.SCHEDULED &&
      auction.status !== AuctionStatus.DRAFT &&
      auction.status !== AuctionStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Phiên đấu giá hiện không ở trạng thái nhận đăng ký đồ (${auction.status}).`,
      );
    }

    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        reputationLogs: {
          where: { penaltyType: { not: null } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Không tìm thấy tài khoản người bán.');
    }

    if (seller.isShopSuspended) {
      throw new ForbiddenException(
        'Gian hàng của bạn hiện đang bị đình chỉ, không thể gửi hàng tham gia đấu giá.',
      );
    }

    // Kiểm tra điểm uy tín tối thiểu của Seller
    const requiredSellerReputation = auction.minSellerReputation;
    if (seller.reputationScore < requiredSellerReputation) {
      throw new BadRequestException(
        `Điểm uy tín của bạn là ${seller.reputationScore}, không đạt mức tối thiểu ${requiredSellerReputation} điểm yêu cầu của phiên đấu giá này.`,
      );
    }

    // Kiểm tra tiền sử vi phạm: Đủ điểm nhưng từng bị phạt hoặc đang ở mức PROBATION
    let isSellerFlagged = false;
    let flagReason: string | null = null;

    const hasPenalties = seller.reputationLogs.length > 0;
    const isProbation =
      seller.trustLevel === ReputationTrustLevel.PROBATION ||
      trustLevelFor(seller.reputationScore) === ReputationTrustLevel.PROBATION;

    if (hasPenalties || isProbation) {
      isSellerFlagged = true;
      const reasons: string[] = [];
      if (hasPenalties) {
        reasons.push(`Từng có ${seller.reputationLogs.length} lần bị xử phạt/trừ điểm uy tín`);
      }
      if (isProbation) {
        reasons.push('Tài khoản hiện đang trong diện thử thách (PROBATION)');
      }
      flagReason = reasons.join('; ');
      this.logger.warn(
        `Seller ${seller.id} (${seller.fullName}) registered item with warning flag: ${flagReason}`,
      );
    }

    const createdItem = await this.prisma.auctionItem.create({
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
        appraisalCertificateNumber: dto.appraisalCertificateNumber?.trim() || null,
        appraisalAgency: dto.appraisalAgency?.trim() || null,
        certificateImages: dto.certificateImages,
        certificateIssueDate: dto.certificateIssueDate ? new Date(dto.certificateIssueDate) : null,
        status: AuctionItemStatus.PENDING_REVIEW,
        isSellerFlagged,
        flagReason,
      },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            shopAvatarUrl: true,
            reputationScore: true,
            trustLevel: true,
          },
        },
      },
    });

    return {
      success: true,
      message: isSellerFlagged
        ? 'Đã nộp hồ sơ gửi hàng thành công. Lưu ý: Hồ sơ của bạn đã được gắn cờ lưu ý gửi Admin do có tiền sử cảnh báo.'
        : 'Đã nộp hồ sơ gửi hàng đấu giá thành công. Vui lòng chờ Admin thẩm định chứng thư kiểm định.',
      item: createdItem,
    };
  }

  /**
   * Admin retrieves all registered items for a specific auction to review certificates and approval states.
   */
  async adminGetAuctionItems(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá.');
    }

    const items = await this.prisma.auctionItem.findMany({
      where: { auctionId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            platformEmail: true,
            shopAvatarUrl: true,
            avatarUrl: true,
            reputationScore: true,
            trustLevel: true,
            isShopSuspended: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return {
      auctionId,
      auctionTitle: auction.title,
      auctionStatus: auction.status,
      totalCount: items.length,
      items,
    };
  }

  /**
   * Admin reviews (approves/rejects) a consigned auction item.
   */
  async adminReviewAuctionItem(itemId: string, adminId: string, dto: ReviewAuctionItemDto) {
    const item = await this.prisma.auctionItem.findUnique({
      where: { id: itemId },
      include: { auction: true },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy món hàng ký gửi.');
    }

    if (item.status !== AuctionItemStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Món hàng này đã được xử lý trước đó ở trạng thái: ${item.status}.`,
      );
    }

    if (dto.action === ReviewAction.APPROVE) {
      const startingPrice = dto.startingPrice ?? item.proposedStartingPrice;
      const reservePrice = dto.reservePrice ?? item.proposedReservePrice;
      const bidIncrement = dto.bidIncrement ?? item.proposedBidIncrement;

      const currentApprovedCount = await this.prisma.auctionItem.count({
        where: { auctionId: item.auctionId, status: AuctionItemStatus.APPROVED },
      });

      const updated = await this.prisma.auctionItem.update({
        where: { id: itemId },
        data: {
          status: AuctionItemStatus.APPROVED,
          lotNumber: dto.lotNumber ?? currentApprovedCount + 1,
          startingPrice,
          reservePrice,
          bidIncrement,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      // Update parent auction starting price and increment if not configured
      if (Number(item.auction.startingPrice) === 0) {
        await this.prisma.auction.update({
          where: { id: item.auctionId },
          data: {
            startingPrice,
            reservePrice,
            bidIncrement,
          },
        });
      }

      await this.prisma.notification.create({
        data: {
          userId: item.sellerId,
          title: 'Sản phẩm ký gửi đấu giá đã được duyệt!',
          content: `Món hàng "${item.title}" của bạn đã được Admin phê duyệt thẩm định và đưa vào phiên đấu giá "${item.auction.title}".`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
        },
      });

      return {
        success: true,
        message: 'Đã phê duyệt món hàng vào phiên đấu giá thành công.',
        item: updated,
      };
    } else {
      if (!dto.rejectionReason?.trim()) {
        throw new BadRequestException('Vui lòng nhập lý do từ chối món hàng.');
      }

      const updated = await this.prisma.auctionItem.update({
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
          title: 'Sản phẩm ký gửi đấu giá bị từ chối ⚠️',
          content: `Món hàng "${item.title}" của bạn đã bị từ chối đưa vào phiên đấu giá "${item.auction.title}". Lý do: ${dto.rejectionReason.trim()}.`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
        },
      });

      return {
        success: true,
        message: 'Đã từ chối món hàng.',
        item: updated,
      };
    }
  }

  /**
   * Retrieves consignments submitted by the authenticated seller across all auctions.
   */
  async getSellerConsignments(sellerId: string) {
    const items = await this.prisma.auctionItem.findMany({
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
            minSellerReputation: true,
          },
        },
      },
    });

    return items;
  }

  // ==========================================
  // BUYER ELIGIBILITY TELEMETRY
  // ==========================================

  /**
   * Checks whether an authenticated buyer is eligible to bid or view-only in an auction.
   */
  async checkBuyerEligibility(auctionId: string, buyerId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá.');
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      include: {
        reputationLogs: {
          where: { penaltyType: { not: null } },
          take: 3,
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException('Không tìm thấy tài khoản người mua.');
    }

    const requiredScore = Math.max(40, auction.minBuyerReputation ?? 40);
    const currentScore = buyer.reputationScore;

    if (currentScore < requiredScore) {
      return {
        isEligible: false,
        isFlaggedViewOnly: true,
        currentScore,
        requiredScore,
        reason: `Điểm uy tín hiện tại của bạn (${currentScore}) thấp hơn yêu cầu tối thiểu của phiên (${requiredScore}). Bạn chỉ có thể theo dõi phòng đấu giá (View-Only).`,
      };
    }

    if (!['BUYER', 'SELLER'].includes(buyer.role) || buyer.trustLevel === 'SUSPENDED') {
      return {
        isEligible: false,
        isFlaggedViewOnly: true,
        currentScore,
        requiredScore,
        reason: 'Tài khoản không có quyền trả giá.',
      };
    }

    return {
      isEligible: true,
      isFlaggedViewOnly: false,
      currentScore,
      requiredScore,
      reason: 'Tài khoản đủ điều kiện tham gia trả giá.',
    };
  }

  // ==========================================
  // BIDDING & FINALIZATION (COMPATIBILITY)
  // ==========================================

  /**
   * Submits a competitive bid with wallet balance locking, reputation verification, and anti-sniping.
   */
  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const bidAmount = dto.bidAmount;

    // Check buyer eligibility before proceeding
    const eligibility = await this.checkBuyerEligibility(auctionId, bidderId);
    if (!eligibility.isEligible) {
      throw new BadRequestException(eligibility.reason);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (typeof (tx as unknown as { $queryRaw: unknown }).$queryRaw === 'function') {
        await (
          tx as unknown as {
            $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
          }
        ).$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
        await (
          tx as unknown as {
            $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
          }
        ).$queryRaw`SELECT id FROM wallets WHERE user_id = ${bidderId} FOR UPDATE`;
      }

      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          seller: { select: { id: true, fullName: true } },
        },
      });

      if (!auction) {
        throw new NotFoundException('Không tìm thấy phiên đấu giá.');
      }

      const now = new Date();

      if (!auction.productId || !auction.sellerId)
        throw new BadRequestException('Phiên chưa gắn sản phẩm catalog để giao hàng.');
      const currentBuyer = await tx.user.findUnique({ where: { id: bidderId } });
      if (
        !currentBuyer ||
        !['BUYER', 'SELLER'].includes(currentBuyer.role) ||
        currentBuyer.trustLevel === 'SUSPENDED' ||
        currentBuyer.reputationScore < Math.max(40, auction.minBuyerReputation ?? 40)
      )
        throw new BadRequestException('Tài khoản không còn đủ điều kiện trả giá.');

      if (auction.sellerId === bidderId) {
        throw new BadRequestException('Người bán không được phép tham gia trả giá phiên của mình.');
      }

      if (auction.status === AuctionStatus.SCHEDULED) {
        if (now < auction.startTime) {
          throw new BadRequestException('Phiên đấu giá chưa đến giờ bắt đầu.');
        }
        await tx.auction.update({
          where: { id: auction.id },
          data: { status: AuctionStatus.ACTIVE },
        });
        auction.status = AuctionStatus.ACTIVE;
      }

      if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.EXTENDED) {
        throw new BadRequestException(
          `Phiên đấu giá hiện không ở trạng thái nhận giá (${auction.status}).`,
        );
      }

      if (now >= auction.endTime) {
        throw new BadRequestException('Phiên đấu giá đã kết thúc.');
      }

      if (auction.currentHighestBidderId === bidderId) {
        throw new BadRequestException('Bạn đang là người trả giá cao nhất hiện tại.');
      }

      const currentHighest = Number(auction.currentHighestBid);
      const increment = Number(auction.bidIncrement);
      const startingPrice = Number(auction.startingPrice);

      const requiredMin = auction.totalBidsCount === 0 ? startingPrice : currentHighest + increment;

      if (bidAmount < requiredMin) {
        throw new BadRequestException(
          `Mức giá trả tối thiểu hợp lệ là ${requiredMin.toLocaleString('vi-VN')} VND.`,
        );
      }

      const bidderWallet = await tx.wallet.findUnique({
        where: { userId: bidderId },
      });

      if (!bidderWallet || Number(bidderWallet.balance) < bidAmount) {
        throw new BadRequestException(
          `Số dư khả dụng trong ví NEXUS Pay không đủ (${Number(bidderWallet?.balance || 0).toLocaleString('vi-VN')} VND). Cần tối thiểu ${bidAmount.toLocaleString('vi-VN')} VND để đặt cọc.`,
        );
      }

      let isExtended = auction.isExtended;
      let newEndTime = auction.endTime;
      let extendedSeconds = 0;
      const remainingMs = auction.endTime.getTime() - now.getTime();

      if (remainingMs <= 120000) {
        extendedSeconds = 120;
        newEndTime = new Date(auction.endTime.getTime() + 120000);
        isExtended = true;
      }

      await tx.wallet.update({
        where: { id: bidderWallet.id },
        data: {
          balance: { decrement: bidAmount },
          lockedBalance: { increment: bidAmount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: bidderWallet.id,
          amount: bidAmount,
          type: WalletTransactionType.AUCTION_BID_LOCK,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: auction.id,
          description: `Khóa cọc tham gia đấu giá #${auction.id.slice(0, 8)}`,
        },
      });

      const previousBidderId = auction.currentHighestBidderId;
      if (previousBidderId && previousBidderId !== bidderId && currentHighest > 0) {
        const prevWallet = await tx.wallet.findUnique({
          where: { userId: previousBidderId },
        });

        if (prevWallet) {
          await tx.wallet.update({
            where: { id: prevWallet.id },
            data: {
              lockedBalance: { decrement: currentHighest },
              balance: { increment: currentHighest },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: prevWallet.id,
              amount: currentHighest,
              type: WalletTransactionType.AUCTION_BID_REFUND,
              status: WalletTransactionStatus.SUCCESS,
              referenceId: auction.id,
              description: `Hoàn cọc đấu giá #${auction.id.slice(0, 8)} do có người trả giá cao hơn`,
            },
          });

          await tx.notification.create({
            data: {
              userId: previousBidderId,
              title: 'Bạn đã bị vượt giá đấu!',
              content: `Có người vừa trả mức giá cao hơn (${bidAmount.toLocaleString('vi-VN')} VND) cho phiên "${auction.title}". Số tiền đặt cọc (${currentHighest.toLocaleString('vi-VN')} VND) đã được hoàn lại vào ví của bạn.`,
              type: NotificationType.AUCTION,
              channel: NotificationChannel.IN_APP,
            },
          });
        }

        await tx.bid.updateMany({
          where: {
            auctionId: auction.id,
            status: BidStatus.ACCEPTED,
          },
          data: {
            status: BidStatus.SUPERSEDED,
          },
        });
      }

      const createdBid = await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId,
          bidAmount,
          status: BidStatus.ACCEPTED,
        },
        include: {
          bidder: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      });

      const nextStatus = isExtended ? AuctionStatus.EXTENDED : auction.status;

      const updatedAuction = await tx.auction.update({
        where: { id: auction.id },
        data: {
          currentHighestBid: bidAmount,
          currentHighestBidderId: bidderId,
          totalBidsCount: { increment: 1 },
          endTime: newEndTime,
          isExtended,
          status: nextStatus,
        },
      });

      return {
        bid: createdBid,
        auction: updatedAuction,
        extendedSeconds,
        newEndTime,
      };
    });

    this.auctionGateway.broadcastBidPlaced({
      auctionId: result.auction.id,
      bidId: result.bid.id,
      bidderId: result.bid.bidder.id,
      bidderName: this.maskName(result.bid.bidder.fullName),
      bidAmount: Number(result.bid.bidAmount),
      placedAt: result.bid.placedAt.toISOString(),
      newMinimumBid: Number(result.auction.currentHighestBid) + Number(result.auction.bidIncrement),
    });

    if (result.extendedSeconds > 0) {
      this.auctionGateway.broadcastTimeExtended({
        auctionId: result.auction.id,
        extendedBySeconds: result.extendedSeconds,
        newEndTime: result.newEndTime.toISOString(),
        reason: 'ANTI_SNIPING',
      });
    }

    return {
      success: true,
      bidId: result.bid.id,
      bidAmount: Number(result.bid.bidAmount),
      currentHighestBid: Number(result.auction.currentHighestBid),
      endTime: result.auction.endTime,
      isExtended: result.auction.isExtended,
      status: result.auction.status,
    };
  }

  /**
   * Concludes an auction room and settles the winning bidder or failures.
   */
  async endAuction(
    auctionId: string,
    callerId?: string,
    callerRole?: string,
  ): Promise<{
    id: string;
    status: AuctionStatus;
    winningBidderId: string | null;
    winningPrice: number;
    awardId?: string;
  }> {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          bids: { where: { status: BidStatus.ACCEPTED }, orderBy: { bidAmount: 'desc' }, take: 1 },
        },
      });
      if (!auction) throw new NotFoundException('Không tìm thấy phiên đấu giá.');
      const privileged = callerRole === Role.ADMIN || callerRole === Role.SUPPORT_STAFF;
      if (callerId && !privileged && auction.sellerId !== callerId)
        throw new ForbiddenException('Bạn không có quyền kết thúc phiên của người khác.');
      if (['ENDED', 'SETTLED', 'FAILED', 'CANCELLED'].includes(auction.status)) {
        const award = await tx.auctionAward.findFirst({
          where: { auctionId },
          orderBy: { expiresAt: 'desc' },
        });
        return {
          id: auction.id,
          status: auction.status,
          winningBidderId: auction.currentHighestBidderId,
          winningPrice: Number(auction.currentHighestBid),
          awardId: award?.id,
          changed: false,
        };
      }
      if (!privileged && Date.now() < auction.endTime.getTime())
        throw new BadRequestException('Phiên đấu giá chưa kết thúc.');
      const winner = auction.bids[0];
      const meetsReserve =
        winner && (!auction.reservePrice || winner.bidAmount.gte(auction.reservePrice));
      if (meetsReserve) {
        if (!auction.productId || !auction.sellerId)
          throw new BadRequestException('Cần đối soát sản phẩm ký gửi trước khi tạo đơn.');
        const award = await this.checkout.createAward(tx, {
          auctionId,
          bidId: winner.id,
          buyerId: winner.bidderId,
          sellerId: auction.sellerId,
          productId: auction.productId,
          amount: winner.bidAmount,
          depositAmount: winner.bidAmount,
          stockReference: auctionId,
        });
        await tx.bid.update({ where: { id: winner.id }, data: { status: 'WINNING' } });
        await tx.auction.update({ where: { id: auctionId }, data: { status: 'ENDED' } });
        await tx.notification.create({
          data: {
            userId: winner.bidderId,
            title: 'Chúc mừng! Bạn đã thắng phiên đấu giá',
            content: `Bạn đã chiến thắng phiên đấu giá "${auction.title}" với mức giá ${Number(winner.bidAmount).toLocaleString('vi-VN')} VND. Vui lòng hoàn tất nhận hàng và thanh toán trong vòng 24 giờ!`,
            type: 'AUCTION',
            channel: 'IN_APP',
          },
        });
        await tx.notification.create({
          data: {
            userId: auction.sellerId,
            title: 'Phiên đấu giá của bạn đã kết thúc thành công!',
            content: `Phiên đấu giá "${auction.title}" đã kết thúc với người thắng trả mức giá ${Number(winner.bidAmount).toLocaleString('vi-VN')} VND.`,
            type: 'AUCTION',
            channel: 'IN_APP',
          },
        });
        return {
          id: auctionId,
          status: AuctionStatus.ENDED,
          winningBidderId: winner.bidderId,
          winningPrice: Number(winner.bidAmount),
          awardId: award.id,
          changed: true,
        };
      }
      if (winner) {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: winner.bidderId } });
        const refunded = await tx.wallet.updateMany({
          where: { id: wallet.id, lockedBalance: { gte: winner.bidAmount } },
          data: {
            lockedBalance: { decrement: winner.bidAmount },
            balance: { increment: winner.bidAmount },
          },
        });
        if (refunded.count !== 1)
          throw new BadRequestException('Tiền cọc đấu giá cần được đối soát.');
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: winner.bidAmount,
            type: 'AUCTION_BID_REFUND',
            status: 'SUCCESS',
            referenceId: auctionId,
            description: 'Hoàn cọc do không đạt giá bảo lưu',
          },
        });
        await tx.bid.update({ where: { id: winner.id }, data: { status: 'REJECTED' } });
      }
      await this.stock.release(tx, auctionId);
      await tx.auction.update({ where: { id: auctionId }, data: { status: 'FAILED' } });
      return {
        id: auctionId,
        status: AuctionStatus.FAILED,
        winningBidderId: null,
        winningPrice: 0,
        changed: true,
      };
    });
    if (result.changed)
      this.auctionGateway.broadcastAuctionEnded({
        auctionId,
        winningBidderId: result.winningBidderId,
        winningPrice: result.winningPrice,
      });
    const { changed: _changed, ...response } = result;
    return response;
  }

  /**
   * Retrieves single seller auction listings (legacy compatibility).
   */
  async getMyAuctions(sellerId: string, query: AuctionQueryDto) {
    return this.getAuctions({ ...query, sellerId });
  }

  /**
   * Legacy method for seller creating individual auction (retained for backward compatibility).
   */
  async createAuction(sellerId: string, dto: CreateAuctionDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm chỉ định để đấu giá.');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không sở hữu sản phẩm này để đưa vào đấu giá.');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();

    if (
      !Number.isFinite(endTime.getTime()) ||
      !Number.isFinite(startTime.getTime()) ||
      endTime.getTime() - startTime.getTime() < 3600000 ||
      endTime.getTime() - startTime.getTime() > 7 * 86400000
    ) {
      throw new BadRequestException('Phiên đấu giá phải kéo dài từ 60 phút đến 7 ngày.');
    }

    const seller = await this.prisma.user.findUnique({ where: { id: sellerId } });
    if (
      !seller ||
      seller.isShopSuspended ||
      seller.reputationScore < 50 ||
      trustLevelFor(seller.reputationScore) === ReputationTrustLevel.PROBATION ||
      ['PROBATION', 'SUSPENDED'].includes(seller.trustLevel)
    )
      throw new BadRequestException('Người bán chưa đủ điều kiện tạo phiên đấu giá.');

    const status = startTime <= now ? AuctionStatus.ACTIVE : AuctionStatus.SCHEDULED;

    return this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.create({
        data: {
          productId: dto.productId,
          sellerId,
          title: dto.title.trim(),
          startingPrice: dto.startingPrice,
          reservePrice: dto.reservePrice ?? null,
          currentHighestBid: 0,
          bidIncrement: dto.bidIncrement ?? 100000,
          status,
          startTime,
          endTime,
          originalEndTime: endTime,
          isExtended: false,
          totalBidsCount: 0,
        },
        include: {
          product: true,
        },
      });
      await this.stock.reserve(tx, {
        productId: dto.productId,
        referenceId: auction.id,
        expiresAt: new Date(endTime.getTime() + 86400000),
      });
      return auction;
    });
  }

  /**
   * Retrieves bid history submitted by an individual buyer.
   */
  async getMyBids(bidderId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { bidderId },
      orderBy: { placedAt: 'desc' },
      take: 50,
      include: {
        auction: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
                basePrice: true,
              },
            },
          },
        },
      },
    });

    return bids.map((b) => ({
      id: b.id,
      bidAmount: Number(b.bidAmount),
      status: b.status,
      placedAt: b.placedAt,
      auction: {
        id: b.auction.id,
        title: b.auction.title,
        status: b.auction.status,
        endTime: b.auction.endTime,
        currentHighestBid: Number(b.auction.currentHighestBid),
        isLeading: b.auction.currentHighestBidderId === bidderId,
        product: b.auction.product,
      },
    }));
  }

  /**
   * Anonymizes user full name for privacy compliance in public auction transcripts.
   */
  private maskName(name: string): string {
    if (!name || name.length <= 2) return 'Người dùng ***';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return `${parts[0].slice(0, 2)}***`;
    }
    return `${parts[0]} *** ${parts[parts.length - 1]}`;
  }
}
