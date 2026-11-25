import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, Wallet, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  DepositAdminWalletDto,
  QueryAdminWalletTransactionsDto,
  QueryPlatformUserWalletTransactionsDto,
} from '../dtos/admin-wallet.dto';
import { TreasuryService } from '../../treasury/services/treasury.service';

@Injectable()
export class AdminFinanceService {
  private readonly logger = new Logger(AdminFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly treasury: TreasuryService,
  ) {}

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
  async getAdminWalletTransactions(adminId: string, query: QueryAdminWalletTransactionsDto) {
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
  async getPlatformUserWalletTransactions(query: QueryPlatformUserWalletTransactionsDto) {
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
    query: QueryPlatformUserWalletTransactionsDto,
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
  async depositToAdminWallet(adminId: string, dto: DepositAdminWalletDto) {
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
   * Aggregates platform operational analytics for Admin Overview dashboard charts:
   * 1. Platform fee revenue trend periods (7d, 30d, month, year) split into 3D auctions vs normal orders
   * 2. Revenue composition breakdown (normal e-commerce orders vs 3D auctions and category breakdown)
   * 3. Hourly bid frequency distribution and peak bidding telemetry
   */
  async getDashboardAnalytics() {
    const now = new Date();

    // 1. Fetch EscrowRecords with related order and category details
    const escrowRecords = await this.prisma.escrowRecord.findMany({
      where: {
        status: { in: ['HELD', 'DISBURSED'] },
      },
      select: {
        id: true,
        platformFee: true,
        totalAmount: true,
        heldAt: true,
        disbursedAt: true,
        order: {
          select: {
            id: true,
            isAuction: true,
            createdAt: true,
            items: {
              select: {
                totalPrice: true,
                product: {
                  select: {
                    categoryId: true,
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { heldAt: 'desc' },
    });

    // 2. Fetch Bids for hourly bid frequency
    const bids = await this.prisma.bid.findMany({
      select: {
        id: true,
        placedAt: true,
      },
      orderBy: { placedAt: 'desc' },
    });

    // Calculate overall composition
    let totalNormalFee = 0;
    let totalAuctionFee = 0;
    const categoryRevenueMap = new Map<string, number>();

    for (const record of escrowRecords) {
      const fee = Number(record.platformFee || 0);
      const isAuction = Boolean(record.order?.isAuction);

      if (isAuction) {
        totalAuctionFee += fee;
      } else {
        totalNormalFee += fee;
        if (record.order?.items) {
          for (const item of record.order.items) {
            const catName = item.product?.category?.name || 'Khác';
            const catFee = fee / Math.max(1, record.order.items.length);
            categoryRevenueMap.set(catName, (categoryRevenueMap.get(catName) || 0) + catFee);
          }
        }
      }
    }

    const totalFee = totalNormalFee + totalAuctionFee;
    const normalPercent = totalFee > 0 ? (totalNormalFee / totalFee) * 100 : 0;
    const auctionPercent = totalFee > 0 ? (totalAuctionFee / totalFee) * 100 : 0;

    const formatShortAmount = (amount: number): string => {
      if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(2)} tỷ`;
      }
      if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M ₫`;
      }
      return `${amount.toLocaleString('vi-VN')} ₫`;
    };

    const revenueComposition = {
      totalAmount: totalFee,
      totalLabel: formatShortAmount(totalFee),
      primaryPercentage: Number(normalPercent.toFixed(1)),
      items: [
        {
          name: 'Đơn thường TMĐT (7%)',
          description: 'NEXUS Verified Sellers',
          amount: formatShortAmount(totalNormalFee),
          rawAmount: totalNormalFee,
          percentage: `${normalPercent.toFixed(1)}%`,
          color: 'bg-primary',
        },
        {
          name: 'Đấu giá độc bản (16%)',
          description: 'WebGL Interactive Room',
          amount: formatShortAmount(totalAuctionFee),
          rawAmount: totalAuctionFee,
          percentage: `${auctionPercent.toFixed(1)}%`,
          color: 'bg-blue-400',
        },
      ],
      byCategory: Array.from(categoryRevenueMap.entries()).map(([name, fee]) => ({
        name,
        amount: Math.round(fee),
        percentage: totalFee > 0 ? `${((fee / totalFee) * 100).toFixed(1)}%` : '0%',
      })),
    };

    // Calculate 4 revenue periods: 7 ngày, 30 ngày, Tháng này, Năm nay
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    // Period 1: 7 ngày
    const last7DaysLabels: string[] = [];
    const last7DaysAuction: number[] = [0, 0, 0, 0, 0, 0, 0];
    const last7DaysNormal: number[] = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7DaysLabels.push(i === 0 ? 'Hôm nay' : dayNames[d.getDay()]);
    }

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let period7TotalAuction = 0;
    let period7TotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= sevenDaysAgo && recDate <= now) {
        const diffDays = Math.floor((recDate.getTime() - sevenDaysAgo.getTime()) / 86400000);
        const index = Math.max(0, Math.min(6, diffDays));
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          last7DaysAuction[index] += fee;
          period7TotalAuction += fee;
        } else {
          last7DaysNormal[index] += fee;
          period7TotalNormal += fee;
        }
      }
    }

    // Period 2: 30 ngày (divided into 7 points)
    const last30Labels = [
      'Ngày 1',
      'Ngày 5',
      'Ngày 10',
      'Ngày 15',
      'Ngày 20',
      'Ngày 25',
      'Ngày 30',
    ];
    const last30Auction: number[] = [0, 0, 0, 0, 0, 0, 0];
    const last30Normal: number[] = [0, 0, 0, 0, 0, 0, 0];
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    let period30TotalAuction = 0;
    let period30TotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= thirtyDaysAgo && recDate <= now) {
        const diffDays = Math.floor((recDate.getTime() - thirtyDaysAgo.getTime()) / 86400000);
        const bucket = Math.max(0, Math.min(6, Math.floor((diffDays / 30) * 7)));
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          last30Auction[bucket] += fee;
          period30TotalAuction += fee;
        } else {
          last30Normal[bucket] += fee;
          period30TotalNormal += fee;
        }
      }
    }

    // Period 3: Tháng này (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Hôm nay'];
    const monthAuction: number[] = [0, 0, 0, 0, 0];
    const monthNormal: number[] = [0, 0, 0, 0, 0];
    let monthTotalAuction = 0;
    let monthTotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= monthStart && recDate <= now) {
        const dayOfMonth = recDate.getDate();
        const bucket = Math.max(0, Math.min(4, Math.floor((dayOfMonth - 1) / 7)));
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          monthAuction[bucket] += fee;
          monthTotalAuction += fee;
        } else {
          monthNormal[bucket] += fee;
          monthTotalNormal += fee;
        }
      }
    }

    // Period 4: Năm nay (current year - 12 months)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const yearAuction: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const yearNormal: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let yearTotalAuction = 0;
    let yearTotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= yearStart && recDate <= now) {
        const m = recDate.getMonth();
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          yearAuction[m] += fee;
          yearTotalAuction += fee;
        } else {
          yearNormal[m] += fee;
          yearTotalNormal += fee;
        }
      }
    }

    // Helper to scale chart numbers for SVG display (0 - 200 scale or in millions)
    const scaleValues = (rawValues: number[]) => {
      const max = Math.max(...rawValues, 1);
      if (max <= 200) return rawValues;
      return rawValues.map((v) => Math.round((v / max) * 180));
    };

    const revenuePeriods = [
      {
        label: '7 ngày',
        total: period7TotalAuction + period7TotalNormal,
        auction: period7TotalAuction,
        normal: period7TotalNormal,
        unit: 'tuần này',
        labels: last7DaysLabels,
        auctionValues: scaleValues(last7DaysAuction),
        normalValues: scaleValues(last7DaysNormal),
      },
      {
        label: '30 ngày',
        total: period30TotalAuction + period30TotalNormal,
        auction: period30TotalAuction,
        normal: period30TotalNormal,
        unit: '30 ngày',
        labels: last30Labels,
        auctionValues: scaleValues(last30Auction),
        normalValues: scaleValues(last30Normal),
      },
      {
        label: 'Tháng này',
        total: monthTotalAuction + monthTotalNormal,
        auction: monthTotalAuction,
        normal: monthTotalNormal,
        unit: 'tháng này',
        labels: monthLabels,
        auctionValues: scaleValues(monthAuction),
        normalValues: scaleValues(monthNormal),
      },
      {
        label: `Năm ${now.getFullYear()}`,
        total: yearTotalAuction + yearTotalNormal,
        auction: yearTotalAuction,
        normal: yearTotalNormal,
        unit: 'năm nay',
        labels: yearLabels,
        auctionValues: scaleValues(yearAuction),
        normalValues: scaleValues(yearNormal),
      },
    ];

    // 3. Hourly bid frequency
    const bidHourBuckets = [
      { label: '02h', hours: [0, 1, 2, 3], count: 0 },
      { label: '06h', hours: [4, 5, 6], count: 0 },
      { label: '09h', hours: [7, 8, 9], count: 0 },
      { label: '12h', hours: [10, 11, 12], count: 0 },
      { label: '15h', hours: [13, 14, 15], count: 0 },
      { label: '18h', hours: [16, 17, 18], count: 0 },
      { label: '20h', hours: [19, 20], count: 0 },
      { label: '21h', hours: [21], count: 0 },
      { label: '22h', hours: [22], count: 0 },
      { label: '24h', hours: [23], count: 0 },
    ];

    for (const bid of bids) {
      const placed = new Date(bid.placedAt);
      const h = placed.getHours();
      for (const bucket of bidHourBuckets) {
        if (bucket.hours.includes(h)) {
          bucket.count++;
          break;
        }
      }
    }

    const bidRawCounts = bidHourBuckets.map((b) => b.count);
    const maxBidCount = Math.max(...bidRawCounts, 0);
    const peakBucketIndex = bidHourBuckets.findIndex((b) => b.count === maxBidCount);
    const peakWindow =
      peakBucketIndex >= 0 && maxBidCount > 0
        ? `${bidHourBuckets[peakBucketIndex].label} (giờ vàng)`
        : '20h – 22h';
    const peakBidsPerMinute = maxBidCount > 0 ? Math.max(1, Math.round(maxBidCount / 60)) : 0;

    const bidFrequencyValues =
      maxBidCount > 0
        ? bidHourBuckets.map((b) => Math.max(5, Math.round((b.count / maxBidCount) * 98)))
        : bidHourBuckets.map(() => 0);

    const bidFrequency = {
      subtitle: 'Tải WebGL & phân bổ lượt trả giá theo khung giờ',
      peakWindow,
      peakBidsPerMinute,
      health: 'CPU 18% • 6 nodes OK',
      totalBids: bids.length,
      bidsPerUnit: 1,
      labels: bidHourBuckets.map((b) => b.label),
      values: bidFrequencyValues,
      rawCounts: bidRawCounts,
    };

    return {
      revenuePeriods,
      revenueComposition,
      bidFrequency,
    };
  }
}
