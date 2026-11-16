import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  AuctionItemStatus,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
  ReputationTrustLevel,
  Role,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import type {
  AuctionStatus as NexusAuctionStatus,
  WsAuctionIntroItemPayload,
  WsLotEndedPayload,
} from '@nexus/types';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ChatService } from '../../chat/services/chat.service';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { AuctionCheckoutService } from '../../commerce/services/auction-checkout.service';
import { AdminCreateAuctionDto } from '../dtos/admin-create-auction.dto';
import { AdminUpdateAuctionDto } from '../dtos/admin-update-auction.dto';
import { AuctionQueryDto } from '../dtos/auction-query.dto';
import { AuctionIntroShowcaseResponseDto } from '../dtos/auction-showcase-response.dto';
import { PlaceBidDto } from '../dtos/place-bid.dto';
import { RegisterAuctionItemDto } from '../dtos/register-auction-item.dto';
import { ReviewAction, ReviewAuctionItemDto } from '../dtos/review-auction-item.dto';
import { StaffAuctionNoteDto } from '../dtos/staff-auction-note.dto';
import { AuctionGateway } from '../gateways/auction.gateway';

const ANTI_SNIPING_WINDOW_MS = 120_000;
const ANTI_SNIPING_EXTENSION_MS = 120_000;
const MIN_AUCTION_DURATION_MS = 30 * 60 * 1000;

const BUYER_VISIBLE_AWARD_STATUSES = [
  'AWAITING_ACCEPTANCE',
  'AWAITING_DEPOSIT',
  'AWAITING_CHECKOUT',
  'PAID',
];

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function lotDisplayTitle(lotNumber: number | null | undefined, title: string): string {
  return lotNumber ? `Lô #${lotNumber}: ${title}` : title;
}

/**
 * Orchestrates multi-lot auction rooms, seller consignments, admin lifecycle controls,
 * per-lot real-time bidding with 100% wallet holds and +120s anti-sniping, and staff 3D support.
 */
@Injectable()
export class AuctionService implements OnModuleInit {
  private readonly logger = new Logger(AuctionService.name);
  static readonly INTRO_HALL_DURATION_MS = 3800;
  static readonly INTRO_LOT_DURATION_MS = 4800;
  static readonly INTRO_CLIMAX_DURATION_MS = 3500;

  static getIntroDurationMs(lotCount: number): number {
    return (
      AuctionService.INTRO_HALL_DURATION_MS +
      Math.max(1, lotCount) * AuctionService.INTRO_LOT_DURATION_MS +
      AuctionService.INTRO_CLIMAX_DURATION_MS
    );
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionGateway: AuctionGateway,
    private readonly stock: AuctionStockService,
    private readonly checkout: AuctionCheckoutService,
    @Optional() private readonly chatService?: ChatService,
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
  async getAuctions(query: AuctionQueryDto) {
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
        const introState = this.computeIntroState(
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
    const introState = this.computeIntroState(
      auction.status,
      auction.startTime,
      auction.items.length,
    );

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

    const introState = this.computeIntroState(
      auction.status,
      auction.startTime,
      auction.items.length,
    );

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

  /**
   * Admin creates a multi-lot auction room and notifies eligible Sellers using the room creation time
   * so they can consign items before the consignment deadline.
   */
  async adminCreateAuction(adminId: string, dto: AdminCreateAuctionDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Thời gian bắt đầu hoặc kết thúc không hợp lệ.');
    }
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    }

    let consignmentDeadline: Date | null = null;
    if (dto.consignmentDeadline) {
      consignmentDeadline = new Date(dto.consignmentDeadline);
      if (Number.isNaN(consignmentDeadline.getTime())) {
        throw new BadRequestException('Hạn chót ký gửi sản phẩm không hợp lệ.');
      }
      if (
        consignmentDeadline.getTime() <= startTime.getTime() ||
        consignmentDeadline.getTime() >= endTime.getTime()
      ) {
        throw new BadRequestException(
          'Hạn chót ký gửi phải nằm sau thời điểm mở phiên và trước thời điểm kết thúc phiên.',
        );
      }
    }

    const minBuyerReputation = dto.minBuyerReputation ?? 40;
    const minSellerReputation = dto.minSellerReputation ?? 50;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.auction.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          imageUrl: dto.imageUrl?.trim() || null,
          createdByAdminId: adminId,
          status: AuctionStatus.SCHEDULED,
          startTime,
          endTime,
          originalEndTime: endTime,
          consignmentDeadline,
          minBuyerReputation,
          minSellerReputation,
          startingPrice: 0,
          bidIncrement: 100000,
        },
      });

      const eligibleSellers = await tx.user.findMany({
        where: {
          id: { not: adminId },
          role: Role.SELLER,
          isShopSuspended: false,
          reputationScore: { gte: minSellerReputation },
        },
        select: { id: true },
      });

      if (eligibleSellers.length > 0) {
        const createdAtLabel = created.createdAt.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        const deadlineLabel = consignmentDeadline
          ? consignmentDeadline.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          : startTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await tx.notification.createMany({
          data: eligibleSellers.map((seller) => ({
            userId: seller.id,
            auctionId: created.id,
            targetUrl: auctionTargetUrl(created.id),
            title: `Phiên đấu giá mới vừa mở ký gửi: ${created.title}`,
            content: `Phòng đấu giá được Admin tạo lúc ${createdAtLabel}. Người bán đủ điều kiện có thể gửi vật phẩm ký gửi trước ${deadlineLabel}.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_CONSIGNMENT_OPENED',
              auctionId: created.id,
              createdAt: created.createdAt.toISOString(),
              consignmentDeadline: consignmentDeadline?.toISOString() ?? null,
            },
          })),
        });
      }

      return created;
    });
  }

  /**
   * Admin updates a SCHEDULED auction room configuration.
   */
  async adminUpdateAuction(auctionId: string, dto: AdminUpdateAuctionDto) {
    const existing = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }
    if (existing.status !== AuctionStatus.SCHEDULED && existing.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể chỉnh sửa phòng đấu giá khi chưa bắt đầu.');
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    const consignmentDeadline =
      dto.consignmentDeadline !== undefined
        ? dto.consignmentDeadline
          ? new Date(dto.consignmentDeadline)
          : null
        : existing.consignmentDeadline;

    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    }
    if (
      consignmentDeadline &&
      (consignmentDeadline.getTime() <= startTime.getTime() ||
        consignmentDeadline.getTime() >= endTime.getTime())
    ) {
      throw new BadRequestException(
        'Hạn chót ký gửi phải nằm sau thời gian bắt đầu và trước thời gian kết thúc.',
      );
    }

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
        startTime,
        endTime,
        originalEndTime: endTime,
        consignmentDeadline,
        ...(dto.minBuyerReputation !== undefined
          ? { minBuyerReputation: dto.minBuyerReputation }
          : {}),
        ...(dto.minSellerReputation !== undefined
          ? { minSellerReputation: dto.minSellerReputation }
          : {}),
      },
    });
  }

  /**
   * Admin locks consignment early so sellers can no longer submit new items to the room.
   */
  async adminLockConsignment(auctionId: string) {
    const existing = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }
    if (existing.isConsignmentLocked) {
      return existing;
    }

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        isConsignmentLocked: true,
        consignmentLockedAt: new Date(),
      },
    });
  }

  /**
   * Admin starts a scheduled multi-lot auction session manually:
   * locks consignment, activates all approved lots simultaneously, broadcasts WebSocket `AUCTION_STARTED`,
   * and notifies Buyers that live viewing and bidding has opened.
   */
  async adminStartAuction(auctionId: string) {
    const now = new Date();
    const { updated, approvedLots } = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const existing = await tx.auction.findUnique({
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
      if (!existing) {
        throw new NotFoundException('Không tìm thấy phòng đấu giá.');
      }
      if (existing.status !== AuctionStatus.SCHEDULED) {
        throw new BadRequestException('Chỉ có thể bắt đầu phiên đấu giá đang ở trạng thái chờ.');
      }
      if (existing.items.length === 0) {
        throw new BadRequestException(
          'Phiên đấu giá chưa có vật phẩm nào được duyệt (APPROVED) để bắt đầu.',
        );
      }

      const plannedDuration = existing.endTime.getTime() - existing.startTime.getTime();
      const targetEndTime =
        existing.endTime.getTime() > now.getTime() + 60_000
          ? existing.endTime
          : new Date(now.getTime() + Math.max(MIN_AUCTION_DURATION_MS, plannedDuration));

      await tx.auctionItem.updateMany({
        where: { auctionId, status: AuctionItemStatus.APPROVED },
        data: {
          lotStatus: AuctionStatus.ACTIVE,
          startTime: now,
          endTime: targetEndTime,
          originalEndTime: targetEndTime,
          isExtended: false,
        },
      });

      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: AuctionStatus.ACTIVE,
          isConsignmentLocked: true,
          consignmentLockedAt: existing.consignmentLockedAt ?? now,
          startTime: now,
          endTime: targetEndTime,
          originalEndTime: targetEndTime,
        },
      });

      return { updated: updatedAuction, approvedLots: existing.items };
    });

    const introDurationMs = AuctionService.getIntroDurationMs(approvedLots.length);
    const introItems: WsAuctionIntroItemPayload[] = approvedLots.map((item) => ({
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
      lotStatus: AuctionStatus.ACTIVE as unknown as NexusAuctionStatus,
      currentHighestBid: 0,
      currentHighestBidderId: null,
      totalBidsCount: 0,
      startTime: now.toISOString(),
      endTime: updated.endTime.toISOString(),
      seller: item.seller,
    }));

    this.auctionGateway.broadcastAuctionStarted({
      auctionId: updated.id,
      title: updated.title,
      description: updated.description,
      startedAt: now.toISOString(),
      endTime: updated.endTime.toISOString(),
      serverTime: new Date().toISOString(),
      introDurationMs,
      items: introItems,
    });

    await this.dispatchAuctionStartNotifications(
      updated,
      approvedLots.map((item) => item.sellerId),
    );

    return {
      ...updated,
      startingPrice: Number(updated.startingPrice),
      bidIncrement: Number(updated.bidIncrement),
      introDurationMs,
      approvedLotsCount: approvedLots.length,
      items: introItems,
      lots: introItems,
    };
  }

  /**
   * Admin deletes a non-active auction room that has no bids or awards.
   */
  async adminDeleteAuction(auctionId: string) {
    const existing = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { _count: { select: { bids: true, awards: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }
    if (existing.status === AuctionStatus.ACTIVE || existing.status === AuctionStatus.EXTENDED) {
      throw new BadRequestException('Không thể xóa phòng đấu giá đang diễn ra.');
    }
    if (existing._count.bids > 0 || existing._count.awards > 0) {
      throw new BadRequestException('Không thể xóa phòng đấu giá đã phát sinh lượt đặt giá.');
    }

    await this.prisma.auction.delete({ where: { id: auctionId } });
    return { success: true, deletedId: auctionId };
  }

  /**
   * Seller consigns an independent auction item (not linked to retail catalog/inventory) into a scheduled room.
   */
  async registerAuctionItem(auctionId: string, sellerId: string, dto: RegisterAuctionItemDto) {
    const [auction, seller] = await Promise.all([
      this.prisma.auction.findUnique({ where: { id: auctionId } }),
      this.prisma.user.findUnique({
        where: { id: sellerId },
        select: { id: true, role: true, reputationScore: true, isShopSuspended: true },
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
   * Checks whether an authenticated account is eligible to bid in the room
   * (validates Buyer mode, suspension status, reputation threshold, and wallet availability).
   */
  async checkBuyerEligibility(auctionId: string, buyerId: string) {
    const [auction, user, wallet] = await Promise.all([
      this.prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          items: {
            where: { status: AuctionItemStatus.APPROVED },
            select: {
              id: true,
              lotNumber: true,
              title: true,
              startingPrice: true,
              reservePrice: true,
              lotStatus: true,
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: buyerId },
        select: {
          id: true,
          role: true,
          isSellerActive: true,
          isShopSuspended: true,
          reputationScore: true,
          trustLevel: true,
        },
      }),
      this.prisma.wallet.findUnique({ where: { userId: buyerId } }),
    ]);

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phòng đấu giá.');
    }
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const introState = this.computeIntroState(
      auction.status,
      auction.startTime,
      auction.items.length,
    );
    const reasons: string[] = [];

    if (user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF) {
      reasons.push('Tài khoản Admin / Nhân viên hỗ trợ chỉ có quyền quản lý và quan sát.');
    }
    if (user.isSellerActive) {
      reasons.push(
        'Tài khoản đang ở chế độ Người bán chỉ được xem. Vui lòng chuyển sang chế độ Người mua để đặt giá.',
      );
    }
    if (user.isShopSuspended || user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      reasons.push('Tài khoản đang bị tạm khóa hoặc bị hạn chế quyền giao dịch.');
    }
    if (user.reputationScore < auction.minBuyerReputation) {
      reasons.push(
        `Điểm uy tín hiện tại (${user.reputationScore}) thấp hơn mức tối thiểu (${auction.minBuyerReputation}).`,
      );
    }
    if (!wallet) {
      reasons.push('Bạn chưa khởi tạo ví nền tảng để khóa 100% tiền giữ chỗ khi đặt giá.');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      reputationScore: user.reputationScore,
      minBuyerReputation: auction.minBuyerReputation,
      availableBalance: Number(wallet?.balance ?? 0),
      lockedBalance: Number(wallet?.lockedBalance ?? 0),
      isSellerActive: user.isSellerActive,
      introActive: introState.isIntroActive,
      approvedLotsCount: auction.items.length,
    };
  }

  /**
   * Places a competitive bid on a specific lot inside an active auction room.
   * Locks 100% of bidAmount in buyer's wallet, refunds 100% to any outbid buyer deterministically,
   * validates reserve price on single-bidder lots, and extends that lot's timer by +120s on late bids.
   */
  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const bidder = await this.prisma.user.findUnique({
      where: { id: bidderId },
      select: {
        id: true,
        role: true,
        fullName: true,
        isSellerActive: true,
        isShopSuspended: true,
        reputationScore: true,
        trustLevel: true,
      },
    });
    if (!bidder) {
      throw new NotFoundException('Không tìm thấy tài khoản đặt giá.');
    }
    if (bidder.role === Role.ADMIN || bidder.role === Role.SUPPORT_STAFF) {
      throw new ForbiddenException('Admin và Nhân viên hỗ trợ không thể tham gia đặt giá.');
    }
    if (bidder.isSellerActive) {
      throw new ForbiddenException(
        'Bạn đang ở chế độ Người bán nên chỉ có thể xem phòng đấu giá. Vui lòng chuyển về chế độ Người mua để đặt giá.',
      );
    }
    if (bidder.isShopSuspended || bidder.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException('Tài khoản đang bị hạn chế quyền tham gia đấu giá.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          items: {
            where: { status: AuctionItemStatus.APPROVED },
            orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
            select: { id: true },
          },
        },
      });
      if (!auction) {
        throw new NotFoundException('Không tìm thấy phòng đấu giá.');
      }
      if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.EXTENDED) {
        throw new BadRequestException('Phòng đấu giá hiện không trong trạng thái mở đặt giá.');
      }

      const introState = this.computeIntroState(
        auction.status,
        auction.startTime,
        auction.items.length,
      );
      if (introState.isIntroActive) {
        throw new BadRequestException(
          'Phòng đấu giá đang phát đoạn giới thiệu 3D, nút đặt giá sẽ mở sau khi giới thiệu kết thúc.',
        );
      }

      if (bidder.reputationScore < auction.minBuyerReputation) {
        throw new ForbiddenException(
          `Điểm uy tín tối thiểu để tham gia đấu giá là ${auction.minBuyerReputation}.`,
        );
      }

      let targetItemId = dto.auctionItemId;
      if (!targetItemId) {
        if (auction.items.length === 1) {
          targetItemId = auction.items[0].id;
        } else {
          throw new BadRequestException(
            'Phòng đấu giá có nhiều lô hàng. Vui lòng chọn đúng lô muốn đặt giá (auctionItemId).',
          );
        }
      }

      await tx.$queryRaw`SELECT id FROM auction_items WHERE id = ${targetItemId} FOR UPDATE`;
      const lot = await tx.auctionItem.findFirst({
        where: { id: targetItemId, auctionId, status: AuctionItemStatus.APPROVED },
      });
      if (!lot) {
        throw new NotFoundException('Không tìm thấy lô hàng hợp lệ trong phòng đấu giá này.');
      }
      if (lot.sellerId === bidderId) {
        throw new ForbiddenException('Người bán không thể tự đặt giá cho vật phẩm của chính mình.');
      }
      if (lot.lotStatus !== AuctionStatus.ACTIVE && lot.lotStatus !== AuctionStatus.EXTENDED) {
        throw new BadRequestException('Lô hàng này đã kết thúc nhận lượt đặt giá.');
      }

      const now = new Date();
      const effectiveLotEndTime = lot.endTime ?? auction.endTime;
      if (effectiveLotEndTime.getTime() <= now.getTime()) {
        throw new BadRequestException('Lô hàng này đã hết thời gian đặt giá.');
      }

      const startingPrice = Number(lot.startingPrice ?? lot.proposedStartingPrice);
      const reservePrice =
        lot.reservePrice !== null
          ? Number(lot.reservePrice)
          : lot.proposedReservePrice !== null
            ? Number(lot.proposedReservePrice)
            : null;
      const bidIncrement = Number(
        lot.bidIncrement ?? lot.proposedBidIncrement ?? auction.bidIncrement,
      );
      const currentHighestBid = Number(lot.currentHighestBid);
      const previousBidderId = lot.currentHighestBidderId;

      if (previousBidderId === bidderId) {
        throw new BadRequestException(
          'Bạn đang là người trả giá cao nhất hiện tại cho lô hàng này.',
        );
      }

      const requiredMinimum =
        lot.totalBidsCount === 0
          ? Math.max(startingPrice, reservePrice ?? 0)
          : currentHighestBid + bidIncrement;

      if (dto.bidAmount < requiredMinimum) {
        throw new BadRequestException(
          lot.totalBidsCount === 0 && reservePrice && reservePrice > startingPrice
            ? `Mức giá đặt đầu tiên phải đạt tối thiểu giá sàn (${formatVnd(requiredMinimum)}).`
            : `Giá đặt tối thiểu cho lượt tiếp theo là ${formatVnd(requiredMinimum)}.`,
        );
      }

      const walletOwners = [
        ...new Set([bidderId, previousBidderId].filter(Boolean) as string[]),
      ].sort();
      for (const ownerId of walletOwners) {
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${ownerId} FOR UPDATE`;
      }

      const bidderWallet = await tx.wallet.findUnique({ where: { userId: bidderId } });
      if (!bidderWallet || Number(bidderWallet.balance) < dto.bidAmount) {
        throw new BadRequestException(
          `Số dư ví khả dụng không đủ để giữ chỗ 100% mức giá đặt (${formatVnd(dto.bidAmount)}).`,
        );
      }

      await tx.wallet.update({
        where: { id: bidderWallet.id },
        data: {
          balance: { decrement: dto.bidAmount },
          lockedBalance: { increment: dto.bidAmount },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: bidderWallet.id,
          type: WalletTransactionType.AUCTION_BID_LOCK,
          amount: -dto.bidAmount,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: auctionId,
          description: `Giữ chỗ 100% giá đặt (${formatVnd(dto.bidAmount)}) cho ${lotDisplayTitle(lot.lotNumber, lot.title)}.`,
        },
      });

      if (previousBidderId && currentHighestBid > 0) {
        const prevWallet = await tx.wallet.findUnique({ where: { userId: previousBidderId } });
        if (prevWallet && Number(prevWallet.lockedBalance) >= currentHighestBid) {
          await tx.wallet.update({
            where: { id: prevWallet.id },
            data: {
              balance: { increment: currentHighestBid },
              lockedBalance: { decrement: currentHighestBid },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: prevWallet.id,
              type: WalletTransactionType.AUCTION_BID_REFUND,
              amount: currentHighestBid,
              status: WalletTransactionStatus.SUCCESS,
              referenceId: auctionId,
              description: `Hoàn 100% tiền giữ chỗ (${formatVnd(currentHighestBid)}) do có người trả giá cao hơn tại ${lotDisplayTitle(lot.lotNumber, lot.title)}.`,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: previousBidderId,
            auctionId,
            targetUrl: auctionTargetUrl(auctionId),
            title: `Bạn đã bị vượt giá tại ${lotDisplayTitle(lot.lotNumber, lot.title)}`,
            content: `Đã có người trả giá ${formatVnd(dto.bidAmount)} cho ${lotDisplayTitle(lot.lotNumber, lot.title)}. Toàn bộ ${formatVnd(currentHighestBid)} giữ chỗ của bạn đã được mở khóa về ví.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_OUTBID',
              auctionId,
              auctionItemId: lot.id,
              newHighestBid: dto.bidAmount,
            },
          },
        });
      }

      const bid = await tx.bid.create({
        data: {
          auctionId,
          auctionItemId: lot.id,
          bidderId,
          bidAmount: dto.bidAmount,
          placedAt: now,
        },
      });

      const remainingMs = effectiveLotEndTime.getTime() - now.getTime();
      const shouldExtend = remainingMs <= ANTI_SNIPING_WINDOW_MS;
      const updatedLotEndTime = shouldExtend
        ? new Date(effectiveLotEndTime.getTime() + ANTI_SNIPING_EXTENSION_MS)
        : effectiveLotEndTime;
      const updatedLotStatus = shouldExtend ? AuctionStatus.EXTENDED : lot.lotStatus;

      const updatedLot = await tx.auctionItem.update({
        where: { id: lot.id },
        data: {
          currentHighestBid: dto.bidAmount,
          currentHighestBidderId: bidderId,
          totalBidsCount: { increment: 1 },
          endTime: updatedLotEndTime,
          ...(shouldExtend ? { isExtended: true, lotStatus: AuctionStatus.EXTENDED } : {}),
        },
      });

      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: {
          totalBidsCount: { increment: 1 },
          ...(Number(dto.bidAmount) > Number(auction.currentHighestBid)
            ? { currentHighestBid: dto.bidAmount, currentHighestBidderId: bidderId }
            : {}),
          ...(updatedLotEndTime.getTime() > auction.endTime.getTime()
            ? { endTime: updatedLotEndTime, isExtended: true, status: AuctionStatus.EXTENDED }
            : shouldExtend
              ? { isExtended: true, status: AuctionStatus.EXTENDED }
              : {}),
        },
      });

      return {
        bid,
        updatedLot,
        updatedAuction,
        bidIncrement,
        shouldExtend,
        updatedLotEndTime,
        updatedLotStatus,
      };
    });

    this.auctionGateway.broadcastBidPlaced({
      auctionId,
      auctionItemId: result.updatedLot.id,
      lotNumber: result.updatedLot.lotNumber,
      bidId: result.bid.id,
      bidderId,
      bidderName: bidder.fullName,
      bidAmount: Number(result.bid.bidAmount),
      placedAt: result.bid.placedAt.toISOString(),
      newMinimumBid: Number(result.bid.bidAmount) + result.bidIncrement,
      totalBidsCount: result.updatedLot.totalBidsCount,
    });

    if (result.shouldExtend) {
      this.auctionGateway.broadcastTimeExtended({
        auctionId,
        auctionItemId: result.updatedLot.id,
        newEndTime: result.updatedLotEndTime.toISOString(),
        extendedBySeconds: ANTI_SNIPING_EXTENSION_MS / 1000,
        reason: 'ANTI_SNIPING',
      });
    }

    return {
      bidId: result.bid.id,
      auctionId,
      auctionItemId: result.updatedLot.id,
      bidAmount: Number(result.bid.bidAmount),
      nextMinimumBid: Number(result.bid.bidAmount) + result.bidIncrement,
      totalBidsCount: result.updatedLot.totalBidsCount,
      lotStatus: result.updatedLotStatus,
      endTime: result.updatedLotEndTime,
      extended: result.shouldExtend,
    };
  }

  /**
   * Admin manually concludes an individual lot for demo or operational completion.
   * Support Staff are explicitly restricted from terminating lots or rooms early.
   */
  async adminEndLot(auctionId: string, itemId: string, adminId: string) {
    const lot = await this.prisma.auctionItem.findFirst({
      where: { id: itemId, auctionId, status: AuctionItemStatus.APPROVED },
    });
    if (!lot) {
      throw new NotFoundException('Không tìm thấy lô hàng đã duyệt trong phòng đấu giá này.');
    }
    if (lot.lotStatus !== AuctionStatus.ACTIVE && lot.lotStatus !== AuctionStatus.EXTENDED) {
      throw new BadRequestException('Lô hàng này chưa bắt đầu hoặc đã kết thúc trước đó.');
    }

    return this.endLotInternal(itemId, adminId);
  }

  /**
   * Finalizes all due active/extended lots whose countdown reached zero, plus any legacy rooms.
   */
  async endDueLots(): Promise<void> {
    const now = new Date();
    const dueLots = await this.prisma.auctionItem.findMany({
      where: {
        status: AuctionItemStatus.APPROVED,
        lotStatus: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] },
        OR: [{ endTime: { lte: now } }, { endTime: null, auction: { endTime: { lte: now } } }],
      },
      take: 25,
      orderBy: { endTime: 'asc' },
      select: { id: true },
    });

    for (const lot of dueLots) {
      await this.endLotInternal(lot.id, null).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Retry lot end for ${lot.id}: ${message}`);
      });
    }

    const legacyDueRooms = await this.prisma.auction.findMany({
      where: {
        status: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] },
        endTime: { lte: now },
        items: { none: { status: AuctionItemStatus.APPROVED } },
      },
      take: 20,
      select: { id: true },
    });

    for (const room of legacyDueRooms) {
      await this.prisma.auction
        .updateMany({
          where: { id: room.id, status: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] } },
          data: { status: AuctionStatus.ENDED },
        })
        .catch(() => undefined);
    }
  }

  /**
   * Transitions a single lot from ACTIVE/EXTENDED to ENDED or FAILED, settles primary winner's
   * 70% refund / 30% escrow deposit via AuctionCheckoutService, and broadcasts WS events.
   */
  async endLotInternal(itemId: string, endedByAdminId: string | null) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auction_items WHERE id = ${itemId} FOR UPDATE`;
      const lot = await tx.auctionItem.findUnique({
        where: { id: itemId },
        include: {
          auction: true,
        },
      });
      if (!lot) {
        throw new NotFoundException('Không tìm thấy lô hàng đấu giá.');
      }

      if (lot.lotStatus !== AuctionStatus.ACTIVE && lot.lotStatus !== AuctionStatus.EXTENDED) {
        return {
          alreadyClosed: true,
          lot,
          awardId: null as string | null,
          winningBid: null,
          roomClosed: false,
        };
      }

      const now = new Date();
      const highestBid = await tx.bid.findFirst({
        where: { auctionId: lot.auctionId, auctionItemId: lot.id, status: 'ACCEPTED' },
        orderBy: [{ bidAmount: 'desc' }, { placedAt: 'asc' }],
      });

      const reservePrice =
        lot.reservePrice !== null
          ? Number(lot.reservePrice)
          : lot.proposedReservePrice !== null
            ? Number(lot.proposedReservePrice)
            : null;
      const reserveMet =
        Boolean(highestBid) &&
        (reservePrice === null || Number(highestBid!.bidAmount) >= reservePrice);

      let awardId: string | null = null;
      let targetLotStatus: AuctionStatus = AuctionStatus.FAILED;

      if (highestBid && reserveMet) {
        targetLotStatus = AuctionStatus.ENDED;
        const award = await this.checkout.createPrimaryAward(tx, {
          auctionId: lot.auctionId,
          auctionItemId: lot.id,
          bidId: highestBid.id,
          buyerId: highestBid.bidderId,
          sellerId: lot.sellerId,
          title: lot.title,
          lotNumber: lot.lotNumber,
          offerAmount: Number(highestBid.bidAmount),
          productId: lot.auction.productId,
        });
        awardId = award.id;

        await tx.notification.create({
          data: {
            userId: lot.sellerId,
            auctionId: lot.auctionId,
            targetUrl: `/seller/auctions/${lot.auctionId}`,
            title: `${lotDisplayTitle(lot.lotNumber, lot.title)} đã kết thúc`,
            content: `${lotDisplayTitle(lot.lotNumber, lot.title)} đã có người thắng với giá ${formatVnd(Number(highestBid.bidAmount))}. Người thắng có 24 giờ để hoàn tất thanh toán 70% còn lại và phí vận chuyển.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'LOT_ENDED_WITH_WINNER',
              auctionId: lot.auctionId,
              auctionItemId: lot.id,
              awardId: award.id,
              winningPrice: Number(highestBid.bidAmount),
            },
          },
        });
      } else {
        if (highestBid) {
          const amount = Number(highestBid.bidAmount);
          await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${highestBid.bidderId} FOR UPDATE`;
          const wallet = await tx.wallet.findUnique({ where: { userId: highestBid.bidderId } });
          if (wallet && Number(wallet.lockedBalance) >= amount) {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: { increment: amount },
                lockedBalance: { decrement: amount },
              },
            });
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: WalletTransactionType.AUCTION_BID_REFUND,
                amount,
                status: WalletTransactionStatus.SUCCESS,
                referenceId: lot.auctionId,
                description: `Hoàn 100% tiền giữ chỗ do ${lotDisplayTitle(lot.lotNumber, lot.title)} chưa đạt giá sàn.`,
              },
            });
          }
        }

        await tx.notification.create({
          data: {
            userId: lot.sellerId,
            auctionId: lot.auctionId,
            targetUrl: '/seller/auctions',
            title: `${lotDisplayTitle(lot.lotNumber, lot.title)} kết thúc không có người mua`,
            content: `${lotDisplayTitle(lot.lotNumber, lot.title)} đã kết thúc mà không có lượt đặt giá đạt giá sàn. Luồng đấu giá cho món hàng này đã đóng.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      const updatedLot = await tx.auctionItem.update({
        where: { id: lot.id },
        data: {
          lotStatus: targetLotStatus,
          endTime: now,
        },
      });

      await this.checkout.syncAuctionCompletionStatusTx(tx, lot.auctionId);
      const refreshedAuction = await tx.auction.findUnique({
        where: { id: lot.auctionId },
        select: { status: true },
      });

      return {
        alreadyClosed: false,
        lot: updatedLot,
        awardId,
        winningBid: highestBid && reserveMet ? highestBid : null,
        endedByAdminId,
        roomClosed:
          refreshedAuction?.status === AuctionStatus.ENDED ||
          refreshedAuction?.status === AuctionStatus.SETTLED ||
          refreshedAuction?.status === AuctionStatus.FAILED,
      };
    });

    if (!outcome.alreadyClosed) {
      const lotPayload: WsLotEndedPayload = {
        auctionId: outcome.lot.auctionId,
        auctionItemId: outcome.lot.id,
        lotNumber: outcome.lot.lotNumber,
        status: outcome.lot.lotStatus as unknown as NexusAuctionStatus,
        winningBidderId: outcome.winningBid?.bidderId ?? null,
        winningPrice: outcome.winningBid ? Number(outcome.winningBid.bidAmount) : 0,
      };
      this.auctionGateway.broadcastLotEnded(lotPayload);

      if (outcome.roomClosed) {
        this.auctionGateway.broadcastAuctionEnded({
          auctionId: outcome.lot.auctionId,
          winningBidderId: outcome.winningBid?.bidderId ?? null,
          winningPrice: outcome.winningBid ? Number(outcome.winningBid.bidAmount) : 0,
        });
      }
    }

    return {
      auctionId: outcome.lot.auctionId,
      auctionItemId: outcome.lot.id,
      lotNumber: outcome.lot.lotNumber,
      lotStatus: outcome.lot.lotStatus,
      awardId: outcome.awardId,
      winningBidderId: outcome.winningBid?.bidderId ?? null,
      winningPrice: outcome.winningBid ? Number(outcome.winningBid.bidAmount) : 0,
      endedByAdminId: outcome.endedByAdminId,
    };
  }

  /**
   * Lists the bidder's recent bids across multi-lot rooms along with active post-auction offers.
   */
  async getMyBids(bidderId: string) {
    const bids = await this.prisma.bid.findMany({
      where: { bidderId },
      orderBy: { placedAt: 'desc' },
      take: 100,
      include: {
        auction: {
          select: { id: true, title: true, status: true, startTime: true, endTime: true },
        },
        auctionItem: {
          select: {
            id: true,
            title: true,
            images: true,
            lotNumber: true,
            lotStatus: true,
            currentHighestBid: true,
            currentHighestBidderId: true,
            endTime: true,
          },
        },
        award: {
          select: {
            id: true,
            tier: true,
            status: true,
            offerAmount: true,
            depositAmount: true,
            expiresAt: true,
            orderId: true,
          },
        },
      },
    });

    return bids.map((bid) => ({
      ...bid,
      bidAmount: Number(bid.bidAmount),
      auctionItem: bid.auctionItem
        ? {
            ...bid.auctionItem,
            currentHighestBid: Number(bid.auctionItem.currentHighestBid),
          }
        : null,
      award:
        bid.award && BUYER_VISIBLE_AWARD_STATUSES.includes(bid.award.status)
          ? {
              ...bid.award,
              offerAmount: Number(bid.award.offerAmount),
              depositAmount: Number(bid.award.depositAmount),
            }
          : null,
    }));
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

  private computeIntroState(
    status: AuctionStatus,
    startTime: Date,
    lotCount: number,
  ): { introDurationMs: number; isIntroActive: boolean; elapsedMs: number } {
    const introDurationMs = AuctionService.getIntroDurationMs(lotCount);
    const isLive = status === AuctionStatus.ACTIVE || status === AuctionStatus.EXTENDED;
    if (!isLive) {
      return { introDurationMs, isIntroActive: false, elapsedMs: 0 };
    }
    const rawElapsed = Date.now() - startTime.getTime();
    const elapsedMs = Math.max(0, Math.min(introDurationMs, rawElapsed));
    return {
      introDurationMs,
      isIntroActive: rawElapsed < introDurationMs,
      elapsedMs,
    };
  }

  private async dispatchAuctionStartNotifications(
    auction: {
      id: string;
      title: string;
      startTime: Date;
      endTime: Date;
      minBuyerReputation: number;
    },
    consignedSellerIds: string[],
  ): Promise<void> {
    const buyerUsers = await this.prisma.user.findMany({
      where: {
        role: Role.BUYER,
        isShopSuspended: false,
        reputationScore: { gte: auction.minBuyerReputation },
      },
      select: { id: true },
    });

    const uniqueBuyerIds = buyerUsers.map((u) => u.id);
    const uniqueSellerIds = [...new Set(consignedSellerIds)];

    const notifications: Prisma.NotificationCreateManyInput[] = [];

    for (const userId of uniqueBuyerIds) {
      notifications.push({
        userId,
        auctionId: auction.id,
        targetUrl: auctionTargetUrl(auction.id),
        title: `Phiên đấu giá "${auction.title}" đã bắt đầu!`,
        content: `Phiên đấu giá đã chính thức mở cửa xem trực tiếp 3D và đặt giá ngay bây giờ.`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'AUCTION_STARTED_BUYER',
          auctionId: auction.id,
          startedAt: auction.startTime.toISOString(),
          endTime: auction.endTime.toISOString(),
        },
      });
    }

    for (const sellerId of uniqueSellerIds) {
      notifications.push({
        userId: sellerId,
        auctionId: auction.id,
        targetUrl: `/seller/auctions/${auction.id}`,
        title: `Phiên "${auction.title}" có vật phẩm của bạn đã bắt đầu!`,
        content: `Phiên đấu giá chứa lô hàng ký gửi của bạn đã chính thức lên sóng. Bạn có thể theo dõi diễn biến trong phòng đấu giá.`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'AUCTION_STARTED_SELLER',
          auctionId: auction.id,
        },
      });
    }

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }
  }
}
