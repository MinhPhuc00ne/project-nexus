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
  Order,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
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
import { GhnShippingService } from '../../fulfillment/services/ghn-shipping.service';
import { ReputationService } from '../../users/services/reputation.service';
import { OrderEscrowService } from './order-escrow.service';
import {
  AUCTION_CHECKOUT_DURATION_MS,
  AuctionAwardQuote,
  BUYER_ACTIVE_AWARD_STATUSES,
  CheckoutAuctionAwardDto,
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
  CheckoutAuctionAwardDto,
  CreatePrimaryAwardInput,
} from './auction-checkout.utils';

/**
 * Coordinates the post-auction 30%/70% deposit, 24-hour checkout, default forfeiture,
 * second-chance buyer invitation, auto-deposit lock, and admin withdrawal flows.
 */
@Injectable()
export class AuctionCheckoutService {
  private readonly secondChanceHelper: AuctionSecondChanceHelper;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: GhnShippingService,
    private readonly escrow: OrderEscrowService,
    private readonly reputation: ReputationService,
    private readonly adminSettings: AdminSettingsService,
    private readonly adminFinance: AdminFinanceService,
    @Optional() private readonly auctionStock?: AuctionStockService,
  ) {
    this.secondChanceHelper = new AuctionSecondChanceHelper(
      this.prisma,
      this.reputation,
      this.adminSettings,
      this.adminFinance,
      this.auctionStock,
    );
  }

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
    const offer = await this.loadOwnedOfferForCheckout(awardId, buyerId, true);
    if (offer.status === AuctionAwardStatus.PAID && offer.order) {
      return offer.order;
    }
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
      if (current.status === AuctionAwardStatus.PAID && current.order) {
        return current.order;
      }
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
      await syncAuctionCompletionStatusTx(tx, current.auctionId);

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
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn đấu giá này.');
    }
    if (allowPaid && offer.status === AuctionAwardStatus.PAID && offer.order) {
      return offer;
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
