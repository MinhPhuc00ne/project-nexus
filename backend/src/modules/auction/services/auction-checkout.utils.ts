import {
  AuctionAwardStatus,
  AuctionAwardTier,
  AuctionItemStatus,
  AuctionStatus,
  NotificationChannel,
  NotificationType,
  Order,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { GhnShippingQuote } from '../../fulfillment/services/ghn-shipping.service';
import { CheckoutAuctionAwardInput } from '../dtos/checkout-auction-award.dto';

export type { CheckoutAuctionAwardInput };

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

export const BUYER_ACTIVE_AWARD_STATUSES: AuctionAwardStatus[] = [
  AuctionAwardStatus.AWAITING_ACCEPTANCE,
  AuctionAwardStatus.AWAITING_DEPOSIT,
  AuctionAwardStatus.AWAITING_CHECKOUT,
  AuctionAwardStatus.PAID,
];

export const LOT_TERMINAL_STATUSES = new Set<AuctionStatus>([
  AuctionStatus.ENDED,
  AuctionStatus.SETTLED,
  AuctionStatus.CANCELLED,
  AuctionStatus.FAILED,
]);

export const AUCTION_CHECKOUT_DURATION_MS = 24 * 60 * 60 * 1000;
export const AUCTION_DEFAULT_REPUTATION_PENALTY = -10;
export const DEPOSIT_RATIO = 0.3;

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

export function lotLabel(lotNumber: number | null | undefined, title: string): string {
  return lotNumber ? `Lô #${lotNumber}: ${title}` : title;
}

export async function syncAuctionCompletionStatusTx(
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

export async function notifyDeclinedOfferTx(
  tx: Prisma.TransactionClient,
  params: {
    buyerId: string;
    sellerId: string | null;
    adminId: string | null;
    auctionId: string;
    auctionItemId: string | null;
    itemLabel: string;
  },
): Promise<void> {
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

  await notifyUsersTx(tx, [params.sellerId, params.adminId], {
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

export async function notifyUsersTx(
  tx: Prisma.TransactionClient,
  userIds: Array<string | null | undefined>,
  payload: {
    title: string;
    content: string;
    auctionId?: string;
    targetUrl?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
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

export async function createPendingAuctionOrder(
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
