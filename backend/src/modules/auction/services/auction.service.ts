import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@nexus/types';
import {
  AuctionStatus,
  BidStatus,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionGateway } from '../gateways/auction.gateway';
import { AuctionQueryDto } from '../dtos/auction-query.dto';
import { CreateAuctionDto } from '../dtos/create-auction.dto';
import { PlaceBidDto } from '../dtos/place-bid.dto';

/**
 * Service orchestrating auction listing, bidding lifecycle, anti-sniping rules and escrow locks.
 */
@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionGateway: AuctionGateway,
  ) {}

  /**
   * Retrieves paginated auction listings with optional status and search filters.
   *
   * @param query Listing query criteria including status and pagination
   * @returns Paginated auction summary records
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
        { product: { title: { contains: query.search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auction.count({ where }),
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { endTime: 'asc' }],
        include: {
          product: {
            select: {
              id: true,
              title: true,
              threeModelKey: true,
              images: true,
              basePrice: true,
            },
          },
          seller: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
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
   * Retrieves comprehensive auction detail by identifier with real-time bid history.
   *
   * @param id Target auction unique identifier
   * @returns Detailed auction entity including bids and product specification
   */
  async getAuctionDetail(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
            images: true,
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
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

    return {
      ...auction,
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

  /**
   * Creates and schedules a new auction room linked to a seller product.
   *
   * @param sellerId Identifier of the seller initiating the auction
   * @param dto Auction creation parameters
   * @returns Newly scheduled auction record
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

    const existingActive = await this.prisma.auction.findFirst({
      where: {
        productId: dto.productId,
        status: { in: [AuctionStatus.SCHEDULED, AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        'Sản phẩm này hiện đang có phiên đấu giá đang hoặc sắp diễn ra.',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();

    if (endTime <= startTime) {
      throw new BadRequestException('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
    }

    const status = startTime <= now ? AuctionStatus.ACTIVE : AuctionStatus.SCHEDULED;

    return this.prisma.auction.create({
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
  }

  /**
   * Submits a competitive bid with wallet balance locking and automated anti-sniping protection.
   *
   * @param auctionId Target auction identifier
   * @param bidderId Authenticated buyer identifier submitting the bid
   * @param dto Bid specification parameters
   * @returns Bid placement receipt and auction status
   */
  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const bidAmount = dto.bidAmount;

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
   * Retrieves auctions owned by a specific seller.
   *
   * @param sellerId Owner seller identifier
   * @param query Listing filters
   * @returns Seller specific auction listings
   */
  async getMyAuctions(sellerId: string, query: AuctionQueryDto) {
    return this.getAuctions({ ...query, sellerId });
  }

  /**
   * Retrieves bid history submitted by an individual buyer.
   *
   * @param bidderId Authenticated buyer identifier
   * @returns List of submitted bids with associated auction info
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
   * Concludes an auction room and marks the winning bid or failure state.
   *
   * @param auctionId Identifier of auction to finalize
   * @param callerId Optional user identifier requesting the finalization
   * @param callerRole Optional user role requesting the finalization
   * @returns Final auction entity state
   */
  async endAuction(auctionId: string, callerId?: string, callerRole?: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          where: { status: BidStatus.ACCEPTED },
          orderBy: { bidAmount: 'desc' },
          take: 1,
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Không tìm thấy phiên đấu giá.');
    }

    if (
      auction.status === AuctionStatus.ENDED ||
      auction.status === AuctionStatus.FAILED ||
      auction.status === AuctionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Phiên đấu giá đã kết thúc trước đó ở trạng thái ${auction.status}.`,
      );
    }

    if (callerId && callerRole) {
      const isPrivileged = callerRole === Role.ADMIN || callerRole === Role.SUPPORT_STAFF;
      if (!isPrivileged && auction.sellerId !== callerId) {
        throw new ForbiddenException(
          'Bạn không có quyền kết thúc phiên đấu giá của người bán khác.',
        );
      }
      const now = new Date();
      if (!isPrivileged && now < auction.endTime) {
        throw new BadRequestException('Phiên đấu giá chưa kết thúc thời gian thi đấu.');
      }
    }

    const winningBid = auction.bids[0];
    const hasMetReserve =
      !auction.reservePrice ||
      (winningBid && Number(winningBid.bidAmount) >= Number(auction.reservePrice));

    if (winningBid && hasMetReserve) {
      await this.prisma.$transaction(async (tx) => {
        await tx.bid.update({
          where: { id: winningBid.id },
          data: { status: BidStatus.WINNING },
        });

        await tx.auction.update({
          where: { id: auction.id },
          data: { status: AuctionStatus.ENDED },
        });
      });

      this.auctionGateway.broadcastAuctionEnded({
        auctionId: auction.id,
        winningBidderId: winningBid.bidderId,
        winningPrice: Number(winningBid.bidAmount),
      });

      return {
        id: auction.id,
        status: AuctionStatus.ENDED,
        winningBidderId: winningBid.bidderId,
        winningPrice: Number(winningBid.bidAmount),
      };
    }

    await this.prisma.$transaction(async (tx) => {
      if (winningBid) {
        const bidderWallet = await tx.wallet.findUnique({
          where: { userId: winningBid.bidderId },
        });

        if (bidderWallet) {
          const refundAmount = Number(winningBid.bidAmount);
          await tx.wallet.update({
            where: { id: bidderWallet.id },
            data: {
              lockedBalance: { decrement: refundAmount },
              balance: { increment: refundAmount },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: bidderWallet.id,
              amount: refundAmount,
              type: WalletTransactionType.AUCTION_BID_REFUND,
              status: WalletTransactionStatus.SUCCESS,
              referenceId: auction.id,
              description: `Hoàn cọc do phiên đấu giá #${auction.id.slice(0, 8)} không đạt mức giá bảo lưu`,
            },
          });
        }

        await tx.bid.update({
          where: { id: winningBid.id },
          data: { status: BidStatus.REJECTED },
        });
      }

      await tx.auction.update({
        where: { id: auction.id },
        data: { status: AuctionStatus.FAILED },
      });
    });

    this.auctionGateway.broadcastAuctionEnded({
      auctionId: auction.id,
      winningBidderId: null,
      winningPrice: 0,
    });

    return {
      id: auction.id,
      status: AuctionStatus.FAILED,
      winningBidderId: null,
      winningPrice: 0,
    };
  }

  /**
   * Anonymizes user full name for privacy compliance in public auction transcripts.
   *
   * @param name Real full name
   * @returns Anonymized string representation
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
