/**
 * Demo orders covering every state of the order machine, with the escrow,
 * payment, shipment, after-sales and dispute rows that belong to each.
 *
 * Orders are spread across the last thirty days so the seller and admin revenue
 * charts have a real shape, with a few placed in the last hour so the "new
 * orders" panels are not empty.
 */
import {
  AfterSalesKind,
  AfterSalesStatus,
  CarrierName,
  DisputeStatus,
  EscrowStatus,
  OrderCancellationActor,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ShipmentStatus,
  WalletTransactionType,
  WalletType,
} from '@prisma/client';
import { DemoClock, SeededRandom } from './random';
import type { DemoPeople } from './01-users-shops';
import type { DemoCatalog, DemoProduct } from './02-catalog-inventory';

export interface DemoOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  productIds: string[];
}

/** How many orders to create in each state, and how far back to place them. */
const PLAN: Array<{ status: OrderStatus; count: number; minDaysAgo: number; maxDaysAgo: number }> =
  [
    { status: OrderStatus.PENDING_PAYMENT, count: 3, minDaysAgo: 0, maxDaysAgo: 1 },
    { status: OrderStatus.PAID, count: 4, minDaysAgo: 0, maxDaysAgo: 3 },
    { status: OrderStatus.PREPARING, count: 3, minDaysAgo: 1, maxDaysAgo: 5 },
    { status: OrderStatus.SHIPPING, count: 4, minDaysAgo: 2, maxDaysAgo: 8 },
    { status: OrderStatus.DELIVERED, count: 4, minDaysAgo: 4, maxDaysAgo: 14 },
    { status: OrderStatus.CONFIRMED, count: 8, minDaysAgo: 5, maxDaysAgo: 30 },
    { status: OrderStatus.CANCELLED, count: 3, minDaysAgo: 2, maxDaysAgo: 20 },
    { status: OrderStatus.REFUNDED, count: 2, minDaysAgo: 6, maxDaysAgo: 25 },
  ];

/** Statuses where the platform is holding the buyer's money. */
const ESCROW_HELD: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
];

/** Statuses where a shipment exists, and what state it is in. */
const SHIPMENT_STATE: Partial<Record<OrderStatus, ShipmentStatus>> = {
  [OrderStatus.PREPARING]: ShipmentStatus.CREATED,
  [OrderStatus.SHIPPING]: ShipmentStatus.IN_TRANSIT,
  [OrderStatus.DELIVERED]: ShipmentStatus.DELIVERED,
  [OrderStatus.CONFIRMED]: ShipmentStatus.DELIVERED,
  [OrderStatus.REFUNDED]: ShipmentStatus.RETURNED,
};

function addressSnapshot(fullName: string, random: SeededRandom): Prisma.InputJsonObject {
  const place = random.pick([
    { city: 'Hà Nội', district: 'Hoàn Kiếm', ward: 'Hàng Bạc', street: '48 Hàng Bạc' },
    { city: 'Hồ Chí Minh', district: 'Quận 1', ward: 'Bến Nghé', street: '91 Đồng Khởi' },
    { city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thạch Thang', street: '25 Bạch Đằng' },
  ]);
  return {
    recipientName: fullName,
    phone: `09${String(10_000_000 + random.int(0, 89_999_999)).slice(0, 8)}`,
    ...place,
    country: 'VN',
  };
}

/**
 * Creates the demo orders and everything attached to them.
 *
 * @param prisma - A connected client.
 * @param clock - The run's clock.
 * @param random - The run's generator.
 * @param people - Buyers and sellers to trade between.
 * @param catalog - The products to sell.
 * @returns The orders, for the review and chat module to reference.
 */
export async function seedOrdersEscrowAndDisputes(
  prisma: Prisma.TransactionClient,
  clock: DemoClock,
  random: SeededRandom,
  people: DemoPeople,
  catalog: DemoCatalog,
): Promise<DemoOrder[]> {
  const platformFeePercentage = 7;
  const escrowWallet = await prisma.wallet.findFirst({
    where: { type: WalletType.ESCROW_LIABILITY, userId: null },
    select: { id: true },
  });
  const revenueWallet = await prisma.wallet.findFirst({
    where: { type: WalletType.PLATFORM_REVENUE, userId: null },
    select: { id: true },
  });
  if (!escrowWallet || !revenueWallet) {
    throw new Error('Platform wallets are missing; run npm run db:bootstrap first');
  }

  const orders: DemoOrder[] = [];

  for (const step of PLAN) {
    for (let index = 0; index < step.count; index += 1) {
      const buyer = random.pick(people.buyers);
      // One seller per order: the checkout splits a multi-shop basket into an
      // order per shop, so an order always has exactly one seller.
      const seller = random.pick(people.sellers);
      const sellerProducts = catalog.products.filter(
        (product: DemoProduct) => product.sellerId === seller.id,
      );
      if (sellerProducts.length === 0) continue;

      const lines = random.sample(
        sellerProducts,
        random.int(1, Math.min(3, sellerProducts.length)),
      );
      const createdAt = clock.daysAgo(random.int(step.minDaysAgo, step.maxDaysAgo));

      const items = lines.map((product) => {
        const quantity = random.int(1, 2);
        const unitPrice = product.salePrice ?? product.basePrice;
        return {
          productId: product.id,
          titleSnapshot: product.title,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
        };
      });

      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const shippingFee = random.money(20_000, 60_000, 5_000);
      const totalAmount = subtotal + shippingFee;

      const order = await prisma.order.create({
        data: {
          buyerId: buyer.id,
          sellerId: seller.id,
          subtotal,
          shippingFee,
          totalAmount,
          status: step.status,
          shippingAddressSnapshot: addressSnapshot(buyer.fullName, random),
          cancellationActor:
            step.status === OrderStatus.CANCELLED
              ? random.pick([
                  OrderCancellationActor.BUYER,
                  OrderCancellationActor.SELLER,
                  OrderCancellationActor.SYSTEM,
                ])
              : null,
          createdAt,
          updatedAt: createdAt,
          items: { create: items },
        },
        select: { id: true },
      });

      // Payment: a pending order has an unpaid attempt, everything past it is paid.
      if (step.status !== OrderStatus.PENDING_PAYMENT) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: random.pick([
              PaymentProvider.PAYOS,
              PaymentProvider.WALLET,
              PaymentProvider.COD,
            ]),
            amount: totalAmount,
            status: PaymentStatus.SUCCESS,
            transactionCode: `DEMO-${random.int(100_000, 999_999)}`,
            createdAt,
            updatedAt: createdAt,
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.PAYOS,
            amount: totalAmount,
            status: PaymentStatus.PENDING,
            transactionCode: `DEMO-${random.int(100_000, 999_999)}`,
            createdAt,
            updatedAt: createdAt,
          },
        });
      }

      // Escrow: held while the order is in flight, disbursed once confirmed,
      // refunded when the money went back.
      const platformFee = Math.round((subtotal * platformFeePercentage) / 100);
      const sellerPayout = subtotal - platformFee;
      if (step.status !== OrderStatus.PENDING_PAYMENT && step.status !== OrderStatus.CANCELLED) {
        const escrowStatus = ESCROW_HELD.includes(step.status)
          ? EscrowStatus.HELD
          : step.status === OrderStatus.REFUNDED
            ? EscrowStatus.REFUNDED
            : EscrowStatus.DISBURSED;

        await prisma.escrowRecord.create({
          data: {
            orderId: order.id,
            totalAmount,
            platformFee,
            sellerPayout,
            status: escrowStatus,
            heldAt: createdAt,
            disbursedAt:
              escrowStatus === EscrowStatus.DISBURSED
                ? new Date(createdAt.getTime() + 5 * 86_400_000)
                : null,
            refundedAt:
              escrowStatus === EscrowStatus.REFUNDED
                ? new Date(createdAt.getTime() + 3 * 86_400_000)
                : null,
          },
        });

        // The money moves between the platform's own ledgers, never into an
        // administrator's personal wallet.
        if (escrowStatus === EscrowStatus.HELD) {
          await prisma.walletTransaction.create({
            data: {
              walletId: escrowWallet.id,
              amount: totalAmount,
              type: WalletTransactionType.ESCROW_LOCK,
              referenceId: order.id,
              description: `Giữ tiền đơn ${order.id}`,
              createdAt,
            },
          });
        } else if (escrowStatus === EscrowStatus.DISBURSED) {
          await prisma.walletTransaction.create({
            data: {
              walletId: revenueWallet.id,
              amount: platformFee,
              type: WalletTransactionType.PLATFORM_FEE,
              referenceId: order.id,
              description: `Phí sàn đơn ${order.id}`,
              createdAt: new Date(createdAt.getTime() + 5 * 86_400_000),
            },
          });
        }
      }

      // Shipment.
      const shipmentStatus = SHIPMENT_STATE[step.status];
      if (shipmentStatus) {
        await prisma.shipment.create({
          data: {
            orderId: order.id,
            carrier: CarrierName.GHN,
            shippingFee,
            chargeableWeight: random.int(500, 9000) / 100,
            status: shipmentStatus,
            waybillCode: `GHN${random.int(10_000_000, 99_999_999)}`,
            trackingNumber: `GHN${random.int(10_000_000, 99_999_999)}`,
            createdAt: new Date(createdAt.getTime() + 3_600_000),
            updatedAt: new Date(createdAt.getTime() + 7_200_000),
          },
        });
      }

      // After-sales and disputes on a slice of the finished orders, so the
      // staff queues have work in several states rather than being empty.
      if (step.status === OrderStatus.REFUNDED) {
        await prisma.afterSalesRequest.create({
          data: {
            orderId: order.id,
            kind: AfterSalesKind.RETURN,
            status: AfterSalesStatus.COMPLETED,
            requestedBy: buyer.id,
            reason: 'Hiện vật không đúng mô tả, đề nghị hoàn tiền.',
            refundToWallet: true,
            reviewedBy: random.pick(people.staff).id,
            decisionReason: 'Chấp nhận hoàn tiền sau khi kiểm tra ảnh đối chiếu.',
            receivedAt: new Date(createdAt.getTime() + 2 * 86_400_000),
            createdAt: new Date(createdAt.getTime() + 86_400_000),
            updatedAt: new Date(createdAt.getTime() + 3 * 86_400_000),
          },
        });
      } else if (step.status === OrderStatus.DELIVERED && random.chance(0.35)) {
        await prisma.afterSalesRequest.create({
          data: {
            orderId: order.id,
            kind: AfterSalesKind.RETURN,
            status: random.pick([AfterSalesStatus.REQUESTED, AfterSalesStatus.APPROVING]),
            requestedBy: buyer.id,
            reason: 'Sản phẩm có vết xước không thể hiện trong ảnh.',
            refundToWallet: true,
            createdAt: new Date(createdAt.getTime() + 43_200_000),
            updatedAt: new Date(createdAt.getTime() + 43_200_000),
          },
        });
      } else if (step.status === OrderStatus.SHIPPING && random.chance(0.3)) {
        await prisma.dispute.create({
          data: {
            orderId: order.id,
            openedByUserId: buyer.id,
            reason: 'Đơn hàng quá thời hạn giao mà chưa có cập nhật từ đơn vị vận chuyển.',
            status: random.pick([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]),
            createdAt: new Date(createdAt.getTime() + 86_400_000),
            updatedAt: new Date(createdAt.getTime() + 86_400_000),
          },
        });
      } else if (step.status === OrderStatus.CONFIRMED && random.chance(0.15)) {
        const resolvedAt = new Date(createdAt.getTime() + 4 * 86_400_000);
        await prisma.dispute.create({
          data: {
            orderId: order.id,
            openedByUserId: buyer.id,
            reason: 'Giao thiếu một hiện vật trong lô.',
            status: random.pick([
              DisputeStatus.RESOLVED_BUYER_FAVOR,
              DisputeStatus.RESOLVED_SELLER_FAVOR,
            ]),
            resolutionNotes: 'Đã đối chiếu ảnh đóng gói và biên nhận của đơn vị vận chuyển.',
            resolvedByUserId: random.pick(people.staff).id,
            resolvedAt,
            createdAt: new Date(createdAt.getTime() + 2 * 86_400_000),
            updatedAt: resolvedAt,
          },
        });
      }

      orders.push({
        id: order.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        status: step.status,
        totalAmount,
        createdAt,
        productIds: items.map((item) => item.productId),
      });
    }
  }

  return orders;
}
