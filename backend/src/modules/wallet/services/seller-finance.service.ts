import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { PlatformSettingsService } from '../../../core/settings/platform-settings.service';
import { CreateWithdrawalInput } from '../dtos/create-withdrawal.dto';
import { QueryFinanceInput } from '../dtos/query-finance.dto';
import { WithdrawalService } from './withdrawal.service';

@Injectable()
export class SellerFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  /**
   * Retrieves merchant revenue aggregates, wallet balances, and monthly financial metrics.
   *
   * @param sellerId - Unique identifier of the seller
   * @returns Revenue overview including net earnings, platform commissions, and historical charts
   * @throws NotFoundException when seller does not exist
   * @throws ForbiddenException when user is not a merchant or administrator
   */
  async getRevenueOverview(sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        wallet: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Không tìm thấy tài khoản người bán.');
    }

    if (seller.role !== Role.SELLER && seller.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ tài khoản Người bán (Seller) mới có quyền xem doanh thu.');
    }

    let wallet = seller.wallet;
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId: sellerId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
    }

    // Read from platform settings, not from the environment. Escrow charges
    // the stored rate, so a seller shown an environment value was being
    // quoted a fee the platform does not actually take.
    const platformFeeRate = await this.platformSettings.get('platformFeePercentage');

    // Grouped in the database rather than read into memory. A seller with ten
    // thousand orders had every one of them loaded and summed in JavaScript on
    // each page view.
    const byStatus = await this.prisma.order.groupBy({
      by: ['status'],
      where: { sellerId },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });

    const monthlyRows = await this.prisma.$queryRaw<
      Array<{ month: string; gross: string | number; orders_count: bigint | number }>
    >(Prisma.sql`
      SELECT to_char(date_trunc('month', "created_at"), 'YYYY-MM') AS month,
             COALESCE(SUM("total_amount"), 0) AS gross,
             COUNT(*) AS orders_count
      FROM "orders"
      WHERE "seller_id" = ${sellerId}
        AND "status" IN (
          'DELIVERED'::"OrderStatus", 'CONFIRMED'::"OrderStatus",
          'PAID'::"OrderStatus", 'PREPARING'::"OrderStatus", 'SHIPPING'::"OrderStatus"
        )
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6
    `);

    /** Total for one status, or zero when the seller has no such orders. */
    const sumOf = (...statuses: OrderStatus[]): number =>
      byStatus
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + Number(row._sum.totalAmount ?? 0), 0);

    /** Order count for one status. */
    const countOf = (...statuses: OrderStatus[]): number =>
      byStatus
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + row._count._all, 0);

    const completedRevenue = sumOf(OrderStatus.DELIVERED, OrderStatus.CONFIRMED);
    const pendingEscrowRevenue = sumOf(
      OrderStatus.PAID,
      OrderStatus.PREPARING,
      OrderStatus.SHIPPING,
    );
    const totalGrossRevenue = completedRevenue + pendingEscrowRevenue;

    const completedOrdersCount = countOf(OrderStatus.DELIVERED, OrderStatus.CONFIRMED);
    const pendingOrdersCount = countOf(
      OrderStatus.PAID,
      OrderStatus.PREPARING,
      OrderStatus.SHIPPING,
    );
    const cancelledOrdersCount = countOf(OrderStatus.CANCELLED, OrderStatus.REFUNDED);
    const totalOrders = byStatus.reduce((total, row) => total + row._count._all, 0);

    const monthlyBreakdown = monthlyRows.map((row) => ({
      month: row.month,
      gross: Number(row.gross),
      ordersCount: Number(row.orders_count),
    }));
    const estimatedPlatformFee = (totalGrossRevenue * platformFeeRate) / 100;
    const netRevenue = Math.max(0, totalGrossRevenue - estimatedPlatformFee);

    return {
      wallet: {
        balance: Number(wallet.balance),
        lockedBalance: Number(wallet.lockedBalance),
        currency: wallet.currency,
        availableToWithdraw: Number(wallet.balance),
      },
      metrics: {
        totalOrders,
        completedOrdersCount,
        pendingOrdersCount,
        cancelledOrdersCount,
        totalGrossRevenue,
        completedRevenue,
        pendingEscrowRevenue,
        platformFeeRatePercentage: platformFeeRate,
        estimatedPlatformFee,
        netRevenue,
      },
      monthlyBreakdown,
    };
  }

  /**
   * Creates a seller withdrawal request, locking funds in escrow pending administrative disbursement.
   *
   * @param sellerId - Unique identifier of the seller
   * @param dto - Withdrawal parameters including amount and banking credentials
   * @returns Created WithdrawalRequest entity and transaction reference
   */
  async createWithdrawal(sellerId: string, dto: CreateWithdrawalInput) {
    return this.withdrawalService.createWithdrawal(sellerId, dto, { requireSellerRole: true });
  }

  /**
   * Retrieves paginated financial transaction ledger entries for a merchant wallet.
   *
   * @param sellerId - Unique identifier of the seller
   * @param query - Filter options by transaction type and status
   * @returns Paginated wallet transactions
   */
  async getTransactions(sellerId: string, query: QueryFinanceInput) {
    return this.withdrawalService.getTransactions(sellerId, query);
  }

  /**
   * Retrieves paginated withdrawal requests submitted by a merchant.
   *
   * @param sellerId - Unique identifier of the seller
   * @param page - Target page index
   * @param limit - Page size limit
   * @returns Paginated withdrawal requests and review statuses
   */
  async getWithdrawals(sellerId: string, page = 1, limit = 10) {
    return this.withdrawalService.getWithdrawals(sellerId, page, limit);
  }
}
