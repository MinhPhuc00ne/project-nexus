import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { AuctionItemStatus, Prisma, Role } from '@prisma/client';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { AdminCreateAuctionInput } from '../dtos/admin-create-auction.dto';
import { AdminUpdateAuctionInput } from '../dtos/admin-update-auction.dto';
import { AuctionQueryInput } from '../dtos/auction-query.dto';
import { AuctionIntroShowcaseResponseDto } from '../dtos/auction-showcase-response.dto';
import { PlaceBidInput } from '../dtos/place-bid.dto';
import { RegisterAuctionItemInput } from '../dtos/register-auction-item.dto';
import { ReviewAuctionItemInput } from '../dtos/review-auction-item.dto';
import { StaffAuctionNoteInput } from '../dtos/staff-auction-note.dto';
import { AuctionGateway } from '../gateways/auction.gateway';
import { AuctionAdminHelper } from './auction-admin.helper';
import { AuctionBiddingHelper } from './auction-bidding.helper';
import { AuctionConsignmentHelper } from './auction-consignment.helper';
import {
  BUYER_VISIBLE_AWARD_STATUSES,
  INTRO_CLIMAX_DURATION_MS,
  INTRO_HALL_DURATION_MS,
  INTRO_LOT_DURATION_MS,
  computeIntroState,
  getIntroDurationMs,
  roundCurrency,
} from './auction-domain.utils';

/**
 * Orchestrates multi-lot auction rooms, seller consignments, admin lifecycle controls,
 * per-lot real-time bidding with 100% wallet holds and +120s anti-sniping, and staff 3D support.
 */
@Injectable()
export class AuctionService implements OnModuleInit {
  static readonly INTRO_HALL_DURATION_MS = INTRO_HALL_DURATION_MS;
  static readonly INTRO_LOT_DURATION_MS = INTRO_LOT_DURATION_MS;
  static readonly INTRO_CLIMAX_DURATION_MS = INTRO_CLIMAX_DURATION_MS;

  static getIntroDurationMs(lotCount: number): number {
    return getIntroDurationMs(lotCount);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionGateway: AuctionGateway,
    _stock: AuctionStockService,
    private readonly adminHelper: AuctionAdminHelper,
    private readonly consignmentHelper: AuctionConsignmentHelper,
    private readonly biddingHelper: AuctionBiddingHelper,
  ) {}

  /** Registers the real-time WebSocket bidding handler once the module boots. */
  onModuleInit(): void {
    this.auctionGateway.registerPlaceBidHandler((auctionId, auctionItemId, bidderId, bidAmount) =>
      this.placeBid(auctionId, bidderId, { auctionItemId, bidAmount }),
    );
  }

  /**
   * Lists public and filterable auction rooms with paginated approved lots preview.
   */
  async getAuctions(query: AuctionQueryInput) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(50, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.AuctionWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.sellerId) {
      where.OR = [{ sellerId: query.sellerId }, { items: { some: { sellerId: query.sellerId } } }];
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { items: { some: { title: { contains: term, mode: 'insensitive' } } } },
          ],
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auction.count({ where }),
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
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
              basePrice: true,
              images: { orderBy: { sortOrder: 'asc' } },
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          items: {
            where: { status: AuctionItemStatus.APPROVED },
            orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              title: true,
              images: true,
              threeModelKey: true,
              lotNumber: true,
              lotStatus: true,
              startingPrice: true,
              proposedStartingPrice: true,
              bidIncrement: true,
              proposedBidIncrement: true,
              currentHighestBid: true,
              totalBidsCount: true,
              endTime: true,
            },
          },
          _count: {
            select: { bids: true, items: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map((auction) => {
        const introState = computeIntroState(
          auction.status,
          auction.startTime,
          auction.items.length,
        );
        return {
          ...auction,
          targetUrl: auctionTargetUrl(auction.id),
          startingPrice: Number(auction.startingPrice),
          reservePrice: auction.reservePrice ? Number(auction.reservePrice) : null,
          currentHighestBid: Number(auction.currentHighestBid),
          bidIncrement: Number(auction.bidIncrement),
          product: auction.product
            ? {
                ...auction.product,
                basePrice: Number(auction.product.basePrice),
              }
            : auction.product,
          ...introState,
          items: auction.items.map((lot) => ({
            ...lot,
            startingPrice: Number(lot.startingPrice ?? lot.proposedStartingPrice),
            bidIncrement: Number(lot.bidIncrement ?? lot.proposedBidIncrement),
            currentHighestBid: Number(lot.currentHighestBid),
          })),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Returns complete multi-lot room telemetry, recent bids per lot, intro timing,
   * and role-scoped visibility for reserve prices and active awards.
   */
  async getAuctionDetail(id: string, currentUserId?: string) {
    const [auction, currentUser] = await Promise.all([
      this.prisma.auction.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              description: true,
              basePrice: true,
              images: { orderBy: { sortOrder: 'asc' } },
              seller: {
                select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true },
              },
            },
          },
          seller: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              shopAvatarUrl: true,
              reputationScore: true,
            },
          },
          items: {
            where: { status: AuctionItemStatus.APPROVED },
            orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
            include: {
              seller: {
                select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true },
              },
              bids: {
                orderBy: { placedAt: 'desc' },
                take: 20,
                include: {
                  bidder: {
                    select: { id: true, fullName: true, avatarUrl: true },
                  },
                },
              },
              awards: {
                orderBy: { createdAt: 'desc' },
                take: 3,
                include: {
                  buyer: {
                    select: { id: true, fullName: true, email: true, reputationScore: true },
                  },
                },
              },
            },
          },
          bids: {
            orderBy: { placedAt: 'desc' },
            take: 30,
            include: {
              bidder: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      currentUserId
        ? this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: { id: true, role: true, isSellerActive: true },
          })
        : Promise.resolve(null),
    ]);

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }

    const isPrivilegedViewer =
      currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPPORT_STAFF;
    const introState = computeIntroState(auction.status, auction.startTime, auction.items.length);

    const lots = auction.items.map((lot) => {
      const canSeeSecretReserve = isPrivilegedViewer || lot.sellerId === currentUserId;
      const startingPrice = Number(lot.startingPrice ?? lot.proposedStartingPrice);
      const reservePrice = lot.reservePrice
        ? Number(lot.reservePrice)
        : lot.proposedReservePrice
          ? Number(lot.proposedReservePrice)
          : null;
      const bidIncrement = Number(lot.bidIncrement ?? lot.proposedBidIncrement);
      const currentHighestBid = Number(lot.currentHighestBid);
      const minimumNextBid =
        lot.totalBidsCount === 0
          ? Math.max(startingPrice, reservePrice ?? 0)
          : currentHighestBid + bidIncrement;
      const reserveMet = reservePrice === null ? true : currentHighestBid >= reservePrice;

      const visibleAward = lot.awards.find((award) => {
        if (isPrivilegedViewer || lot.sellerId === currentUserId) return true;
        return (
          award.buyerId === currentUserId && BUYER_VISIBLE_AWARD_STATUSES.includes(award.status)
        );
      });

      return {
        id: lot.id,
        auctionId: lot.auctionId,
        sellerId: lot.sellerId,
        title: lot.title,
        description: lot.description,
        images: lot.images,
        threeModelKey: lot.threeModelKey,
        weightGrams: lot.weightGrams,
        lengthCm: lot.lengthCm,
        widthCm: lot.widthCm,
        heightCm: lot.heightCm,
        appraisalCertificateNumber: lot.appraisalCertificateNumber,
        appraisalAgency: lot.appraisalAgency,
        certificateImages: lot.certificateImages,
        certificateIssueDate: lot.certificateIssueDate,
        status: lot.status,
        lotStatus: lot.lotStatus,
        lotNumber: lot.lotNumber,
        startingPrice,
        bidIncrement,
        currentHighestBid,
        currentHighestBidderId: lot.currentHighestBidderId,
        totalBidsCount: lot.totalBidsCount,
        minimumNextBid,
        hasReservePrice: reservePrice !== null,
        reserveMet,
        ...(canSeeSecretReserve ? { reservePrice, staffNote: lot.staffNote } : {}),
        startTime: lot.startTime ?? auction.startTime,
        endTime: lot.endTime ?? auction.endTime,
        originalEndTime: lot.originalEndTime ?? auction.originalEndTime,
        isExtended: lot.isExtended,
        seller: lot.seller,
        bids: lot.bids.map((bid) => ({
          ...bid,
          bidAmount: Number(bid.bidAmount),
        })),
        activeAward: visibleAward
          ? {
              ...visibleAward,
              offerAmount: Number(visibleAward.offerAmount),
              depositAmount: Number(visibleAward.depositAmount),
              remainingProductAmount: roundCurrency(
                Number(visibleAward.offerAmount) - Number(visibleAward.depositAmount),
              ),
            }
          : null,
      };
    });

    return {
      ...auction,
      targetUrl: auctionTargetUrl(auction.id),
      startingPrice: Number(auction.startingPrice),
      currentHighestBid: Number(auction.currentHighestBid),
      bidIncrement: Number(auction.bidIncrement),
      reservePrice:
        isPrivilegedViewer && auction.reservePrice ? Number(auction.reservePrice) : null,
      ...introState,
      viewerMode: currentUser
        ? {
            role: currentUser.role,
            isSellerActive: currentUser.isSellerActive,
            canPlaceBidInCurrentMode:
              currentUser.role !== Role.ADMIN &&
              currentUser.role !== Role.SUPPORT_STAFF &&
              !currentUser.isSellerActive,
          }
        : null,
      items: lots,
      lots,
      bids: auction.bids.map((bid) => ({
        ...bid,
        bidAmount: Number(bid.bidAmount),
      })),
    };
  }

  /**
   * Returns synchronized intro showcase data and lot live metadata for late joiners.
   */
  async getAuctionIntroShowcase(auctionId: string): Promise<AuctionIntroShowcaseResponseDto> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        items: {
          where: { status: AuctionItemStatus.APPROVED },
          orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
          include: {
            seller: {
              select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true },
            },
          },
        },
      },
    });
    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }

    const introState = computeIntroState(auction.status, auction.startTime, auction.items.length);

    return {
      auctionId: auction.id,
      title: auction.title,
      description: auction.description,
      status: auction.status,
      startedAt: auction.startTime.toISOString(),
      endTime: auction.endTime.toISOString(),
      serverTime: new Date().toISOString(),
      introDurationMs: introState.introDurationMs,
      isIntroActive: introState.isIntroActive,
      elapsedMs: introState.elapsedMs,
      items: auction.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        images: item.images,
        threeModelKey: item.threeModelKey,
        lotNumber: item.lotNumber,
        startingPrice: Number(item.startingPrice ?? item.proposedStartingPrice),
        proposedStartingPrice: Number(item.proposedStartingPrice),
        reservePrice: item.reservePrice ? Number(item.reservePrice) : null,
        proposedReservePrice: item.proposedReservePrice ? Number(item.proposedReservePrice) : null,
        bidIncrement: Number(item.bidIncrement ?? item.proposedBidIncrement),
        proposedBidIncrement: Number(item.proposedBidIncrement),
        appraisalCertificateNumber: item.appraisalCertificateNumber,
        appraisalAgency: item.appraisalAgency,
        certificateImages: item.certificateImages,
        certificateIssueDate: item.certificateIssueDate?.toISOString() ?? null,
        lotStatus: item.lotStatus,
        currentHighestBid: Number(item.currentHighestBid),
        currentHighestBidderId: item.currentHighestBidderId,
        totalBidsCount: item.totalBidsCount,
        startTime: item.startTime?.toISOString() ?? null,
        endTime: item.endTime?.toISOString() ?? null,
        seller: item.seller,
      })),
    };
  }

  adminCreateAuction(adminId: string, dto: AdminCreateAuctionInput) {
    return this.adminHelper.adminCreateAuction(adminId, dto);
  }

  adminUpdateAuction(auctionId: string, dto: AdminUpdateAuctionInput) {
    return this.adminHelper.adminUpdateAuction(auctionId, dto);
  }

  adminLockConsignment(auctionId: string) {
    return this.adminHelper.adminLockConsignment(auctionId);
  }

  adminStartAuction(auctionId: string) {
    return this.adminHelper.adminStartAuction(auctionId);
  }

  adminDeleteAuction(auctionId: string) {
    return this.adminHelper.adminDeleteAuction(auctionId);
  }

  registerAuctionItem(auctionId: string, sellerId: string, dto: RegisterAuctionItemInput) {
    return this.consignmentHelper.registerAuctionItem(auctionId, sellerId, dto);
  }

  adminGetAuctionItems(auctionId: string) {
    return this.consignmentHelper.adminGetAuctionItems(auctionId);
  }

  adminReviewAuctionItem(itemId: string, adminId: string, dto: ReviewAuctionItemInput) {
    return this.consignmentHelper.adminReviewAuctionItem(itemId, adminId, dto);
  }

  getSellerConsignments(sellerId: string) {
    return this.consignmentHelper.getSellerConsignments(sellerId);
  }

  checkBuyerEligibility(auctionId: string, buyerId: string) {
    return this.biddingHelper.checkBuyerEligibility(auctionId, buyerId);
  }

  placeBid(auctionId: string, bidderId: string, dto: PlaceBidInput) {
    return this.biddingHelper.placeBid(auctionId, bidderId, dto);
  }

  adminEndLot(auctionId: string, itemId: string, adminId: string) {
    return this.biddingHelper.adminEndLot(auctionId, itemId, adminId);
  }

  endDueLots(): Promise<void> {
    return this.biddingHelper.endDueLots();
  }

  endLotInternal(itemId: string, endedByAdminId: string | null) {
    return this.biddingHelper.endLotInternal(itemId, endedByAdminId);
  }

  getMyBids(bidderId: string) {
    return this.biddingHelper.getMyBids(bidderId);
  }

  getStaffOverview() {
    return this.consignmentHelper.getStaffOverview();
  }

  staffAddItemNote(itemId: string, staffId: string, dto: StaffAuctionNoteInput) {
    return this.consignmentHelper.staffAddItemNote(itemId, staffId, dto);
  }

  requestAuctionSupportChat(auctionId: string, userId: string, userRole: Role, message: string) {
    return this.consignmentHelper.requestAuctionSupportChat(auctionId, userId, userRole, message);
  }
}
