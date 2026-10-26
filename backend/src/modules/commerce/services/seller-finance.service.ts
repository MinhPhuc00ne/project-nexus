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
   * Lấy tổng quan doanh thu, số dư ví và biểu đồ tài chính của Seller
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

    // Đảm bảo Seller luôn có ví tiền
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
      Number(this.configService.get<number>('PLATFORM_FEE_PERCENTAGE')) || 7.0; // Phí sàn mặc định 7%

    // Lấy tất cả đơn hàng mà seller này bán
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

    let totalGrossRevenue = 0; // Tổng doanh số gộp
    let completedRevenue = 0; // Doanh thu các đơn đã giao thành công (DELIVERED, CONFIRMED)
    let pendingEscrowRevenue = 0; // Doanh thu đang tạm giữ ký quỹ (PAID, PREPARING, SHIPPING)
    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const monthlyMap = new Map<string, { month: string; gross: number; ordersCount: number }>();

    for (const order of orders) {
      const amount = Number(order.totalAmount);
      const monthKey = order.createdAt.toISOString().substring(0, 7); // 'YYYY-MM'

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

    // Lấy 6 tháng gần nhất
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
   * Tạo yêu cầu rút tiền (Withdrawal Request)
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

    // Kiểm tra số lượng yêu cầu rút tiền đang chờ xử lý (tối đa 3 yêu cầu PENDING cùng lúc để tránh spam)
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

    // Ưu tiên lấy thông tin ngân hàng thụ hưởng từ Profile người dùng nếu DTO không truyền
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
      // 1. Nếu profile chưa có thông tin ngân hàng mà người dùng nhập ở request, tự động cập nhật vào profile
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

      // 2. Chuyển tiền từ balance sang lockedBalance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: withdrawAmount },
          lockedBalance: { increment: withdrawAmount },
        },
      });

      // 3. Tạo bản ghi WithdrawalRequest
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

      // 4. Tạo bản ghi giao dịch ví WalletTransaction với type WITHDRAW và status PENDING
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

      // 5. Gửi thông báo đến người bán (thời gian giải ngân 3-7 ngày làm việc)
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
   * Lấy lịch sử giao dịch tài chính / biến động số dư ví của Seller
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
   * Lấy danh sách các yêu cầu rút tiền của Seller
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
