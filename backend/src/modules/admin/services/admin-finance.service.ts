import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma, Wallet, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  DepositAdminWalletInput,
  QueryAdminWalletTransactionsInput,
  QueryPlatformUserWalletTransactionsInput,
} from '../dtos/admin-wallet.dto';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { AdminAnalyticsService } from './admin-analytics.service';

@Injectable()
export class AdminFinanceService {
  private readonly logger = new Logger(AdminFinanceService.name);
  private readonly fallbackAnalytics: AdminAnalyticsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly treasury: TreasuryService,
    @Optional() private readonly auditLog?: AuditLogService,
    @Optional() private readonly analyticsService?: AdminAnalyticsService,
  ) {
    this.fallbackAnalytics = analyticsService ?? new AdminAnalyticsService(prisma);
  }

  /**
   * Retrieves or automatically initializes the primary platform administrator wallet.
   *
   * @param txClient - Optional transactional client instance
   * @returns Primary admin Wallet entity
   * @throws NotFoundException when no administrator user exists
   */
  getOrCreatePrimaryAdminWallet(txClient?: Prisma.TransactionClient): Promise<Wallet> {
    return this.treasury.getOrCreatePrimaryAdminWallet(txClient);
  }

  /**
   * Retrieves administrator wallet balances and aggregate platform commission revenue.
   *
   * @param adminId - Unique identifier of the administrator
   * @returns Wallet balances, commission aggregates, and transaction counts
   */
  async getAdminWallet(adminId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: adminId },
    });

    if (!wallet) {
      wallet = await this.getOrCreatePrimaryAdminWallet();
    }

    const platformFeeAgg = await this.prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        type: WalletTransactionType.PLATFORM_FEE,
        status: WalletTransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
    });

    const depositAgg = await this.prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        status: WalletTransactionStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
    });

    const totalTransactions = await this.prisma.walletTransaction.count({
      where: { walletId: wallet.id },
    });

    const totalPlatformFeeCollected = Number(platformFeeAgg._sum.amount || 0);
    const totalDeposited = Number(depositAgg._sum.amount || 0);

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
      currency: wallet.currency,
      totalPlatformFeeCollected,
      totalDeposited,
      totalTransactions,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Retrieves paginated administrator wallet transactions with date range and search filters.
   *
   * @param adminId - Unique identifier of the administrator
   * @param query - Query filter and pagination parameters
   * @returns Paginated wallet transactions with associated order details
   */
  async getAdminWalletTransactions(adminId: string, query: QueryAdminWalletTransactionsInput) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: adminId },
    });

    if (!wallet) {
      wallet = await this.getOrCreatePrimaryAdminWallet();
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.WalletTransactionWhereInput = {
      walletId: wallet.id,
    };

    if (query.type) {
      where.type = query.type;
    }

    const createdAtFilter = this.buildDateRangeFilter(query.startDate, query.endDate);
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { referenceId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, transactions] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const orderIds = transactions
      .map((tx) => tx.referenceId)
      .filter((id): id is string => Boolean(id && id.trim()));

    const orders =
      orderIds.length > 0
        ? await this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
              id: true,
              subtotal: true,
              shippingFee: true,
              totalAmount: true,
              buyer: {
                select: { id: true, fullName: true, email: true },
              },
              seller: {
                select: { id: true, fullName: true, email: true },
              },
              escrowRecord: {
                select: { platformFee: true, sellerPayout: true, status: true },
              },
              shipment: {
                select: { carrier: true, waybillCode: true, shippingFee: true },
              },
            },
          })
        : [];

    const orderMap = new Map(orders.map((o) => [o.id, o]));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: transactions.map((tx) => {
        const order = tx.referenceId ? orderMap.get(tx.referenceId) : null;
        return {
          id: tx.id,
          walletId: tx.walletId,
          amount: Number(tx.amount),
          type: tx.type,
          status: tx.status,
          referenceId: tx.referenceId,
          description: tx.description,
          createdAt: tx.createdAt,
          orderDetails: order
            ? {
                orderId: order.id,
                buyerName: order.buyer?.fullName,
                buyerEmail: order.buyer?.email,
                shopName: order.seller?.fullName,
                sellerEmail: order.seller?.email,
                subtotal: Number(order.subtotal),
                shippingFee: Number(order.shippingFee),
                totalAmount: Number(order.totalAmount),
                platformFee: Number(order.escrowRecord?.platformFee ?? 0),
                sellerPayout: Number(order.escrowRecord?.sellerPayout ?? 0),
                waybillCode: order.shipment?.waybillCode ?? undefined,
                carrier: order.shipment?.carrier ?? undefined,
              }
            : null,
        };
      }),
    };
  }

  /**
   * Retrieves paginated wallet transactions across all platform users (Buyers & Sellers).
   *
   * @param query - Filters for type, status, role, userId, date range, and keyword search
   * @returns Paginated user wallet transactions with account details
   */
  async getPlatformUserWalletTransactions(query: QueryPlatformUserWalletTransactionsInput) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where = this.buildUserWalletTransactionWhere(query);

    const [total, transactions] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: {
            select: {
              id: true,
              balance: true,
              lockedBalance: true,
              currency: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phoneNumber: true,
                  role: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: transactions.map((tx) => ({
        id: tx.id,
        walletId: tx.walletId,
        amount: Number(tx.amount),
        type: tx.type,
        status: tx.status,
        referenceId: tx.referenceId,
        description: tx.description,
        createdAt: tx.createdAt,
        user: tx.wallet?.user
          ? {
              id: tx.wallet.user.id,
              fullName: tx.wallet.user.fullName,
              email: tx.wallet.user.email,
              phoneNumber: tx.wallet.user.phoneNumber,
              role: tx.wallet.user.role,
              walletBalance: Number(tx.wallet.balance),
              walletLockedBalance: Number(tx.wallet.lockedBalance),
              currency: tx.wallet.currency,
            }
          : null,
      })),
    };
  }

  private buildDateRangeFilter(
    startDate?: string,
    endDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }

    const filter: Prisma.DateTimeFilter = {};
    if (startDate) {
      filter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return filter;
  }

  private buildUserWalletTransactionWhere(
    query: QueryPlatformUserWalletTransactionsInput,
  ): Prisma.WalletTransactionWhereInput {
    const where: Prisma.WalletTransactionWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const createdAtFilter = this.buildDateRangeFilter(query.startDate, query.endDate);
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    if (query.userId || query.role) {
      where.wallet = {
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.role ? { user: { role: query.role } } : {}),
      };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { referenceId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { wallet: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
        { wallet: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    return where;
  }

  /**
   * Deposits funds into the administrator platform wallet with transactional audit logging.
   *
   * @param adminId - Unique identifier of the administrator
   * @param dto - Deposit payload including amount and optional description
   * @returns Deposit confirmation, updated balance, and transaction record
   * @throws BadRequestException when amount is non-positive
   */
  async depositToAdminWallet(adminId: string, dto: DepositAdminWalletInput) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Số tiền nạp vào ví phải lớn hơn 0 đồng.');
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: adminId },
    });

    if (!wallet) {
      wallet = await this.getOrCreatePrimaryAdminWallet();
    }

    const depositAmount = new Prisma.Decimal(dto.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: depositAmount },
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: depositAmount,
          type: WalletTransactionType.DEPOSIT,
          status: WalletTransactionStatus.SUCCESS,
          description:
            dto.description?.trim() || `Admin (${adminId.slice(0, 8)}) nạp tiền vào ví hệ thống`,
        },
      });

      await this.auditLog?.record(
        {
          eventName: 'admin.wallet.deposited',
          operatorId: adminId,
          payload: {
            walletId: wallet.id,
            transactionId: transaction.id,
            amount: Number(dto.amount),
            balanceAfter: Number(updatedWallet.balance),
            description: transaction.description,
          },
        },
        tx,
      );

      return { updatedWallet, transaction };
    });

    this.logger.log(
      `Admin (${adminId}) đã nạp ${Number(dto.amount).toLocaleString('vi-VN')} VND vào ví. Số dư mới: ${Number(result.updatedWallet.balance).toLocaleString('vi-VN')} VND`,
    );

    return {
      success: true,
      message: `Nạp thành công ${Number(dto.amount).toLocaleString('vi-VN')} VND vào ví hệ thống.`,
      wallet: {
        id: result.updatedWallet.id,
        balance: Number(result.updatedWallet.balance),
        currency: result.updatedWallet.currency,
      },
      transaction: {
        id: result.transaction.id,
        amount: Number(result.transaction.amount),
        type: result.transaction.type,
        status: result.transaction.status,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt,
      },
    };
  }

  /**
   * Aggregates platform operational analytics for Admin Overview dashboard charts.
   */
  async getDashboardAnalytics() {
    return (this.analyticsService ?? this.fallbackAnalytics).getDashboardAnalytics();
  }
}
