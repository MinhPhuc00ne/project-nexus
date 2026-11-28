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
import { AppErrorCode } from '@nexus/contracts';
import {
  AuctionAward,
  AuctionAwardStatus,
  AuctionAwardTier,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { DomainEventsService } from '../../../core/events/domain-events.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { productChoiceLabel } from '../../../core/domain/product-options';
import { GhnParcelItem } from '../../fulfillment/services/ghn-parcel';
import { GhnShippingService } from '../../fulfillment/services/ghn-shipping.service';
import { OrderEscrowService } from '../../orders/services/order-escrow.service';
import {
  AUCTION_CHECKOUT_DURATION_MS,
  AuctionAwardQuote,
  BUYER_ACTIVE_AWARD_STATUSES,
  CheckoutAuctionAwardInput,
  CreatePrimaryAwardInput,
  DEPOSIT_RATIO,
  createPendingAuctionOrder,
  formatVnd,
  lotLabel,
  roundCurrency,
  syncAuctionCompletionStatusTx,
} from './auction-checkout.utils';
import { AuctionSecondChanceHelper } from './auction-second-chance.helper';

export type {
  AuctionAwardQuote,
  CheckoutAuctionAwardInput,
  CreatePrimaryAwardInput,
} from './auction-checkout.utils';

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
    private readonly secondChanceHelper: AuctionSecondChanceHelper,
    @Optional() private readonly domainEvents?: DomainEventsService,
    @Optional() private readonly notifications?: NotificationPublisher,
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
      throw new ConflictException({
        message: 'Locked wallet balance is insufficient to initialize the 30% deposit.',
        errorCode: AppErrorCode.CONFLICT,
      });
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
            description: `Released 70% bid hold (${formatVnd(unlockAmount)}) after winning ${lotLabel(input.lotNumber, input.title)}; retained 30% deposit (${formatVnd(depositAmount)}).`,
          },
        });
      }
    }

    const order = await createPendingAuctionOrder(tx, {
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

    await publishNotification(
      tx,
      {
        userId: input.buyerId,
        auctionId: input.auctionId,
        targetUrl: `/auction/${input.auctionId}`,
        title: `You won ${lotLabel(input.lotNumber, input.title)}!`,
        content: `70% (${formatVnd(refundAmount)}) has been released back to your wallet and 30% (${formatVnd(depositAmount)}) is held as your deposit. Please complete checkout for the remaining 70% + shipping within 24 hours.`,
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
      this.notifications,
    );

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
    dto: CheckoutAuctionAwardInput,
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
  async checkout(awardId: string, buyerId: string, dto: CheckoutAuctionAwardInput): Promise<Order> {
    const offer = await this.loadOwnedOfferForCheckout(awardId, buyerId, true);
    if (offer.status === AuctionAwardStatus.PAID && offer.order) {
      return offer.order;
    }
    const quote = await this.quoteShipping(buyerId, offer, dto);

    const settledOrder = await this.prisma.$transaction(async (tx) => {
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
      if (current.status === AuctionAwardStatus.PAID && current.order) {
        return { order: current.order, auctionId: null as string | null };
      }
      if (current.status !== AuctionAwardStatus.AWAITING_CHECKOUT || !current.order) {
        throw new ConflictException(
          'Purchase right for this auction lot is no longer awaiting payment.',
        );
      }
      if (current.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException(
          'The 24-hour payment window for this auction lot has expired.',
        );
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
          `Available wallet balance is insufficient to pay the remaining 70% plus shipping (${formatVnd(dueNow)} required).`,
        );
      }
      if (Number(wallet.lockedBalance) < depositAmount) {
        throw new ConflictException('Invalid 30% locked deposit in wallet.');
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
          description: `Paid remaining 70% (${formatVnd(remainingProductAmount)}) + GHN fee (${formatVnd(shippingFee)}) for auction order #${current.order.id.slice(0, 8)} (deposit ${formatVnd(depositAmount)} applied).`,
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
      await syncAuctionCompletionStatusTx(tx, current.auctionId);

      const itemTitle = current.auctionItem?.title ?? current.auction.title;
      const sellerId = current.auctionItem?.sellerId ?? current.auction.sellerId;
      if (sellerId) {
        await publishNotification(
          tx,
          {
            userId: sellerId,
            auctionId: current.auctionId,
            targetUrl: `/seller/orders/${updatedOrder.id}`,
            title: 'Auction winner has paid the order!',
            content: `Order for "${itemTitle}" (${formatVnd(totalAmount)}) has been paid in full. Please prepare for shipment.`,
            type: NotificationType.ORDER,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_ORDER_PAID',
              orderId: updatedOrder.id,
              auctionId: current.auctionId,
              auctionItemId: current.auctionItemId,
            },
          },
          this.notifications,
        );
      }

      return { order: updatedOrder, auctionId: current.auctionId as string | null };
    });

    if (settledOrder.auctionId) {
      this.domainEvents?.publishAuctionStateChanged({
        auctionId: settledOrder.auctionId,
        reason: 'AWARD_SETTLED',
      });
    }

    return settledOrder.order;
  }

  /**
   * Second-chance buyer accepts or declines the purchase offer at their own bid price.
   * Declining incurs no penalty; accepting immediately locks 30% if balance suffices or transitions
   * to AWAITING_DEPOSIT with exact top-up instructions.
   */

  private async loadOwnedOfferForCheckout(awardId: string, buyerId: string, allowPaid = false) {
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
      throw new ForbiddenException('You do not have permission to pay for this auction order.');
    }
    if (allowPaid && offer.status === AuctionAwardStatus.PAID && offer.order) {
      return offer;
    }
    if (offer.status !== AuctionAwardStatus.AWAITING_CHECKOUT || !offer.order) {
      throw new ConflictException(
        'Purchase right for this auction lot is no longer valid for payment.',
      );
    }
    if (offer.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('The 24-hour payment window for this auction lot has expired.');
    }
    return offer;
  }

  private async quoteShipping(
    buyerId: string,
    offer: Awaited<ReturnType<AuctionCheckoutService['loadOwnedOfferForCheckout']>>,
    dto: CheckoutAuctionAwardInput,
  ) {
    if (!offer.order) {
      throw new ConflictException('Auction order has not been initialized.');
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

  private async resolveAddress(buyerId: string, dto: CheckoutAuctionAwardInput) {
    if (dto.addressId) {
      const address = await this.prisma.userAddress.findFirst({
        where: { id: dto.addressId, userId: buyerId },
      });
      if (!address) {
        throw new NotFoundException('Shipping address not found.');
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
      throw new BadRequestException('Please select or enter a shipping address.');
    }
    return fallback;
  }

  respondSecondChance(awardId: string, buyerId: string, accept: boolean) {
    return this.secondChanceHelper.respondSecondChance(awardId, buyerId, accept);
  }

  processPendingDepositsForUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    return this.secondChanceHelper.processPendingDepositsForUser(tx, userId);
  }

  markPaymentDefault(awardId: string, adminId?: string, note?: string) {
    return this.secondChanceHelper.markPaymentDefault(awardId, adminId, note);
  }

  withdrawSecondChanceByAdmin(awardId: string, adminId: string, note?: string) {
    return this.secondChanceHelper.withdrawSecondChanceByAdmin(awardId, adminId, note);
  }

  expire(awardId: string): Promise<void> {
    return this.secondChanceHelper.expire(awardId);
  }

  syncAuctionCompletionStatusTx(tx: Prisma.TransactionClient, auctionId: string): Promise<void> {
    return syncAuctionCompletionStatusTx(tx, auctionId);
  }
}
