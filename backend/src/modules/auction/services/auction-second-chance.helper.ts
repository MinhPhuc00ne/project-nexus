import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AuctionAwardStatus,
  AuctionAwardTier,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { DomainEventsService } from '../../../core/events/domain-events.service';
import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { PlatformSettingsService } from '../../../core/settings/platform-settings.service';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AUCTION_CHECKOUT_DURATION_MS,
  createPendingAuctionOrder,
  formatVnd,
  lotLabel,
  notifyDeclinedOfferTx,
  notifyUsersTx,
  roundCurrency,
  syncAuctionCompletionStatusTx,
} from './auction-checkout.utils';
import { AuctionDefaultService } from './auction-default.service';

@Injectable()
export class AuctionSecondChanceHelper {
  private readonly fallbackDefaultService: AuctionDefaultService;

  constructor(
    private readonly prisma: PrismaService,
    reputation: ReputationService,
    adminSettings: PlatformSettingsService,
    treasury: TreasuryService,
    _auctionStock?: AuctionStockService,
    @Optional() private readonly domainEvents?: DomainEventsService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly defaultService?: AuctionDefaultService,
  ) {
    this.fallbackDefaultService =
      defaultService ??
      new AuctionDefaultService(
        prisma,
        reputation,
        adminSettings,
        treasury,
        domainEvents,
        notifications,
      );
  }

  private get defaults(): AuctionDefaultService {
    return this.defaultService ?? this.fallbackDefaultService;
  }

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

        await notifyDeclinedOfferTx(
          tx,
          {
            auctionId: award.auctionId,
            auctionItemId: award.auctionItemId,
            buyerId,
            sellerId,
            adminId: award.auction.createdByAdminId,
            itemLabel,
          },
          this.notifications,
        );

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

      await notifyUsersTx(
        tx,
        [sellerId, award.auction.createdByAdminId],
        {
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
        },
        this.notifications,
      );

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

  async markPaymentDefault(awardId: string, adminId?: string, note?: string) {
    return this.defaults.markPaymentDefault(awardId, adminId, note);
  }

  async withdrawSecondChanceByAdmin(awardId: string, adminId: string, note?: string) {
    return this.defaults.withdrawSecondChanceByAdmin(awardId, adminId, note);
  }

  async expire(awardId: string): Promise<void> {
    return this.defaults.expire(awardId);
  }

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

    await notifyUsersTx(
      tx,
      [sellerId, award.auction.createdByAdminId],
      {
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
      },
      this.notifications,
    );

    return updated;
  }
}
