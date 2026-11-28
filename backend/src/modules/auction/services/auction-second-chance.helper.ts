import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
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
        throw new NotFoundException('Auction purchase offer not found.');
      }
      if (award.buyerId !== buyerId) {
        throw new ForbiddenException(
          'You do not have permission to respond to this purchase offer.',
        );
      }
      if (award.tier !== AuctionAwardTier.SECOND_CHANCE) {
        throw new BadRequestException('This action only applies to second-chance buyers.');
      }
      if (award.status !== AuctionAwardStatus.AWAITING_ACCEPTANCE) {
        throw new ConflictException({
          message: 'This purchase offer has already been answered or is no longer valid.',
          errorCode: AppErrorCode.CONFLICT,
        });
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
            resolutionNote: 'Second-chance buyer declined the purchase offer.',
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
          title: `30% deposit required to purchase ${itemLabel}`,
          content: `You confirmed interest in purchasing ${itemLabel}. Please deposit the full 30% (${formatVnd(requiredDeposit)}, missing ${formatVnd(missingAmount)}). Once funded, the deposit will be locked automatically and 24-hour checkout will open.`,
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
          title: `Second-chance buyer accepted ${itemLabel} (awaiting deposit)`,
          content: `The backup buyer confirmed interest in purchasing ${itemLabel} at ${formatVnd(Number(award.offerAmount))} and is topping up the 30% deposit (${formatVnd(requiredDeposit)}).`,
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
      throw new ConflictException({
        message: 'Unable to identify the seller for this auction lot.',
        errorCode: AppErrorCode.CONFLICT,
      });
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
        description: `Locked 30% deposit (${formatVnd(depositAmount)}) for purchase right to ${itemLabel} (${award.auction.title}).`,
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
      ? `Top-up successful! 30% deposit (${formatVnd(depositAmount)}) has been automatically locked for ${itemLabel} in "${award.auction.title}". Thank you! Please pay the remaining 70% (${formatVnd(remainingProductAmount)}) plus shipping within 24 hours.`
      : `30% deposit (${formatVnd(depositAmount)}) has been locked for ${itemLabel}. Thank you for confirming! Please complete payment for the remaining 70% (${formatVnd(remainingProductAmount)}) plus shipping within 24 hours.`;

    await publishNotification(
      tx,
      {
        userId: buyerId,
        auctionId: award.auctionId,
        targetUrl: `/auction/${award.auctionId}`,
        title: `30% deposit paid for ${itemLabel}`,
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
        title: `Second-chance buyer paid 30% deposit for ${itemLabel}`,
        content: `The backup buyer has funded the 30% deposit (${formatVnd(depositAmount)}) for ${itemLabel} and entered the 24-hour window to pay the remaining balance.`,
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
