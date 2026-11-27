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
import {
  AuctionAward,
  AuctionAwardStatus,
  AuctionAwardTier,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PenaltyType,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { DomainEventsService } from '../../../core/events/domain-events.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { PlatformSettingsService } from '../../../core/settings/platform-settings.service';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AUCTION_CHECKOUT_DURATION_MS,
  AUCTION_DEFAULT_REPUTATION_PENALTY,
  DEPOSIT_RATIO,
  createPendingAuctionOrder,
  formatVnd,
  lotLabel,
  notifyDeclinedOfferTx,
  notifyUsersTx,
  roundCurrency,
  syncAuctionCompletionStatusTx,
} from './auction-checkout.utils';

@Injectable()
export class AuctionSecondChanceHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
    private readonly adminSettings: PlatformSettingsService,
    private readonly treasury: TreasuryService,
    _auctionStock?: AuctionStockService,
    @Optional() private readonly domainEvents?: DomainEventsService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  async respondSecondChance(awardId: string, buyerId: string, accept: boolean) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auction_awards WHERE id = ${awardId} FOR UPDATE`;
      const award = await tx.auctionAward.findUnique({
        where: { id: awardId },
        include: {
          auction: true,
          auctionItem: true,
          bid: true,
        },
      });
      if (!award) {
        throw new NotFoundException('Không tìm thấy lời mời mua hàng đấu giá.');
      }
      if (award.buyerId !== buyerId) {
        throw new ForbiddenException('Bạn không có quyền phản hồi lời mời mua hàng này.');
      }
      if (award.tier !== AuctionAwardTier.SECOND_CHANCE) {
        throw new BadRequestException('Thao tác này chỉ áp dụng cho người mua dự bị.');
      }
      if (award.status !== AuctionAwardStatus.AWAITING_ACCEPTANCE) {
        throw new ConflictException(
          'Lời mời mua hàng này đã được phản hồi hoặc không còn hiệu lực.',
        );
      }

      const itemTitle = award.auctionItem?.title ?? award.auction.title;
      const itemLabel = lotLabel(award.auctionItem?.lotNumber, itemTitle);
      const sellerId = award.auctionItem?.sellerId ?? award.auction.sellerId;
      const now = new Date();

      if (!accept) {
        const declined = await tx.auctionAward.update({
          where: { id: award.id },
          data: {
            status: AuctionAwardStatus.DECLINED,
            completedAt: now,
            resolutionNote: 'Người mua tiếp theo đã từ chối nhận quyền mua.',
          },
        });
        if (award.auctionItemId) {
          await tx.auctionItem.update({
            where: { id: award.auctionItemId },
            data: { lotStatus: AuctionStatus.FAILED },
          });
        }
        await syncAuctionCompletionStatusTx(tx, award.auctionId);

        await notifyDeclinedOfferTx(tx, {
          auctionId: award.auctionId,
          auctionItemId: award.auctionItemId,
          buyerId,
          sellerId,
          adminId: award.auction.createdByAdminId,
          itemLabel,
        });

        return declined;
      }

      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${buyerId} FOR UPDATE`;
      const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      const requiredDeposit = Number(award.depositAmount);
      const currentBalance = Number(wallet?.balance ?? 0);

      if (wallet && currentBalance >= requiredDeposit) {
        return this.activateSecondChanceCheckoutTx(tx, award, wallet.id, currentBalance);
      }

      const updated = await tx.auctionAward.update({
        where: { id: award.id },
        data: {
          status: AuctionAwardStatus.AWAITING_DEPOSIT,
          confirmedAt: now,
          expiresAt: new Date(now.getTime() + AUCTION_CHECKOUT_DURATION_MS),
        },
      });
      const missingAmount = roundCurrency(Math.max(0, requiredDeposit - currentBalance));

      await publishNotification(
        tx,
        {
          userId: buyerId,
          auctionId: award.auctionId,
          targetUrl: '/wallet',
          title: `Cần nạp đủ 30% tiền cọc để mua ${itemLabel}`,
          content: `Bạn đã xác nhận muốn mua ${itemLabel}. Vui lòng nạp đủ 30% tiền cọc tương đương ${formatVnd(requiredDeposit)} (còn thiếu ${formatVnd(missingAmount)}). Ngay khi nạp đủ, hệ thống sẽ tự động trừ cọc và mở thanh toán 24 giờ.`,
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.IN_APP,
          metadata: {
            actionType: 'SECOND_CHANCE_TOPUP_REQUIRED',
            awardId: award.id,
            auctionId: award.auctionId,
            auctionItemId: award.auctionItemId,
            sellerId,
            requiredDepositAmount: requiredDeposit,
            currentBalance,
            missingAmount,
            topUpUrl: '/wallet',
            canChatWithShop: true,
          },
        },
        this.notifications,
      );

      await notifyUsersTx(tx, [sellerId, award.auction.createdByAdminId], {
        auctionId: award.auctionId,
        targetUrl: `/auction/${award.auctionId}`,
        title: `Người mua kế tiếp đã đồng ý mua ${itemLabel} (chờ nạp cọc)`,
        content: `Người mua dự bị đã xác nhận muốn mua ${itemLabel} với mức giá ${formatVnd(Number(award.offerAmount))} và đang tiến hành nạp đủ 30% tiền cọc (${formatVnd(requiredDeposit)}).`,
        metadata: {
          actionType: 'SECOND_CHANCE_AWAITING_DEPOSIT',
          awardId: award.id,
          auctionId: award.auctionId,
          auctionItemId: award.auctionItemId,
        },
      });

      return updated;
    });

    if (outcome.status === AuctionAwardStatus.DECLINED) {
      this.domainEvents?.publishAuctionStateChanged({
        auctionId: outcome.auctionId,
        reason: 'AWARD_SETTLED',
      });
    }

    return outcome;
  }

  /**
   * Automatically checks whether a user's wallet deposit covers any pending SECOND_CHANCE awards
   * in AWAITING_DEPOSIT status and immediately locks the 30% deposit + opens 24h checkout.
   */
  async processPendingDepositsForUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    const pendingAwards = await tx.auctionAward.findMany({
      where: {
        buyerId: userId,
        tier: AuctionAwardTier.SECOND_CHANCE,
        status: AuctionAwardStatus.AWAITING_DEPOSIT,
      },
      orderBy: { confirmedAt: 'asc' },
      include: {
        auction: true,
        auctionItem: true,
        bid: true,
      },
    });

    if (!pendingAwards.length) return;

    for (const award of pendingAwards) {
      await tx.$queryRaw`SELECT id FROM auction_awards WHERE id = ${award.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) return;

      const requiredDeposit = Number(award.depositAmount);
      const balance = Number(wallet.balance);
      if (balance < requiredDeposit) {
        continue;
      }

      await this.activateSecondChanceCheckoutTx(tx, award, wallet.id, balance, true);
    }
  }

  /**
   * Confirms a payment default after the 24-hour checkout deadline has been missed or reported:
   * deducts -10 reputation, forfeits the 30% deposit (platform fee to Admin, 93% to Seller),
   * revokes the buyer's order/access, and invites the second-highest distinct bidder if primary.
   */
  async markPaymentDefault(awardId: string, adminId?: string, note?: string) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auction_awards WHERE id = ${awardId} FOR UPDATE`;
      const current = await tx.auctionAward.findUnique({
        where: { id: awardId },
        include: {
          auction: true,
          auctionItem: true,
          bid: true,
          order: true,
        },
      });
      if (!current) {
        throw new NotFoundException('Không tìm thấy thông tin quyền mua đấu giá.');
      }

      if (current.status === AuctionAwardStatus.PAYMENT_DEFAULT) {
        const secondChance =
          current.tier === AuctionAwardTier.PRIMARY_WINNER && current.auctionItemId
            ? await tx.auctionAward.findFirst({
                where: {
                  auctionItemId: current.auctionItemId,
                  tier: AuctionAwardTier.SECOND_CHANCE,
                },
                select: { id: true },
              })
            : null;
        return {
          defaultedAwardId: current.id,
          secondChanceAwardId: secondChance?.id ?? null,
          lotStatus: current.auctionItem?.lotStatus ?? AuctionStatus.ENDED,
          auctionId: current.auctionId,
        };
      }

      if (current.status !== AuctionAwardStatus.AWAITING_CHECKOUT) {
        if (
          current.tier === AuctionAwardTier.SECOND_CHANCE &&
          (current.status === AuctionAwardStatus.AWAITING_ACCEPTANCE ||
            current.status === AuctionAwardStatus.AWAITING_DEPOSIT)
        ) {
          throw new BadRequestException(
            'Người mua thứ hai chưa khóa tiền cọc 30%. Vui lòng sử dụng thao tác "Khách không mua nữa".',
          );
        }
        throw new ConflictException('Quyền mua đấu giá này không ở trạng thái chờ thanh toán.');
      }

      const buyerId = current.buyerId ?? current.order?.buyerId ?? current.bid.bidderId;
      const sellerId = current.auctionItem?.sellerId ?? current.auction.sellerId;
      if (!sellerId) {
        throw new ConflictException('Không xác định được người bán của lô đấu giá.');
      }

      const platformRevenueWallet = await this.treasury.getOrCreatePlatformRevenueWallet(tx);
      const walletOwnerIds = [...new Set([buyerId, sellerId])].sort();
      for (const ownerId of walletOwnerIds) {
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${ownerId} FOR UPDATE`;
      }
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${platformRevenueWallet.id} FOR UPDATE`;

      const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      const sellerWallet = await tx.wallet.findUnique({ where: { userId: sellerId } });
      const latestAdminWallet = await tx.wallet.findUnique({
        where: { id: platformRevenueWallet.id },
      });
      const depositAmount = Number(current.depositAmount);

      if (!buyerWallet || Number(buyerWallet.lockedBalance) < depositAmount) {
        throw new ConflictException(
          'Khoản cọc 30% trong ví tạm giữ của người mua không đủ để tịch thu.',
        );
      }
      if (!sellerWallet || !latestAdminWallet) {
        throw new NotFoundException('Không tìm thấy ví người bán hoặc ví sàn để phân bổ tiền cọc.');
      }

      const settings = await this.adminSettings.getAll();
      const platformFeePct = settings.platformFeePercentage ?? 7;
      const platformFee = roundCurrency((depositAmount * platformFeePct) / 100);
      const sellerCompensation = roundCurrency(depositAmount - platformFee);

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { lockedBalance: { decrement: depositAmount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: buyerWallet.id,
          type: WalletTransactionType.AUCTION_DEPOSIT_FORFEIT,
          amount: -depositAmount,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: current.id,
          description: `Tịch thu 30% tiền cọc (${formatVnd(depositAmount)}) do quá hạn thanh toán 24 giờ.`,
        },
      });

      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balance: { increment: sellerCompensation } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: sellerWallet.id,
          type: WalletTransactionType.AUCTION_DEPOSIT_COMPENSATION,
          amount: sellerCompensation,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: current.id,
          description: `Bồi thường 30% cọc từ người thắng bỏ cọc (${formatVnd(depositAmount)} trừ ${platformFeePct}% phí sàn = ${formatVnd(sellerCompensation)}).`,
        },
      });

      if (platformFee > 0) {
        await tx.wallet.update({
          where: { id: latestAdminWallet.id },
          data: { balance: { increment: platformFee } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: latestAdminWallet.id,
            type: WalletTransactionType.PLATFORM_FEE,
            amount: platformFee,
            status: WalletTransactionStatus.SUCCESS,
            referenceId: current.id,
            description: `Phí sàn ${platformFeePct}% trên khoản cọc 30% bị tịch thu (${formatVnd(depositAmount)}).`,
          },
        });
      }

      await this.reputation.adjustScore(
        {
          userId: buyerId,
          deltaPoints: AUCTION_DEFAULT_REPUTATION_PENALTY,
          penaltyType: PenaltyType.AUCTION_DEFAULT,
          referenceId: current.auctionId,
          reason:
            note ??
            'Không hoàn thành thanh toán phần còn lại trong thời hạn 24 giờ sau khi thắng đấu giá.',
          skipNotification: false,
        },
        tx,
      );

      await tx.auctionAward.update({
        where: { id: current.id },
        data: {
          status: AuctionAwardStatus.PAYMENT_DEFAULT,
          completedAt: new Date(),
          resolutionNote:
            note ??
            `Admin (${adminId ?? 'SYSTEM'}) xác nhận quá hạn thanh toán 24 giờ; tịch thu 30% cọc.`,
        },
      });

      if (current.orderId) {
        await tx.order.update({
          where: { id: current.orderId },
          data: { status: OrderStatus.CANCELLED },
        });
      }

      const itemTitle = current.auctionItem?.title ?? current.auction.title;
      const itemLabel = lotLabel(current.auctionItem?.lotNumber, itemTitle);

      await publishNotification(
        tx,
        {
          userId: buyerId,
          auctionId: current.auctionId,
          targetUrl: `/auction/${current.auctionId}`,
          title: `Bạn đã bị trễ hạn thanh toán ${itemLabel}`,
          content: `Đơn hàng đấu giá cho ${itemLabel} đã bị hủy do quá hạn thanh toán 24 giờ. Hệ thống đã trừ 10 điểm uy tín và tịch thu 30% tiền cọc (${formatVnd(depositAmount)}). Nếu có sai sót, bạn có thể gửi khiếu nại lên Admin.`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
          metadata: {
            actionType: 'AUCTION_PAYMENT_DEFAULTED',
            awardId: current.id,
            auctionId: current.auctionId,
            auctionItemId: current.auctionItemId,
            sellerId,
            forfeitedDeposit: depositAmount,
            reputationDelta: AUCTION_DEFAULT_REPUTATION_PENALTY,
            canFileComplaint: true,
          },
        },
        this.notifications,
      );

      await publishNotification(
        tx,
        {
          userId: sellerId,
          auctionId: current.auctionId,
          targetUrl: `/auction/${current.auctionId}`,
          title: `Nhận bồi thường tiền cọc từ ${itemLabel}`,
          content: `Người mua đã trễ hạn thanh toán ${itemLabel}. Tiền bồi thường sau trừ ${platformFeePct}% phí sàn là ${formatVnd(sellerCompensation)} đã được cộng vào ví của bạn.`,
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.IN_APP,
          metadata: {
            actionType: 'AUCTION_COMPENSATION_CREDITED',
            awardId: current.id,
            auctionId: current.auctionId,
            auctionItemId: current.auctionItemId,
            grossDeposit: depositAmount,
            platformFee,
            sellerCompensation,
          },
        },
        this.notifications,
      );

      if (current.tier === AuctionAwardTier.PRIMARY_WINNER) {
        const secondChance = await this.inviteSecondChanceBuyerTx(tx, {
          auctionId: current.auctionId,
          auctionItemId: current.auctionItemId,
          excludedBuyerId: buyerId,
          reservePrice: current.auctionItem?.reservePrice
            ? Number(current.auctionItem.reservePrice)
            : null,
          sellerId,
          adminId: current.auction.createdByAdminId,
          itemLabel,
        });

        if (secondChance) {
          return {
            defaultedAwardId: current.id,
            secondChanceAwardId: secondChance.id,
            lotStatus: current.auctionItem?.lotStatus ?? AuctionStatus.ENDED,
            auctionId: current.auctionId,
          };
        }
      }

      if (current.auctionItemId) {
        await tx.auctionItem.update({
          where: { id: current.auctionItemId },
          data: { lotStatus: AuctionStatus.FAILED },
        });
      }
      await syncAuctionCompletionStatusTx(tx, current.auctionId);

      await publishNotification(
        tx,
        {
          userId: sellerId,
          auctionId: current.auctionId,
          targetUrl: `/seller/auctions`,
          title: `Kết thúc luồng đấu giá cho ${itemLabel}`,
          content: `${itemLabel} không còn người mua đủ điều kiện tiếp nhận. Phiên đấu giá cho món hàng này đã đóng; bạn có thể đăng bán lại sản phẩm ở luồng cửa hàng nếu muốn.`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
        },
        this.notifications,
      );

      return {
        defaultedAwardId: current.id,
        secondChanceAwardId: null,
        lotStatus: AuctionStatus.FAILED,
        auctionId: current.auctionId,
      };
    });

    if (outcome.secondChanceAwardId === null) {
      this.domainEvents?.publishAuctionStateChanged({
        auctionId: outcome.auctionId,
        reason: 'AWARD_SETTLED',
      });
    }

    return {
      defaultedAwardId: outcome.defaultedAwardId,
      secondChanceAwardId: outcome.secondChanceAwardId,
      lotStatus: outcome.lotStatus,
    };
  }

  /**
   * Executes Admin's "Khách không mua nữa" action on a SECOND_CHANCE buyer:
   * - If the buyer already locked a 30% deposit (AWAITING_CHECKOUT), refunds the 30% deposit cleanly
   *   and cancels the pending order without any reputation penalty.
   * - If unresponsive before deposit lock (AWAITING_ACCEPTANCE / AWAITING_DEPOSIT), terminates the offer cleanly.
   */
  async withdrawSecondChanceByAdmin(awardId: string, adminId: string, note?: string) {
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auction_awards WHERE id = ${awardId} FOR UPDATE`;
      const award = await tx.auctionAward.findUnique({
        where: { id: awardId },
        include: { auction: true, auctionItem: true, bid: true },
      });
      if (!award) {
        throw new NotFoundException('Không tìm thấy quyền mua dự bị.');
      }
      if (award.tier !== AuctionAwardTier.SECOND_CHANCE) {
        throw new BadRequestException(
          'Nút "Khách không mua nữa" chỉ áp dụng cho người mua ở lượt kế tiếp.',
        );
      }
      if (
        award.status !== AuctionAwardStatus.AWAITING_ACCEPTANCE &&
        award.status !== AuctionAwardStatus.AWAITING_DEPOSIT &&
        award.status !== AuctionAwardStatus.AWAITING_CHECKOUT
      ) {
        throw new ConflictException('Quyền mua này đã được đóng trước đó.');
      }

      const buyerId = award.buyerId ?? award.bid.bidderId;
      const sellerId = award.auctionItem?.sellerId ?? award.auction.sellerId;
      const itemTitle = award.auctionItem?.title ?? award.auction.title;
      const itemLabel = lotLabel(award.auctionItem?.lotNumber, itemTitle);
      const depositAmount = Number(award.depositAmount);
      let refundedDeposit = 0;

      if (award.status === AuctionAwardStatus.AWAITING_CHECKOUT && depositAmount > 0) {
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${buyerId} FOR UPDATE`;
        const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
        if (wallet && Number(wallet.lockedBalance) >= depositAmount) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: depositAmount },
              lockedBalance: { decrement: depositAmount },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTransactionType.AUCTION_BID_REFUND,
              amount: depositAmount,
              status: WalletTransactionStatus.SUCCESS,
              referenceId: award.id,
              description: `Hoàn trả 30% tiền cọc (${formatVnd(depositAmount)}) khi Admin chấp thuận rút quyền mua ${itemLabel}.`,
            },
          });
          refundedDeposit = depositAmount;
        }
        if (award.orderId) {
          await tx.order.update({
            where: { id: award.orderId },
            data: { status: OrderStatus.CANCELLED },
          });
        }
      }

      const updated = await tx.auctionAward.update({
        where: { id: award.id },
        data: {
          status: AuctionAwardStatus.BUYER_WITHDRAWN,
          completedAt: new Date(),
          resolutionNote:
            note ?? `Admin (${adminId}) đã xác nhận khách hàng thứ hai không mua nữa.`,
        },
      });

      if (award.auctionItemId) {
        await tx.auctionItem.update({
          where: { id: award.auctionItemId },
          data: { lotStatus: AuctionStatus.FAILED },
        });
      }
      await syncAuctionCompletionStatusTx(tx, award.auctionId);

      await publishNotification(
        tx,
        {
          userId: buyerId,
          auctionId: award.auctionId,
          targetUrl: `/auction/${award.auctionId}`,
          title: `Đã đóng giao dịch ${itemLabel}`,
          content:
            refundedDeposit > 0
              ? `Admin đã xác nhận yêu cầu không tiếp tục mua ${itemLabel}. Khoản cọc 30% (${formatVnd(refundedDeposit)}) đã được hoàn lại vào ví của bạn (không trừ điểm uy tín).`
              : `Quyền mua ${itemLabel} đã được đóng theo xác nhận của Admin (không trừ điểm uy tín).`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
          metadata: {
            actionType: 'SECOND_CHANCE_WITHDRAWN',
            awardId: award.id,
            auctionId: award.auctionId,
            auctionItemId: award.auctionItemId,
            refundedDeposit,
          },
        },
        this.notifications,
      );

      if (sellerId) {
        await publishNotification(
          tx,
          {
            userId: sellerId,
            auctionId: award.auctionId,
            targetUrl: `/seller/auctions`,
            title: `Khách hàng không tiếp tục mua ${itemLabel}`,
            content: `Admin đã xác nhận kết thúc quyền mua của người mua tiếp theo cho ${itemLabel}. Bạn có thể quản lý hoặc đăng bán món hàng trong luồng sản phẩm riêng.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'SECOND_CHANCE_WITHDRAWN_SELLER',
              awardId: award.id,
              auctionId: award.auctionId,
              auctionItemId: award.auctionItemId,
            },
          },
          this.notifications,
        );
      }

      return updated;
    });

    this.domainEvents?.publishAuctionStateChanged({
      auctionId: outcome.auctionId,
      reason: 'AWARD_SETTLED',
    });

    return outcome;
  }

  /**
   * Handles scheduled expiration of an overdue award:
   * - If AWAITING_CHECKOUT: triggers payment default forfeiture flow.
   * - If SECOND_CHANCE in AWAITING_ACCEPTANCE or AWAITING_DEPOSIT: marks EXPIRED and closes the lot.
   */
  async expire(awardId: string): Promise<void> {
    const offer = await this.prisma.auctionAward.findUnique({ where: { id: awardId } });
    if (!offer || offer.expiresAt.getTime() > Date.now()) return;

    if (offer.status === AuctionAwardStatus.AWAITING_CHECKOUT) {
      await this.markPaymentDefault(awardId, undefined, 'Tự động quá hạn thanh toán 24 giờ.');
      return;
    }

    if (
      offer.status === AuctionAwardStatus.AWAITING_ACCEPTANCE ||
      offer.status === AuctionAwardStatus.AWAITING_DEPOSIT
    ) {
      const expiredAuctionId = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM auction_awards WHERE id = ${awardId} FOR UPDATE`;
        const current = await tx.auctionAward.findUnique({
          where: { id: awardId },
          include: { auction: true, auctionItem: true },
        });
        if (
          !current ||
          (current.status !== AuctionAwardStatus.AWAITING_ACCEPTANCE &&
            current.status !== AuctionAwardStatus.AWAITING_DEPOSIT)
        ) {
          return null;
        }
        await tx.auctionAward.update({
          where: { id: current.id },
          data: {
            status: AuctionAwardStatus.EXPIRED,
            completedAt: new Date(),
            resolutionNote: 'Quá hạn phản hồi hoặc nạp cọc 30% trong 24 giờ.',
          },
        });
        if (current.auctionItemId) {
          await tx.auctionItem.update({
            where: { id: current.auctionItemId },
            data: { lotStatus: AuctionStatus.FAILED },
          });
        }
        await syncAuctionCompletionStatusTx(tx, current.auctionId);
        return current.auctionId;
      });
      if (expiredAuctionId) {
        this.domainEvents?.publishAuctionStateChanged({
          auctionId: expiredAuctionId,
          reason: 'AWARD_SETTLED',
        });
      }
    }
  }

  /**
   * Synchronizes the parent auction room status once all approved lots reach terminal states.
   */

  private async activateSecondChanceCheckoutTx(
    tx: Prisma.TransactionClient,
    award: {
      id: string;
      auctionId: string;
      auctionItemId: string | null;
      buyerId: string | null;
      offerAmount: Prisma.Decimal;
      depositAmount: Prisma.Decimal;
      bid: { bidderId: string; bidAmount: Prisma.Decimal };
      auction: {
        id: string;
        title: string;
        sellerId: string | null;
        createdByAdminId: string | null;
        productId: string | null;
      };
      auctionItem: { id: string; title: string; lotNumber: number | null; sellerId: string } | null;
    },
    walletId: string,
    _currentBalance: number,
    fromAutoDeposit = false,
  ) {
    const buyerId = award.buyerId ?? award.bid.bidderId;
    const sellerId = award.auctionItem?.sellerId ?? award.auction.sellerId;
    if (!sellerId) {
      throw new ConflictException('Không xác định được người bán cho lô đấu giá.');
    }

    const depositAmount = Number(award.depositAmount);
    const offerAmount = Number(award.offerAmount || award.bid.bidAmount);
    const remainingProductAmount = roundCurrency(offerAmount - depositAmount);
    const itemTitle = award.auctionItem?.title ?? award.auction.title;
    const itemLabel = lotLabel(award.auctionItem?.lotNumber, itemTitle);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUCTION_CHECKOUT_DURATION_MS);

    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: { decrement: depositAmount },
        lockedBalance: { increment: depositAmount },
      },
    });
    await tx.walletTransaction.create({
      data: {
        walletId,
        type: WalletTransactionType.AUCTION_BID_LOCK,
        amount: -depositAmount,
        status: WalletTransactionStatus.SUCCESS,
        referenceId: award.auctionId,
        description: `Khóa 30% tiền cọc (${formatVnd(depositAmount)}) cho quyền mua ${itemLabel} (${award.auction.title}).`,
      },
    });

    const order = await createPendingAuctionOrder(tx, {
      buyerId,
      sellerId,
      auctionItemId: award.auctionItemId,
      productId: award.auction.productId,
      title: itemTitle,
      offerAmount,
    });

    const updated = await tx.auctionAward.update({
      where: { id: award.id },
      data: {
        orderId: order.id,
        status: AuctionAwardStatus.AWAITING_CHECKOUT,
        confirmedAt: now,
        expiresAt,
      },
    });

    const buyerMessage = fromAutoDeposit
      ? `Nạp tiền thành công! Hệ thống đã tự động trừ 30% tiền cọc (${formatVnd(depositAmount)}) cho ${itemLabel} thuộc phiên "${award.auction.title}". Cảm ơn bạn! Vui lòng thanh toán đầy đủ 70% còn lại (${formatVnd(remainingProductAmount)}) + phí vận chuyển trong vòng 24 giờ.`
      : `Đã giữ 30% tiền cọc (${formatVnd(depositAmount)}) cho ${itemLabel}. Cảm ơn bạn đã xác nhận mua! Vui lòng hoàn tất thanh toán 70% còn lại (${formatVnd(remainingProductAmount)}) + phí vận chuyển trong vòng 24 giờ.`;

    await publishNotification(
      tx,
      {
        userId: buyerId,
        auctionId: award.auctionId,
        targetUrl: `/auction/${award.auctionId}`,
        title: `Đã thanh toán cọc 30% cho ${itemLabel}`,
        content: buyerMessage,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'SECOND_CHANCE_AWAITING_CHECKOUT',
          awardId: award.id,
          orderId: order.id,
          auctionId: award.auctionId,
          auctionItemId: award.auctionItemId,
          sellerId,
          depositAmount,
          remainingProductAmount,
          expiresAt: expiresAt.toISOString(),
          canChatWithShop: true,
        },
      },
      this.notifications,
    );

    await notifyUsersTx(tx, [sellerId, award.auction.createdByAdminId], {
      auctionId: award.auctionId,
      targetUrl: `/auction/${award.auctionId}`,
      title: `Người mua tiếp theo đã đóng 30% cọc cho ${itemLabel}`,
      content: `Người mua dự bị đã đóng đủ 30% tiền cọc (${formatVnd(depositAmount)}) cho ${itemLabel} và bước vào thời hạn 24 giờ thanh toán phần còn lại.`,
      metadata: {
        actionType: 'SECOND_CHANCE_DEPOSIT_LOCKED',
        awardId: award.id,
        orderId: order.id,
        auctionId: award.auctionId,
        auctionItemId: award.auctionItemId,
      },
    });

    return updated;
  }

  private async inviteSecondChanceBuyerTx(
    tx: Prisma.TransactionClient,
    params: {
      auctionId: string;
      auctionItemId: string | null;
      excludedBuyerId: string;
      reservePrice: number | null;
      sellerId: string;
      adminId: string | null;
      itemLabel: string;
    },
  ): Promise<AuctionAward | null> {
    if (!params.auctionItemId) return null;

    const candidateBid = await tx.bid.findFirst({
      where: {
        auctionId: params.auctionId,
        auctionItemId: params.auctionItemId,
        bidderId: { not: params.excludedBuyerId },
        status: 'ACCEPTED',
        ...(params.reservePrice !== null ? { bidAmount: { gte: params.reservePrice } } : {}),
        bidder: {
          trustLevel: { not: 'SUSPENDED' },
        },
      },
      orderBy: [{ bidAmount: 'desc' }, { placedAt: 'asc' }],
    });

    if (!candidateBid) return null;

    const offerAmount = Number(candidateBid.bidAmount);
    const requiredDeposit = roundCurrency(offerAmount * DEPOSIT_RATIO);
    const expiresAt = new Date(Date.now() + AUCTION_CHECKOUT_DURATION_MS);

    const secondAward = await tx.auctionAward.create({
      data: {
        auctionId: params.auctionId,
        auctionItemId: params.auctionItemId,
        bidId: candidateBid.id,
        buyerId: candidateBid.bidderId,
        orderId: null,
        tier: AuctionAwardTier.SECOND_CHANCE,
        offerAmount,
        depositAmount: requiredDeposit,
        status: AuctionAwardStatus.AWAITING_ACCEPTANCE,
        expiresAt,
      },
    });

    await publishNotification(
      tx,
      {
        userId: candidateBid.bidderId,
        auctionId: params.auctionId,
        targetUrl: `/auction/${params.auctionId}`,
        title: `Cơ hội mua ${params.itemLabel} theo mức giá bạn đã đặt`,
        content: `Người thắng đầu tiên đã không hoàn tất thanh toán. Hệ thống trân trọng mời bạn tiếp tục mua ${params.itemLabel} theo đúng mức giá bạn đã đặt (${formatVnd(offerAmount)}, cọc 30% tương đương ${formatVnd(requiredDeposit)}). Bạn có muốn tiếp tục mua món hàng này không?`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'SECOND_CHANCE_INVITATION',
          awardId: secondAward.id,
          auctionId: params.auctionId,
          auctionItemId: params.auctionItemId,
          sellerId: params.sellerId,
          offerAmount,
          requiredDepositAmount: requiredDeposit,
          expiresAt: expiresAt.toISOString(),
          canConfirm: true,
          canDecline: true,
          canChatWithShop: true,
        },
      },
      this.notifications,
    );

    await notifyUsersTx(tx, [params.sellerId, params.adminId], {
      auctionId: params.auctionId,
      targetUrl: `/auction/${params.auctionId}`,
      title: `Đã chuyển quyền mua dự bị cho ${params.itemLabel}`,
      content: `Sau khi người thắng đầu tiên quá hạn thanh toán, hệ thống đã gửi lời mời mua hàng tới người trả giá cao kế tiếp cho ${params.itemLabel} (${formatVnd(offerAmount)}).`,
      metadata: {
        actionType: 'SECOND_CHANCE_SENT',
        awardId: secondAward.id,
        auctionId: params.auctionId,
        auctionItemId: params.auctionItemId,
      },
    });

    return secondAward;
  }
}
