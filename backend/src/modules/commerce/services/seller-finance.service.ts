import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  OrderStatus,
  Prisma,
  Role,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { CreateWithdrawalDto } from '../dtos/create-withdrawal.dto';
import { QueryFinanceDto } from '../dtos/query-finance.dto';

@Injectable()
export class SellerFinanceService {
  private readonly logger = new Logger(SellerFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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
   * @throws NotFoundException when seller is not found
   * @throws ForbiddenException when seller is suspended or not authorized
   * @throws BadRequestException when balance is insufficient or maximum pending requests are exceeded
   */
  async createWithdrawal(sellerId: string, dto: CreateWithdrawalDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        wallet: true,
        sellerUpgradeRequests: {
          where: { status: 'APPROVED' },
          take: 1,
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Không tìm thấy tài khoản người bán.');
    }

    if (seller.role !== Role.SELLER && seller.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ tài khoản Người bán (Seller) mới có quyền rút tiền.');
    }

    if (seller.isShopSuspended) {
      throw new ForbiddenException(
        `Gian hàng của bạn hiện đang bị Admin đình chỉ hoạt động.${
          seller.suspensionReason ? ` Lý do: ${seller.suspensionReason}` : ''
        } Không thể thực hiện rút tiền.`,
      );
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

    const withdrawAmount = Number(dto.amount);
    const currentBalance = Number(wallet.balance);

    if (currentBalance < withdrawAmount) {
      throw new BadRequestException(
        `Số dư ví khả dụng không đủ để rút. Số dư hiện tại: ${currentBalance.toLocaleString(
          'vi-VN',
        )} VND, số tiền yêu cầu rút: ${withdrawAmount.toLocaleString('vi-VN')} VND.`,
      );
    }

    const pendingWithdrawalsCount = await this.prisma.withdrawalRequest.count({
      where: {
        userId: sellerId,
        status: WithdrawalStatus.PENDING,
      },
    });

    if (pendingWithdrawalsCount >= 3) {
      throw new BadRequestException(
        'Bạn đã có 3 yêu cầu rút tiền đang chờ xử lý. Vui lòng chờ Quản trị viên duyệt các yêu cầu trước đó.',
      );
    }

    const finalBankName = (dto.bankName?.trim() || seller.bankName)?.trim();
    const finalAccountNumber = (dto.accountNumber?.trim() || seller.accountNumber)?.trim();
    const finalAccountHolderName = (dto.accountHolderName?.trim() || seller.accountHolderName)
      ?.trim()
      ?.toUpperCase();

    if (!finalBankName || !finalAccountNumber || !finalAccountHolderName) {
      throw new BadRequestException(
        'Thông tin ngân hàng chưa đầy đủ. Vui lòng cập nhật thông tin ngân hàng trong Hồ sơ cá nhân hoặc nhập trực tiếp khi gửi yêu cầu rút tiền.',
      );
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;

    const result = await this.prisma.$transaction(async (tx) => {
      if (!seller.bankName && dto.bankName) {
        await tx.user.update({
          where: { id: sellerId },
          data: {
            bankName: finalBankName,
            accountNumber: finalAccountNumber,
            accountHolderName: finalAccountHolderName,
          },
        });
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: withdrawAmount },
          lockedBalance: { increment: withdrawAmount },
        },
      });

      const req = await tx.withdrawalRequest.create({
        data: {
          userId: sellerId,
          amount: withdrawAmount,
          bankName: finalBankName,
          accountNumber: finalAccountNumber,
          accountHolderName: finalAccountHolderName,
          adminNote: dto.note?.trim() || null,
          status: WithdrawalStatus.PENDING,
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: withdrawAmount,
          type: WalletTransactionType.WITHDRAW,
          status: WalletTransactionStatus.PENDING,
          referenceId: req.id,
          description: `Yêu cầu rút tiền về ${finalBankName} - STK: ${finalAccountNumber} (${finalAccountHolderName})`,
        },
      });

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Yêu cầu rút tiền đã được tiếp nhận ⏳',
          content: `Yêu cầu rút ${withdrawAmount.toLocaleString(
            'vi-VN',
          )} VND về ${finalBankName} (${finalAccountNumber}) đã được tiếp nhận. Hệ thống sẽ thẩm định và giải ngân trong vòng 3-7 ngày làm việc. Số dư ví khả dụng đã được tạm giữ an toàn.`,
          type: NotificationType.PAYMENT,
        },
      });

      await notifyAllAdmins(tx, {
        title: 'Yêu cầu rút tiền Seller mới',
        content: `Gian hàng ${storeName} gửi yêu cầu rút ${withdrawAmount.toLocaleString('vi-VN')} VND về ${finalBankName} (${finalAccountNumber}).`,
        type: NotificationType.PAYMENT,
        targetUrl: '/admin/finance',
      });

      return { req, transaction, updatedWallet };
    });

    this.logger.log(
      `Seller ${sellerId} (${storeName}) created withdrawal request ${result.req.id} for ${withdrawAmount} VND`,
    );

    return {
      success: true,
      message:
        'Gửi yêu cầu rút tiền thành công! Hệ thống sẽ thẩm định và giải ngân trong vòng 3-7 ngày làm việc.',
      withdrawalRequest: {
        id: result.req.id,
        amount: Number(result.req.amount),
        bankName: result.req.bankName,
        accountNumber: result.req.accountNumber,
        accountHolderName: result.req.accountHolderName,
        status: result.req.status,
        createdAt: result.req.createdAt,
      },
      wallet: {
        balance: Number(result.updatedWallet.balance),
        lockedBalance: Number(result.updatedWallet.lockedBalance),
        currency: result.updatedWallet.currency,
      },
    };
  }

  /**
   * Retrieves paginated financial transaction ledger entries for a merchant wallet.
   *
   * @param sellerId - Unique identifier of the seller
   * @param query - Filter options by transaction type and status
   * @returns Paginated wallet transactions
   */
  async getTransactions(sellerId: string, query: QueryFinanceDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: sellerId },
    });

    if (!wallet) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const where: Prisma.WalletTransactionWhereInput = {
      walletId: wallet.id,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
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

    return {
      items: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        referenceId: t.referenceId,
        description: t.description,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (p - 1) * l;

    const [total, items] = await Promise.all([
      this.prisma.withdrawalRequest.count({ where: { userId: sellerId } }),
      this.prisma.withdrawalRequest.findMany({
        where: { userId: sellerId },
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    return {
      items: items.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        accountHolderName: w.accountHolderName,
        status: w.status,
        rejectionReason: w.rejectionReason,
        adminNote: w.adminNote,
        reviewedBy: w.reviewedBy,
        reviewedAt: w.reviewedAt,
        createdAt: w.createdAt,
      })),
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }
}
