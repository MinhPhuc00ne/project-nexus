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
  AuctionItemStatus,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PenaltyType,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AdminFinanceService } from '../../admin/services/admin-finance.service';
import { AdminSettingsService } from '../../admin/services/admin-settings.service';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { productChoiceLabel } from '../../catalog/utils/product-options';
import { GhnParcelItem } from '../../fulfillment/services/ghn-parcel';
import {
  GhnShippingQuote,
  GhnShippingService,
} from '../../fulfillment/services/ghn-shipping.service';
import { ReputationService } from '../../users/services/reputation.service';
import { CheckoutAuctionAwardDto as CheckoutAuctionAwardRequestDto } from '../dtos/checkout-auction-award.dto';
import { OrderEscrowService } from './order-escrow.service';

export interface CreatePrimaryAwardInput {
  auctionId: string;
  auctionItemId: string;
  bidId: string;
  buyerId: string;
  sellerId: string;
  title: string;
  lotNumber: number | null;
  offerAmount: number;
  productId?: string | null;
  expiresAt?: Date;
}

export type CheckoutAuctionAwardDto = CheckoutAuctionAwardRequestDto;

export interface AuctionAwardQuote {
  awardId: string;
  tier: AuctionAwardTier;
  offerAmount: number;
  depositAmount: number;
  remainingProductAmount: number;
  shippingFee: number;
  dueNow: number;
  totalOrderAmount: number;
  expiresAt: Date;
  ghn: {
    origin: GhnShippingQuote['origin'];
    parcel: GhnShippingQuote['parcel'];
    request: GhnShippingQuote['request'];
  };
}

const BUYER_ACTIVE_AWARD_STATUSES: AuctionAwardStatus[] = [
  AuctionAwardStatus.AWAITING_ACCEPTANCE,
  AuctionAwardStatus.AWAITING_DEPOSIT,
  AuctionAwardStatus.AWAITING_CHECKOUT,
  AuctionAwardStatus.PAID,
];

const LOT_TERMINAL_STATUSES = new Set<AuctionStatus>([
  AuctionStatus.ENDED,
  AuctionStatus.SETTLED,
  AuctionStatus.CANCELLED,
  AuctionStatus.FAILED,
]);

const AUCTION_CHECKOUT_DURATION_MS = 24 * 60 * 60 * 1000;
const AUCTION_DEFAULT_REPUTATION_PENALTY = -10;
const DEPOSIT_RATIO = 0.3;

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

function lotLabel(lotNumber: number | null | undefined, title: string): string {
  return lotNumber ? `Lô #${lotNumber}: ${title}` : title;
}

/**
 * Coordinates the post-auction 30%/70% deposit, 24-hour checkout, default forfeiture,
 * second-chance buyer invitation, auto-deposit lock, and admin withdrawal flows.
 */
@Injectable()
export class AuctionCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: GhnShippingService,
    private readonly escrow: OrderEscrowService,
    private readonly reputation: ReputationService,
    private readonly adminSettings: AdminSettingsService,
    private readonly adminFinance: AdminFinanceService,
    @Optional() private readonly auctionStock?: AuctionStockService,
  ) {}

  /**
   * Creates the initial 24-hour checkout award for the primary winner of a lot:
   * refunds 70% of the locked bid back to the buyer's wallet balance and retains 30% as escrow deposit.
   */
  async createPrimaryAward(
    tx: Prisma.TransactionClient,
    input: CreatePrimaryAwardInput,
  ): Promise<AuctionAward> {
    const existing = await tx.auctionAward.findUnique({ where: { bidId: input.bidId } });
    if (existing) return existing;

    const depositAmount = roundCurrency(input.offerAmount * DEPOSIT_RATIO);
    const refundAmount = roundCurrency(input.offerAmount - depositAmount);
    const expiresAt = input.expiresAt ?? new Date(Date.now() + AUCTION_CHECKOUT_DURATION_MS);

    await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${input.buyerId} FOR UPDATE`;
    const buyerWallet = await tx.wallet.findUnique({ where: { userId: input.buyerId } });
    if (!buyerWallet || Number(buyerWallet.lockedBalance) < depositAmount) {
      throw new ConflictException('Số dư tạm giữ trong ví không đủ để khởi tạo tiền cọc 30%.');
    }

    if (refundAmount > 0) {
      const unlockAmount = Math.min(
        refundAmount,
        Number(buyerWallet.lockedBalance) - depositAmount,
      );
      if (unlockAmount > 0) {
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: {
            balance: { increment: unlockAmount },
            lockedBalance: { decrement: unlockAmount },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: WalletTransactionType.AUCTION_BID_REFUND,
            amount: unlockAmount,
            status: WalletTransactionStatus.SUCCESS,
            referenceId: input.auctionId,
            description: `Hoàn 70% tiền giữ chỗ (${formatVnd(unlockAmount)}) sau khi thắng ${lotLabel(input.lotNumber, input.title)}; giữ lại 30% tiền cọc (${formatVnd(depositAmount)}).`,
          },
        });
      }
    }

    const order = await this.createPendingAuctionOrder(tx, {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      auctionItemId: input.auctionItemId,
      productId: input.productId ?? null,
      title: input.title,
      offerAmount: input.offerAmount,
    });

    const award = await tx.auctionAward.create({
      data: {
        auctionId: input.auctionId,
        auctionItemId: input.auctionItemId,
        bidId: input.bidId,
        buyerId: input.buyerId,
        orderId: order.id,
        tier: AuctionAwardTier.PRIMARY_WINNER,
        offerAmount: input.offerAmount,
        depositAmount,
        status: AuctionAwardStatus.AWAITING_CHECKOUT,
        confirmedAt: new Date(),
        expiresAt,
      },
    });

    await tx.notification.create({
      data: {
        userId: input.buyerId,
        auctionId: input.auctionId,
        targetUrl: `/auction/${input.auctionId}`,
        title: `Bạn đã thắng ${lotLabel(input.lotNumber, input.title)}!`,
        content: `Hệ thống đã hoàn 70% (${formatVnd(refundAmount)}) về ví và giữ 30% tiền cọc (${formatVnd(depositAmount)}). Vui lòng hoàn tất đặt mua và thanh toán 70% còn lại + phí vận chuyển trong vòng 24 giờ.`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'AUCTION_WON_AWAITING_CHECKOUT',
          awardId: award.id,
          orderId: order.id,
          auctionId: input.auctionId,
          auctionItemId: input.auctionItemId,
          sellerId: input.sellerId,
          depositAmount,
          remainingProductAmount: refundAmount,
          expiresAt: expiresAt.toISOString(),
          canChatWithShop: true,
        },
      },
    });

    return award;
  }

  /**
   * Lists active and completed auction offers owned by the current buyer.
   * Revoked or defaulted awards are excluded so stale offers disappear upon reload.
   */
  async list(buyerId: string) {
    const awards = await this.prisma.auctionAward.findMany({
      where: {
        status: { in: BUYER_ACTIVE_AWARD_STATUSES },
        OR: [{ buyerId }, { order: { buyerId } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        auction: { select: { id: true, title: true, status: true, endTime: true } },
        auctionItem: {
          select: {
            id: true,
            title: true,
            images: true,
            lotNumber: true,
            lotStatus: true,
            sellerId: true,
            weightGrams: true,
            lengthCm: true,
            widthCm: true,
            heightCm: true,
            seller: { select: { id: true, fullName: true } },
          },
        },
        bid: true,
        order: true,
      },
    });

    return awards.map((award) => {
      const offerAmount = Number(award.offerAmount || award.bid.bidAmount);
      const depositAmount = Number(award.depositAmount);
      return {
        ...award,
        offerAmount,
        depositAmount,
        remainingProductAmount: roundCurrency(offerAmount - depositAmount),
      };
    });
  }

  /**
   * Lists auction awards visible to Admin and Support Staff for post-auction oversight.
   */
  async listAwardsForAdmin(auctionId?: string) {
    const awards = await this.prisma.auctionAward.findMany({
      where: auctionId ? { auctionId } : undefined,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        auction: { select: { id: true, title: true, status: true } },
        auctionItem: {
          select: {
            id: true,
            title: true,
            lotNumber: true,
            lotStatus: true,
            sellerId: true,
            seller: { select: { id: true, fullName: true } },
          },
        },
        buyer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            reputationScore: true,
            trustLevel: true,
          },
        },
        bid: true,
        order: { select: { id: true, status: true, totalAmount: true, shippingFee: true } },
      },
    });

    return awards.map((award) => {
      const offerAmount = Number(award.offerAmount || award.bid.bidAmount);
      const depositAmount = Number(award.depositAmount);
      return {
        ...award,
        offerAmount,
        depositAmount,
        remainingProductAmount: roundCurrency(offerAmount - depositAmount),
        canConfirmPaymentDefault: award.status === AuctionAwardStatus.AWAITING_CHECKOUT,
        canMarkNotBuying:
          award.tier === AuctionAwardTier.SECOND_CHANCE &&
          (award.status === AuctionAwardStatus.AWAITING_ACCEPTANCE ||
            award.status === AuctionAwardStatus.AWAITING_DEPOSIT ||
            award.status === AuctionAwardStatus.AWAITING_CHECKOUT),
      };
    });
  }

  /**
   * Quotes GHN shipping and the remaining 70% + shipping balance due before final auction checkout.
   */
  async quote(
    awardId: string,
    buyerId: string,
    dto: CheckoutAuctionAwardDto,
  ): Promise<AuctionAwardQuote> {
    const offer = await this.loadOwnedOfferForCheckout(awardId, buyerId);
    const quote = await this.quoteShipping(buyerId, offer, dto);
    const offerAmount = Number(offer.offerAmount || offer.bid.bidAmount);
    const depositAmount = Number(offer.depositAmount);
    const remainingProductAmount = roundCurrency(offerAmount - depositAmount);
    const shippingFee = quote.fee.total;
    return {
      awardId,
      tier: offer.tier,
      offerAmount,
      depositAmount,
      remainingProductAmount,
      shippingFee,
      dueNow: roundCurrency(remainingProductAmount + shippingFee),
      totalOrderAmount: roundCurrency(offerAmount + shippingFee),
      expiresAt: offer.expiresAt,
      ghn: { origin: quote.origin, parcel: quote.parcel, request: quote.request },
    };
  }

  /**
   * Completes checkout for an auction award in AWAITING_CHECKOUT: consumes the 30% locked deposit
   * plus the remaining 70% + GHN shipping from wallet balance, then transfers funds into OrderEscrow.
   */
  async checkout(awardId: string, buyerId: string, dto: CheckoutAuctionAwardDto): Promise<Order> {
    const offer = await this.loadOwnedOfferForCheckout(awardId, buyerId);
    const quote = await this.quoteShipping(buyerId, offer, dto);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auction_awards WHERE id = ${awardId} FOR UPDATE`;
      const current = await tx.auctionAward.findUniqueOrThrow({
        where: { id: awardId },
        include: {
          auction: true,
          auctionItem: true,
          bid: true,
          order: { include: { items: true } },
        },
      });
      if (current.status !== AuctionAwardStatus.AWAITING_CHECKOUT || !current.order) {
        throw new ConflictException(
          'Quyền mua lô hàng đấu giá này không còn ở trạng thái chờ thanh toán.',
        );
      }
      if (current.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Thời hạn 24 giờ thanh toán lô hàng đấu giá đã hết.');
      }

      await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${buyerId} FOR UPDATE`;
      const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      const offerAmount = Number(current.offerAmount || current.bid.bidAmount);
      const depositAmount = Number(current.depositAmount);
      const remainingProductAmount = roundCurrency(offerAmount - depositAmount);
      const shippingFee = quote.fee.total;
      const dueNow = roundCurrency(remainingProductAmount + shippingFee);
      const totalAmount = roundCurrency(offerAmount + shippingFee);

      if (!wallet || Number(wallet.balance) < dueNow) {
        throw new BadRequestException(
          `Số dư ví khả dụng không đủ để thanh toán 70% còn lại và phí vận chuyển (cần ${formatVnd(dueNow)}).`,
        );
      }
      if (Number(wallet.lockedBalance) < depositAmount) {
        throw new ConflictException('Khoản cọc 30% trong ví tạm giữ không hợp lệ.');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: dueNow },
          lockedBalance: { decrement: depositAmount },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.ORDER_PAYMENT,
          amount: -dueNow,
          status: WalletTransactionStatus.SUCCESS,
          referenceId: current.order.id,
          description: `Thanh toán 70% còn lại (${formatVnd(remainingProductAmount)}) + phí GHN (${formatVnd(shippingFee)}) cho đơn đấu giá #${current.order.id.slice(0, 8)} (đã trừ cọc ${formatVnd(depositAmount)}).`,
        },
      });

      const snapshot = {
        ...quote.address,
        ghn: { origin: quote.origin, parcel: quote.parcel, request: quote.request },
      };
      const updatedOrder = await tx.order.update({
        where: { id: current.order.id },
        data: {
          status: OrderStatus.PAID,
          shippingFee,
          totalAmount,
          shippingAddressSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.payment.create({
        data: {
          orderId: updatedOrder.id,
          provider: PaymentProvider.WALLET,
          amount: totalAmount,
          status: PaymentStatus.SUCCESS,
        },
      });
      await this.escrow.hold(tx, updatedOrder);

      await tx.auctionAward.update({
        where: { id: current.id },
        data: { status: AuctionAwardStatus.PAID, completedAt: new Date() },
      });

      if (current.auctionItemId) {
        await tx.auctionItem.update({
          where: { id: current.auctionItemId },
          data: { lotStatus: AuctionStatus.SETTLED },
        });
      }
      await this.syncAuctionCompletionStatusTx(tx, current.auctionId);

      const itemTitle = current.auctionItem?.title ?? current.auction.title;
      const sellerId = current.auctionItem?.sellerId ?? current.auction.sellerId;
      if (sellerId) {
        await tx.notification.create({
          data: {
            userId: sellerId,
            auctionId: current.auctionId,
            targetUrl: `/seller/orders/${updatedOrder.id}`,
            title: 'Người thắng đấu giá đã thanh toán đơn hàng!',
            content: `Đơn hàng cho "${itemTitle}" (${formatVnd(totalAmount)}) đã thanh toán đầy đủ. Vui lòng chuẩn bị giao hàng.`,
            type: NotificationType.ORDER,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_ORDER_PAID',
              orderId: updatedOrder.id,
              auctionId: current.auctionId,
              auctionItemId: current.auctionItemId,
            },
          },
        });
      }

      return updatedOrder;
    });
  }

  /**
   * Second-chance buyer accepts or declines the purchase offer at their own bid price.
   * Declining incurs no penalty; accepting immediately locks 30% if balance suffices or transitions
   * to AWAITING_DEPOSIT with exact top-up instructions.
   */
  async respondSecondChance(awardId: string, buyerId: string, accept: boolean) {
    return this.prisma.$transaction(async (tx) => {
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
        await this.syncAuctionCompletionStatusTx(tx, award.auctionId);

        await this.notifyDeclinedOfferTx(tx, {
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

      await tx.notification.create({
        data: {
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
      });

      await this.notifyUsersTx(tx, [sellerId, award.auction.createdByAdminId], {
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
    return this.prisma.$transaction(async (tx) => {
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

      const adminWallet = await this.adminFinance.getOrCreatePrimaryAdminWallet(tx);
      const walletOwnerIds = [...new Set([buyerId, sellerId, adminWallet.userId])].sort();
      for (const ownerId of walletOwnerIds) {
        await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${ownerId} FOR UPDATE`;
      }

      const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      const sellerWallet = await tx.wallet.findUnique({ where: { userId: sellerId } });
      const latestAdminWallet = await tx.wallet.findUnique({ where: { id: adminWallet.id } });
      const depositAmount = Number(current.depositAmount);

      if (!buyerWallet || Number(buyerWallet.lockedBalance) < depositAmount) {
        throw new ConflictException(
          'Khoản cọc 30% trong ví tạm giữ của người mua không đủ để tịch thu.',
        );
      }
      if (!sellerWallet || !latestAdminWallet) {
        throw new NotFoundException('Không tìm thấy ví người bán hoặc ví sàn để phân bổ tiền cọc.');
      }

      const settings = await this.adminSettings.getSettings();
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

      await tx.notification.create({
        data: {
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
      });

      await tx.notification.create({
        data: {
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
      });

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
          };
        }
      }

      if (current.auctionItemId) {
        await tx.auctionItem.update({
          where: { id: current.auctionItemId },
          data: { lotStatus: AuctionStatus.FAILED },
        });
      }
      await this.syncAuctionCompletionStatusTx(tx, current.auctionId);

      await tx.notification.create({
        data: {
          userId: sellerId,
          auctionId: current.auctionId,
          targetUrl: `/seller/auctions`,
          title: `Kết thúc luồng đấu giá cho ${itemLabel}`,
          content: `${itemLabel} không còn người mua đủ điều kiện tiếp nhận. Phiên đấu giá cho món hàng này đã đóng; bạn có thể đăng bán lại sản phẩm ở luồng cửa hàng nếu muốn.`,
          type: NotificationType.AUCTION,
          channel: NotificationChannel.IN_APP,
        },
      });

      return {
        defaultedAwardId: current.id,
        secondChanceAwardId: null,
        lotStatus: AuctionStatus.FAILED,
      };
    });
  }

  /**
   * Executes Admin's "Khách không mua nữa" action on a SECOND_CHANCE buyer:
   * - If the buyer already locked a 30% deposit (AWAITING_CHECKOUT), refunds the 30% deposit cleanly
   *   and cancels the pending order without any reputation penalty.
   * - If unresponsive before deposit lock (AWAITING_ACCEPTANCE / AWAITING_DEPOSIT), terminates the offer cleanly.
   */
  async withdrawSecondChanceByAdmin(awardId: string, adminId: string, note?: string) {
    return this.prisma.$transaction(async (tx) => {
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
      await this.syncAuctionCompletionStatusTx(tx, award.auctionId);

      await tx.notification.create({
        data: {
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
      });

      if (sellerId) {
        await tx.notification.create({
          data: {
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
        });
      }

      return updated;
    });
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
      await this.prisma.$transaction(async (tx) => {
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
          return;
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
        await this.syncAuctionCompletionStatusTx(tx, current.auctionId);
      });
    }
  }

  /**
   * Synchronizes the parent auction room status once all approved lots reach terminal states.
   */
  async syncAuctionCompletionStatusTx(
    tx: Prisma.TransactionClient,
    auctionId: string,
  ): Promise<void> {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction || auction.status === AuctionStatus.CANCELLED) return;

    const approvedLots = await tx.auctionItem.findMany({
      where: { auctionId, status: AuctionItemStatus.APPROVED },
      select: { id: true, lotStatus: true },
    });
    if (!approvedLots.length) return;

    const allLotsDone = approvedLots.every((lot) => LOT_TERMINAL_STATUSES.has(lot.lotStatus));
    if (!allLotsDone) return;

    const openAwards = await tx.auctionAward.count({
      where: {
        auctionId,
        status: {
          in: [
            AuctionAwardStatus.AWAITING_ACCEPTANCE,
            AuctionAwardStatus.AWAITING_DEPOSIT,
            AuctionAwardStatus.AWAITING_CHECKOUT,
          ],
        },
      },
    });
    if (openAwards > 0) {
      if (auction.status !== AuctionStatus.ENDED && auction.status !== AuctionStatus.SETTLED) {
        await tx.auction.update({
          where: { id: auctionId },
          data: { status: AuctionStatus.ENDED },
        });
      }
      return;
    }

    const anySettled = approvedLots.some((lot) => lot.lotStatus === AuctionStatus.SETTLED);
    await tx.auction.update({
      where: { id: auctionId },
      data: { status: anySettled ? AuctionStatus.SETTLED : AuctionStatus.ENDED },
    });
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
    currentBalance: number,
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

    const order = await this.createPendingAuctionOrder(tx, {
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

    await tx.notification.create({
      data: {
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
    });

    await this.notifyUsersTx(tx, [sellerId, award.auction.createdByAdminId], {
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

    await tx.notification.create({
      data: {
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
    });

    await this.notifyUsersTx(tx, [params.sellerId, params.adminId], {
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

  private async createPendingAuctionOrder(
    tx: Prisma.TransactionClient,
    params: {
      buyerId: string;
      sellerId: string;
      auctionItemId: string | null;
      productId: string | null;
      title: string;
      offerAmount: number;
    },
  ): Promise<Order> {
    return tx.order.create({
      data: {
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        status: OrderStatus.PENDING_PAYMENT,
        isAuction: true,
        subtotal: params.offerAmount,
        shippingFee: 0,
        totalAmount: params.offerAmount,
        shippingAddressSnapshot: {},
        items: {
          create: {
            auctionItemId: params.auctionItemId,
            productId: params.productId,
            titleSnapshot: params.title,
            quantity: 1,
            unitPrice: params.offerAmount,
            totalPrice: params.offerAmount,
          },
        },
      },
    });
  }

  private async loadOwnedOfferForCheckout(awardId: string, buyerId: string) {
    const offer = await this.prisma.auctionAward.findUnique({
      where: { id: awardId },
      include: {
        auction: true,
        auctionItem: true,
        bid: true,
        order: { include: { items: { include: { product: true, auctionItem: true } } } },
      },
    });
    if (!offer || (offer.buyerId !== buyerId && offer.order?.buyerId !== buyerId)) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn đấu giá này.');
    }
    if (offer.status !== AuctionAwardStatus.AWAITING_CHECKOUT || !offer.order) {
      throw new ConflictException(
        'Quyền mua lô hàng đấu giá này không còn hiệu lực để thanh toán.',
      );
    }
    if (offer.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Thời hạn 24 giờ thanh toán lô hàng đấu giá đã hết.');
    }
    return offer;
  }

  private async quoteShipping(
    buyerId: string,
    offer: Awaited<ReturnType<AuctionCheckoutService['loadOwnedOfferForCheckout']>>,
    dto: CheckoutAuctionAwardDto,
  ) {
    if (!offer.order) {
      throw new ConflictException('Đơn hàng đấu giá chưa được khởi tạo.');
    }
    const address = await this.resolveAddress(buyerId, dto);
    const items: GhnParcelItem[] = offer.order.items.map(
      ({ product, auctionItem, titleSnapshot, quantity, unitPrice, selections }) => ({
        name: productChoiceLabel(
          auctionItem?.title ?? product?.title ?? titleSnapshot ?? offer.auction.title,
          selections,
        ),
        quantity,
        weight: auctionItem?.weightGrams ?? product?.weightGrams ?? 500,
        length: auctionItem?.lengthCm ?? product?.lengthCm ?? 20,
        width: auctionItem?.widthCm ?? product?.widthCm ?? 15,
        height: auctionItem?.heightCm ?? product?.heightCm ?? 10,
        price: Number(unitPrice),
      }),
    );
    const quote = await this.shipping.quote(offer.order.sellerId, address, items);
    return { ...quote, address };
  }

  private async resolveAddress(buyerId: string, dto: CheckoutAuctionAwardDto) {
    if (dto.addressId) {
      const address = await this.prisma.userAddress.findFirst({
        where: { id: dto.addressId, userId: buyerId },
      });
      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ giao hàng.');
      }
      return address;
    }
    if (dto.shippingAddress) return dto.shippingAddress;
    if (dto.recipientName && dto.phone && dto.city && dto.street) {
      return {
        country: dto.country ?? 'VN',
        recipientName: dto.recipientName,
        phone: dto.phone,
        city: dto.city,
        district: dto.district,
        ward: dto.ward,
        street: dto.street,
      };
    }
    const fallback = await this.prisma.userAddress.findFirst({
      where: { userId: buyerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    if (!fallback) {
      throw new BadRequestException('Vui lòng chọn hoặc nhập địa chỉ giao hàng.');
    }
    return fallback;
  }

  private async notifyDeclinedOfferTx(
    tx: Prisma.TransactionClient,
    params: {
      auctionId: string;
      auctionItemId: string | null;
      buyerId: string;
      sellerId: string | null;
      adminId: string | null;
      itemLabel: string;
    },
  ) {
    await tx.notification.create({
      data: {
        userId: params.buyerId,
        auctionId: params.auctionId,
        targetUrl: `/auction/${params.auctionId}`,
        title: `Cảm ơn bạn đã phản hồi cho ${params.itemLabel}`,
        content: `Hệ thống đã ghi nhận quyết định từ chối mua ${params.itemLabel}. Không có điểm uy tín nào bị trừ.`,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'SECOND_CHANCE_DECLINED_BUYER',
          auctionId: params.auctionId,
          auctionItemId: params.auctionItemId,
        },
      },
    });

    await this.notifyUsersTx(tx, [params.sellerId, params.adminId], {
      auctionId: params.auctionId,
      targetUrl: `/auction/${params.auctionId}`,
      title: `Người mua kế tiếp đã từ chối mua ${params.itemLabel}`,
      content: `Người mua dự bị đã từ chối tiếp nhận quyền mua ${params.itemLabel}. Lô đấu giá này đã kết thúc.`,
      metadata: {
        actionType: 'SECOND_CHANCE_DECLINED_NOTICE',
        auctionId: params.auctionId,
        auctionItemId: params.auctionItemId,
      },
    });
  }

  private async notifyUsersTx(
    tx: Prisma.TransactionClient,
    userIds: Array<string | null | undefined>,
    payload: {
      auctionId: string;
      targetUrl: string;
      title: string;
      content: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const uniqueIds = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (!uniqueIds.length) return;
    await tx.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        auctionId: payload.auctionId,
        targetUrl: payload.targetUrl,
        title: payload.title,
        content: payload.content,
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      })),
    });
  }
}
