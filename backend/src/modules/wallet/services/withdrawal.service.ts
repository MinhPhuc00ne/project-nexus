import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import {
  NotificationType,
  Prisma,
  Role,
  Wallet,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { CreateWithdrawalInput } from '../dtos/create-withdrawal.dto';
import { QueryFinanceInput } from '../dtos/query-finance.dto';

export interface CreateWithdrawalOptions {
  requireSellerRole?: boolean;
}

interface ResolvedBankDetails {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

/** The part of a Prisma client the pending-limit check needs. */
type PrismaLike = {
  withdrawalRequest: { count(args: { where: Record<string, unknown> }): Promise<number> };
};

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private static readonly MAX_PENDING_WITHDRAWALS = 3;
  private static readonly CURRENCY_VND = 'VND';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  /**
   * Creates a withdrawal request for a buyer or seller, locking funds until admin review.
   *
   * @param userId - Unique identifier of the requesting user
   * @param dto - Withdrawal amount and optional bank account overrides
   * @param options - Role enforcement options
   * @returns Created withdrawal request and updated wallet balances
   */
  async createWithdrawal(
    userId: string,
    dto: CreateWithdrawalInput,
    options?: CreateWithdrawalOptions,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        sellerUpgradeRequests: {
          where: { status: 'APPROVED' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    this.ensureWithdrawalAllowed(user, options);

    const wallet = await this.getOrCreateWallet(userId, user.wallet);
    const withdrawAmount = Number(dto.amount);
    const currentBalance = Number(wallet.balance);

    if (currentBalance < withdrawAmount) {
      throw new BadRequestException(
        `Số dư ví khả dụng không đủ để rút. Số dư hiện tại: ${currentBalance.toLocaleString(
          'vi-VN',
        )} VND, số tiền yêu cầu rút: ${withdrawAmount.toLocaleString('vi-VN')} VND.`,
      );
    }

    // A courtesy check so the common case fails fast with a clear message.
    // The limit itself is enforced inside the transaction, under a lock.
    await this.ensureWithinPendingLimit(this.prisma, userId);

    const bankDetails = this.resolveBankDetails(dto, user);
    const isSeller = user.role === Role.SELLER;
    const displayName = isSeller
      ? user.sellerUpgradeRequests[0]?.storeName || user.fullName
      : user.fullName;

    const result = await this.executeWithdrawalTransaction({
      userId,
      userRole: user.role,
      walletId: wallet.id,
      withdrawAmount,
      bankDetails,
      displayName,
      note: dto.note?.trim() || null,
      existingBankInfo: {
        bankName: user.bankName,
        accountNumber: user.accountNumber,
        accountHolderName: user.accountHolderName,
      },
    });

    this.logger.log(
      `User ${userId} (${user.role} - ${displayName}) created withdrawal request ${result.req.id} for ${withdrawAmount} VND`,
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
   * Retrieves paginated wallet transaction ledger entries for a user.
   *
   * @param userId - Unique identifier of the user
   * @param query - Pagination and filter parameters
   * @returns Paginated wallet transactions
   */
  async getTransactions(userId: string, query: QueryFinanceInput) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
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
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

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
   * Retrieves paginated withdrawal requests submitted by a user.
   *
   * @param userId - Unique identifier of the user
   * @param page - Target page index
   * @param limit - Page size limit
   * @returns Paginated withdrawal requests and review statuses
   */
  async getWithdrawals(userId: string, page = 1, limit = 10) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (p - 1) * l;

    const [total, items] = await Promise.all([
      this.prisma.withdrawalRequest.count({ where: { userId } }),
      this.prisma.withdrawalRequest.findMany({
        where: { userId },
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

  private ensureWithdrawalAllowed(
    user: { role: Role; isShopSuspended: boolean; suspensionReason: string | null },
    options?: CreateWithdrawalOptions,
  ) {
    if (options?.requireSellerRole && user.role !== Role.SELLER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ tài khoản Người bán (Seller) mới có quyền rút tiền.');
    }

    if (user.role === Role.SELLER && user.isShopSuspended) {
      throw new ForbiddenException(
        `Gian hàng của bạn hiện đang bị Admin đình chỉ hoạt động.${
          user.suspensionReason ? ` Lý do: ${user.suspensionReason}` : ''
        } Không thể thực hiện rút tiền.`,
      );
    }
  }

  private async getOrCreateWallet(userId: string, existingWallet: Wallet | null): Promise<Wallet> {
    if (existingWallet) {
      return existingWallet;
    }
    return this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        lockedBalance: 0,
        currency: WithdrawalService.CURRENCY_VND,
      },
    });
  }

  /**
   * Rejects a request that would exceed the pending limit.
   *
   * @param db - The client to count with. Pass the transaction client for the
   *   check that enforces the limit, and only then under a row lock: at READ
   *   COMMITTED two concurrent transactions otherwise both count the same
   *   pending requests and both insert.
   * @param userId - Whose requests to count.
   * @returns Completion.
   * @throws BadRequestException when the limit is already reached.
   */
  private async ensureWithinPendingLimit(db: PrismaLike, userId: string) {
    const pendingCount = await db.withdrawalRequest.count({
      where: {
        userId,
        status: WithdrawalStatus.PENDING,
      },
    });

    if (pendingCount >= WithdrawalService.MAX_PENDING_WITHDRAWALS) {
      throw new BadRequestException(
        `Bạn đã có ${WithdrawalService.MAX_PENDING_WITHDRAWALS} yêu cầu rút tiền đang chờ xử lý. Vui lòng chờ Quản trị viên duyệt các yêu cầu trước đó.`,
      );
    }
  }

  private resolveBankDetails(
    dto: CreateWithdrawalInput,
    user: {
      bankName: string | null;
      accountNumber: string | null;
      accountHolderName: string | null;
    },
  ): ResolvedBankDetails {
    const bankName = (dto.bankName?.trim() || user.bankName)?.trim();
    const accountNumber = (dto.accountNumber?.trim() || user.accountNumber)?.trim();
    const accountHolderName = (dto.accountHolderName?.trim() || user.accountHolderName)
      ?.trim()
      ?.toUpperCase();

    if (!bankName || !accountNumber || !accountHolderName) {
      throw new BadRequestException(
        'Thông tin ngân hàng chưa đầy đủ. Vui lòng cập nhật thông tin ngân hàng trong Hồ sơ cá nhân hoặc nhập trực tiếp khi gửi yêu cầu rút tiền.',
      );
    }

    return { bankName, accountNumber, accountHolderName };
  }

  private async executeWithdrawalTransaction(params: {
    userId: string;
    userRole: Role;
    walletId: string;
    withdrawAmount: number;
    bankDetails: ResolvedBankDetails;
    displayName: string;
    note: string | null;
    existingBankInfo: {
      bankName: string | null;
      accountNumber: string | null;
      accountHolderName: string | null;
    };
  }) {
    const {
      userId,
      userRole,
      walletId,
      withdrawAmount,
      bankDetails,
      displayName,
      note,
      existingBankInfo,
    } = params;

    return this.prisma.$transaction(async (tx) => {
      // Locking the wallet row serialises every withdrawal for this account,
      // so the count below cannot be read concurrently by a second request
      // that then inserts past the limit.
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${walletId} FOR UPDATE`;
      await this.ensureWithinPendingLimit(tx, userId);

      if (
        !existingBankInfo.bankName ||
        !existingBankInfo.accountNumber ||
        !existingBankInfo.accountHolderName
      ) {
        await tx.user.update({
          where: { id: userId },
          data: {
            bankName: bankDetails.bankName,
            accountNumber: bankDetails.accountNumber,
            accountHolderName: bankDetails.accountHolderName,
          },
        });
      }

      const debitResult = await tx.wallet.updateMany({
        where: {
          id: walletId,
          balance: { gte: withdrawAmount },
        },
        data: {
          balance: { decrement: withdrawAmount },
          lockedBalance: { increment: withdrawAmount },
        },
      });

      if (debitResult.count === 0) {
        throw new BadRequestException({
          message: 'Số dư ví khả dụng không đủ để thực hiện rút tiền.',
          errorCode: AppErrorCode.INSUFFICIENT_BALANCE,
        });
      }

      const updatedWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: walletId },
      });

      const req = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount: withdrawAmount,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          accountHolderName: bankDetails.accountHolderName,
          adminNote: note,
          status: WithdrawalStatus.PENDING,
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId,
          amount: withdrawAmount,
          type: WalletTransactionType.WITHDRAW,
          status: WalletTransactionStatus.PENDING,
          referenceId: req.id,
          description: `Yêu cầu rút tiền về ${bankDetails.bankName} - STK: ${bankDetails.accountNumber} (${bankDetails.accountHolderName})`,
        },
      });

      const formattedAmount = withdrawAmount.toLocaleString('vi-VN');

      await publishNotification(
        tx,
        {
          userId,
          title: 'Yêu cầu rút tiền đã được tiếp nhận ⏳',
          content: `Yêu cầu rút ${formattedAmount} VND về ${bankDetails.bankName} (${bankDetails.accountNumber}) đã được tiếp nhận. Hệ thống sẽ thẩm định và giải ngân trong vòng 3-7 ngày làm việc. Số dư ví khả dụng đã được tạm giữ an toàn.`,
          type: NotificationType.PAYMENT,
          targetUrl: userRole === Role.SELLER ? '/seller/finance' : '/buyer/wallet',
        },
        this.notifications,
      );

      const isSeller = userRole === Role.SELLER;
      await notifyAllAdmins(tx, {
        title: isSeller ? 'Yêu cầu rút tiền Seller mới' : 'Yêu cầu rút tiền Buyer mới',
        content: isSeller
          ? `Gian hàng ${displayName} gửi yêu cầu rút ${formattedAmount} VND về ${bankDetails.bankName} (${bankDetails.accountNumber}).`
          : `Người dùng ${displayName} gửi yêu cầu rút ${formattedAmount} VND về ${bankDetails.bankName} (${bankDetails.accountNumber}).`,
        type: NotificationType.PAYMENT,
        targetUrl: '/admin/finance',
      });

      return { req, transaction, updatedWallet };
    });
  }
}
