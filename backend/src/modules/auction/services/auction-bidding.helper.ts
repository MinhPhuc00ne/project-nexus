import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
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
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import type { AuctionStatus as NexusAuctionStatus, WsLotEndedPayload } from '@nexus/contracts';
import { DomainEventsService } from '../../../core/events/domain-events.service';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionCheckoutService } from './auction-checkout.service';
import { PlaceBidInput } from '../dtos/place-bid.dto';
import { AuctionGateway } from '../gateways/auction.gateway';
import {
  ANTI_SNIPING_EXTENSION_MS,
  ANTI_SNIPING_WINDOW_MS,
  BUYER_VISIBLE_AWARD_STATUSES,
  computeIntroState,
  formatVnd,
  lotDisplayTitle,
} from './auction-domain.utils';

@Injectable()
export class AuctionBiddingHelper {
  private readonly logger = new Logger(AuctionBiddingHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionGateway: AuctionGateway,
    private readonly checkout: AuctionCheckoutService,
    @Optional() private readonly domainEvents?: DomainEventsService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

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

    const introState = computeIntroState(auction.status, auction.startTime, auction.items.length);
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
  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidInput) {
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
        throw new NotFoundException({
          message: 'Không tìm thấy phòng đấu giá.',
          errorCode: AppErrorCode.AUCTION_NOT_FOUND,
        });
      }
      if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.EXTENDED) {
        throw new BadRequestException({
          message: 'Phòng đấu giá hiện không trong trạng thái mở đặt giá.',
          errorCode: AppErrorCode.AUCTION_NOT_LIVE,
        });
      }

      const introState = computeIntroState(auction.status, auction.startTime, auction.items.length);
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
        throw new ForbiddenException({
          message: 'Người bán không thể tự đặt giá cho vật phẩm của chính mình.',
          errorCode: AppErrorCode.AUCTION_BID_SELF_FORBIDDEN,
        });
      }
      if (lot.lotStatus !== AuctionStatus.ACTIVE && lot.lotStatus !== AuctionStatus.EXTENDED) {
        throw new BadRequestException({
          message: 'Lô hàng này đã kết thúc nhận lượt đặt giá.',
          errorCode: AppErrorCode.AUCTION_NOT_LIVE,
        });
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
        throw new BadRequestException({
          message:
            lot.totalBidsCount === 0 && reservePrice && reservePrice > startingPrice
              ? `Mức giá đặt đầu tiên phải đạt tối thiểu giá sàn (${formatVnd(requiredMinimum)}).`
              : `Giá đặt tối thiểu cho lượt tiếp theo là ${formatVnd(requiredMinimum)}.`,
          errorCode: AppErrorCode.AUCTION_BID_TOO_LOW,
        });
      }

      const walletOwners = [
        ...new Set([bidderId, previousBidderId].filter(Boolean) as string[]),
      ].sort();
      for (const ownerId of walletOwners) {
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${ownerId} FOR UPDATE`;
      }

      const bidderWallet = await tx.wallet.findUnique({ where: { userId: bidderId } });
      if (!bidderWallet || Number(bidderWallet.balance) < dto.bidAmount) {
        throw new BadRequestException({
          message: `Số dư ví khả dụng không đủ để giữ chỗ 100% mức giá đặt (${formatVnd(dto.bidAmount)}).`,
          errorCode: AppErrorCode.AUCTION_DEPOSIT_REQUIRED,
        });
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

        await publishNotification(
          tx,
          {
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
          this.notifications,
        );
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

    this.domainEvents?.publishAuctionStateChanged({
      auctionId,
      reason: result.shouldExtend ? 'EXTENDED' : 'BID_PLACED',
    });

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
   * Admin or Support Staff manually concludes an individual lot for demo or operational completion.
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
      const updated = await this.prisma.auction
        .updateMany({
          where: { id: room.id, status: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] } },
          data: { status: AuctionStatus.ENDED },
        })
        .catch(() => ({ count: 0 }));
      if (updated.count > 0) {
        this.domainEvents?.publishAuctionStateChanged({
          auctionId: room.id,
          reason: 'ROOM_ENDED',
        });
      }
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
        const existingAward = await tx.auctionAward.findFirst({
          where: { auctionItemId: lot.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        return {
          alreadyClosed: true,
          lot,
          awardId: existingAward?.id ?? null,
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

        await publishNotification(
          tx,
          {
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
          this.notifications,
        );
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

        await publishNotification(
          tx,
          {
            userId: lot.sellerId,
            auctionId: lot.auctionId,
            targetUrl: '/seller/auctions',
            title: `${lotDisplayTitle(lot.lotNumber, lot.title)} kết thúc không có người mua`,
            content: `${lotDisplayTitle(lot.lotNumber, lot.title)} đã kết thúc mà không có lượt đặt giá đạt giá sàn. Luồng đấu giá cho món hàng này đã đóng.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
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

      this.domainEvents?.publishAuctionStateChanged({
        auctionId: outcome.lot.auctionId,
        reason: outcome.roomClosed ? 'ROOM_ENDED' : 'LOT_ENDED',
      });
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
}
