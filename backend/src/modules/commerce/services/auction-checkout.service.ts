import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuctionAward, Order, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionStockService } from '../../catalog/services/auction-stock.service';
import { GhnShippingService } from '../../fulfillment/services/ghn-shipping.service';
import { ReputationService } from '../../users/services/reputation.service';
import { ShippingAddressDto } from '../dtos/checkout.dto';
import { OrderEscrowService } from './order-escrow.service';

/** Transactional handoff from a winning bid to commerce, including the already locked deposit. */
export interface AuctionWinningOffer {
  auctionId: string;
  bidId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  stockReference: string;
}

/** Creates winning orders and settles them without double-charging auction deposits. */
@Injectable()
export class AuctionCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: AuctionStockService,
    private readonly shipping: GhnShippingService,
    private readonly escrow: OrderEscrowService,
    private readonly reputation: ReputationService,
  ) {}

  /**
   * Creates exactly one order per bid while the caller holds the auction row lock.
   * @param tx Winning auction transaction.
   * @param input Authoritative winner and product association.
   * @returns Durable offer with a 24-hour checkout window.
   */
  async createAward(
    tx: Prisma.TransactionClient,
    input: AuctionWinningOffer,
  ): Promise<AuctionAward> {
    const existing = await tx.auctionAward.findUnique({ where: { bidId: input.bidId } });
    if (existing) return existing;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const order = await tx.order.create({
      data: {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        isAuction: true,
        subtotal: input.amount,
        totalAmount: input.amount,
        shippingFee: 0,
        shippingAddressSnapshot: { auctionId: input.auctionId, pendingShippingAddress: true },
        idempotencyKey: `auction-bid:${input.bidId}`,
        items: {
          create: {
            productId: input.productId,
            quantity: 1,
            unitPrice: input.amount,
            totalPrice: input.amount,
          },
        },
      },
    });
    await this.stock.award(tx, {
      referenceId: input.stockReference,
      orderId: order.id,
      productId: input.productId,
      expiresAt,
    });
    const award = await tx.auctionAward.create({
      data: {
        auctionId: input.auctionId,
        bidId: input.bidId,
        orderId: order.id,
        depositAmount: input.depositAmount,
        expiresAt,
      },
    });
    await tx.eventLog.create({
      data: {
        eventName: 'AuctionOfferCreated',
        payload: { auctionId: input.auctionId, orderId: order.id, awardId: award.id },
      },
    });
    return award;
  }

  /**
   * Returns only offers addressed to the authenticated buyer.
   * @param buyerId Authenticated account.
   * @returns Latest fifty offers with order details required for checkout.
   */
  async list(buyerId: string): Promise<unknown> {
    return this.prisma.auctionAward.findMany({
      where: { order: { buyerId } },
      take: 50,
      orderBy: { expiresAt: 'desc' },
      include: { order: true, auction: { select: { id: true, title: true } } },
    });
  }

  /**
   * Quotes shipping outside the transaction and atomically consumes the deposit plus the balance due.
   * @param awardId Offer identifier.
   * @param buyerId Authenticated winner.
   * @param address Validated delivery destination.
   * @returns Paid order, or the same paid order on an identical retry.
   * @throws ForbiddenException for another buyer's offer.
   * @throws BadRequestException for expired offers or insufficient funds.
   */
  async checkout(awardId: string, buyerId: string, address: ShippingAddressDto): Promise<Order> {
    const offer = await this.prisma.auctionAward.findUnique({
      where: { id: awardId },
      include: { order: { include: { items: { include: { product: true } } } } },
    });
    if (!offer) throw new NotFoundException('Không tìm thấy quyền mua đấu giá.');
    if (offer.order.buyerId !== buyerId)
      throw new ForbiddenException('Đây không phải quyền mua của bạn.');
    if (offer.status === 'PAID') return offer.order;
    if (offer.status !== 'AWAITING_CHECKOUT' || offer.expiresAt.getTime() <= Date.now())
      throw new BadRequestException('Quyền mua đã hết hạn.');
    const quote = await this.shipping.quote(
      offer.order.sellerId,
      address,
      offer.order.items.map(({ product, unitPrice }) => ({
        name: product.title,
        quantity: 1,
        price: Number(unitPrice),
        weight: product.weightGrams,
        length: product.lengthCm,
        width: product.widthCm,
        height: product.heightCm,
      })),
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${offer.auctionId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${offer.orderId} FOR UPDATE`;
      const current = await tx.auctionAward.findUniqueOrThrow({ where: { id: awardId } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: offer.orderId } });
      if (current.status === 'PAID') return order;
      if (
        current.status !== 'AWAITING_CHECKOUT' ||
        current.expiresAt.getTime() <= Date.now() ||
        order.status !== 'PENDING_PAYMENT'
      )
        throw new BadRequestException('Quyền mua không còn chờ thanh toán.');
      const total = order.subtotal.add(quote.fee.total);
      const due = total.sub(current.depositAmount);
      const wallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      if (!wallet || due.isNegative())
        throw new BadRequestException('Không tìm thấy ví hoặc tiền cọc không hợp lệ.');
      const debit = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: { gte: due },
          lockedBalance: { gte: current.depositAmount },
        },
        data: { balance: { decrement: due }, lockedBalance: { decrement: current.depositAmount } },
      });
      if (debit.count !== 1)
        throw new BadRequestException('Số dư khả dụng hoặc tiền cọc không đủ.');
      const paid = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          totalAmount: total,
          shippingFee: quote.fee.total,
          shippingAddressSnapshot: {
            ...address,
            ghn: {
              origin: quote.origin,
              parcel: quote.parcel,
              request: quote.request,
              fee: quote.fee,
              quotedAt: new Date().toISOString(),
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'WALLET',
          amount: total,
          status: 'SUCCESS',
          transactionCode: `AUCTION:${awardId}`,
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: total,
          type: 'ORDER_PAYMENT',
          referenceId: order.id,
          description: 'Thanh toán đấu giá bằng tiền cọc và phần còn thiếu',
        },
      });
      await this.stock.commit(tx, order.id);
      await this.escrow.hold(tx, paid);
      await tx.auctionAward.update({
        where: { id: awardId },
        data: { status: 'PAID', completedAt: new Date() },
      });
      await tx.auction.update({ where: { id: offer.auctionId }, data: { status: 'SETTLED' } });
      return paid;
    });
  }

  /**
   * Expires an unpaid offer once, refunds its locked deposit, and offers the lot to the next distinct bidder.
   * @param awardId Durable offer identifier.
   * @param decliningBuyer Optional authenticated buyer explicitly declining their own offer.
   * @returns Completion after expiry or an idempotent no-op.
   */
  async expire(awardId: string, decliningBuyer?: string): Promise<void> {
    const offer = await this.prisma.auctionAward.findUnique({ where: { id: awardId } });
    if (!offer) throw new NotFoundException('Không tìm thấy quyền mua.');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${offer.auctionId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${offer.orderId} FOR UPDATE`;
      const current = await tx.auctionAward.findUniqueOrThrow({
        where: { id: awardId },
        include: { order: true },
      });
      if (decliningBuyer && current.order.buyerId !== decliningBuyer)
        throw new ForbiddenException('Không được từ chối quyền mua của người khác.');
      if (
        current.status !== 'AWAITING_CHECKOUT' ||
        (!decliningBuyer && current.expiresAt.getTime() > Date.now())
      )
        return;
      if (current.order.status !== 'PENDING_PAYMENT')
        throw new BadRequestException('Đơn đấu giá không ở trạng thái chờ thanh toán.');
      if (current.depositAmount.gt(0)) {
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: { userId: current.order.buyerId },
        });
        const refunded = await tx.wallet.updateMany({
          where: { id: wallet.id, lockedBalance: { gte: current.depositAmount } },
          data: {
            lockedBalance: { decrement: current.depositAmount },
            balance: { increment: current.depositAmount },
          },
        });
        if (refunded.count !== 1)
          throw new BadRequestException('Tiền cọc cần được đối soát trước khi hết hạn.');
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: current.depositAmount,
            type: 'AUCTION_BID_REFUND',
            referenceId: current.id,
            description: 'Hoàn tiền cọc quyền mua đấu giá hết hạn',
          },
        });
        await this.reputation.adjustScore(
          {
            userId: current.order.buyerId,
            deltaPoints: -10,
            penaltyType: 'AUCTION_DEFAULT',
            referenceId: current.id,
            reason: 'Không hoàn tất thanh toán đấu giá trong thời hạn',
            skipNotification: true,
          },
          tx,
        );
      }
      await tx.auctionAward.update({
        where: { id: awardId },
        data: { status: 'EXPIRED', completedAt: new Date() },
      });
      await tx.order.update({
        where: { id: current.orderId },
        data: { status: 'CANCELLED', cancellationActor: 'SYSTEM' },
      });
      await tx.bid.update({ where: { id: current.bidId }, data: { status: 'REJECTED' } });
      const auction = await tx.auction.findUniqueOrThrow({ where: { id: current.auctionId } });
      const offered = await tx.auctionAward.findMany({
        where: { auctionId: auction.id },
        include: { order: { select: { buyerId: true } } },
      });
      const next = await tx.bid.findFirst({
        where: {
          auctionId: auction.id,
          status: 'SUPERSEDED',
          bidderId: { notIn: offered.map((row) => row.order.buyerId) },
          bidAmount: { gte: auction.reservePrice ?? auction.startingPrice },
          bidder: { trustLevel: { not: 'SUSPENDED' } },
        },
        orderBy: [{ bidAmount: 'desc' }, { placedAt: 'asc' }],
      });
      if (next && auction.productId && auction.sellerId) {
        await tx.bid.update({ where: { id: next.id }, data: { status: 'WINNING' } });
        await this.createAward(tx, {
          auctionId: auction.id,
          bidId: next.id,
          buyerId: next.bidderId,
          sellerId: auction.sellerId,
          productId: auction.productId,
          amount: next.bidAmount,
          depositAmount: new Prisma.Decimal(0),
          stockReference: current.orderId,
        });
        await tx.auction.update({
          where: { id: auction.id },
          data: { currentHighestBidderId: next.bidderId, currentHighestBid: next.bidAmount },
        });
      } else {
        await this.stock.release(tx, current.orderId);
        await tx.auction.update({ where: { id: auction.id }, data: { status: 'FAILED' } });
      }
      await tx.eventLog.create({
        data: { eventName: 'AuctionPaymentTimeout', payload: { auctionId: auction.id, awardId } },
      });
    });
  }
}
