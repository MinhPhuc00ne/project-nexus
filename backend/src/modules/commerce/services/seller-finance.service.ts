import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateWithdrawalDto } from '../dtos/create-withdrawal.dto';
import { QueryFinanceDto } from '../dtos/query-finance.dto';
import { WithdrawalService } from './withdrawal.service';

@Injectable()
export class SellerFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

    const platformFeeRate =
      Number(this.configService.get<number>('PLATFORM_FEE_PERCENTAGE')) || 7.0;

    const orders = await this.prisma.order.findMany({
      where: { sellerId },
      select: {
        id: true,
        totalAmount: true,
        subtotal: true,
        shippingFee: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGrossRevenue = 0;
    let completedRevenue = 0;
    let pendingEscrowRevenue = 0;
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const monthlyMap = new Map<string, { month: string; gross: number; ordersCount: number }>();

    for (const order of orders) {
      const amount = Number(order.totalAmount);
      const monthKey = order.createdAt.toISOString().substring(0, 7);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, gross: 0, ordersCount: 0 });
      }

      if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CONFIRMED) {
        completedRevenue += amount;
        totalGrossRevenue += amount;
        completedOrdersCount++;
        const m = monthlyMap.get(monthKey)!;
        m.gross += amount;
        m.ordersCount++;
      } else if (
        order.status === OrderStatus.PAID ||
        order.status === OrderStatus.PREPARING ||
        order.status === OrderStatus.SHIPPING
      ) {
        pendingEscrowRevenue += amount;
        totalGrossRevenue += amount;
        pendingOrdersCount++;
        const m = monthlyMap.get(monthKey)!;
        m.gross += amount;
        m.ordersCount++;
      } else if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
        cancelledOrdersCount++;
      }
    }

    const estimatedPlatformFee = (totalGrossRevenue * platformFeeRate) / 100;
    const netRevenue = Math.max(0, totalGrossRevenue - estimatedPlatformFee);

    const monthlyBreakdown = Array.from(monthlyMap.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    return {
      wallet: {
        balance: Number(wallet.balance),
        lockedBalance: Number(wallet.lockedBalance),
        currency: wallet.currency,
        availableToWithdraw: Number(wallet.balance),
      },
      metrics: {
        totalOrders: orders.length,
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
  async createWithdrawal(sellerId: string, dto: CreateWithdrawalDto) {
    return this.withdrawalService.createWithdrawal(sellerId, dto, { requireSellerRole: true });
  }

  /**
   * Retrieves paginated financial transaction ledger entries for a merchant wallet.
   *
   * @param sellerId - Unique identifier of the seller
   * @param query - Filter options by transaction type and status
   * @returns Paginated wallet transactions
   */
  async getTransactions(sellerId: string, query: QueryFinanceDto) {
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
