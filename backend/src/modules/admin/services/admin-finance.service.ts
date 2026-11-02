import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  Role,
  Wallet,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DepositAdminWalletDto, QueryAdminWalletTransactionsDto } from '../dtos/admin-wallet.dto';

@Injectable()
export class AdminFinanceService {
  private readonly logger = new Logger(AdminFinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy hoặc tự động tạo ví hệ thống chính của Quản trị viên (Super Admin Wallet)
   */
  async getOrCreatePrimaryAdminWallet(txClient?: Prisma.TransactionClient): Promise<Wallet> {
    const client = txClient || this.prisma;

    // Tìm tài khoản Admin đầu tiên của hệ thống
    let adminUser = await client.user.findFirst({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'asc' },
      include: { wallet: true },
    });

    if (!adminUser) {
      // Fallback: tìm theo email admin@nexus.com
      adminUser = await client.user.findFirst({
        where: { email: 'admin@nexus.com' },
        include: { wallet: true },
      });
    }

    if (!adminUser) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản Quản trị viên (ADMIN) trên hệ thống để gán ví nền tảng.',
      );
    }

    let wallet = adminUser.wallet;
    if (!wallet) {
      wallet = await client.wallet.create({
        data: {
          userId: adminUser.id,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
      this.logger.log(`Đã khởi tạo ví Admin hệ thống cho userId: ${adminUser.id}`);
    }

    return wallet;
  }

  /**
   * Lấy thông tin ví Admin và tổng hợp số liệu hoa hồng sàn đã thu
   */
  async getAdminWallet(adminId: string) {
    // Đảm bảo ví của Admin này (hoặc ví chính của hệ thống) đã tồn tại
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId: adminId },
    });

    if (!wallet) {
      wallet = await this.getOrCreatePrimaryAdminWallet();
    }

    // Tổng hợp số tiền % phí sàn đã thu từ các đơn hàng thành công
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

    // Tổng hợp số tiền Admin đã nạp vào ví
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

    // Tổng số giao dịch
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
   * Xem lịch sử biến động số dư ví hệ thống của Admin (kèm phân trang và bộ lọc)
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

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
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

    // Trích xuất mã đơn hàng từ referenceId để tra cứu thông tin Buyer và Shop
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
   * Admin nạp thêm tiền vào ví hệ thống (có lưu lịch sử giao dịch rõ ràng)
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
      // 1. Tăng số dư ví Admin
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: depositAmount },
        },
      });

      // 2. Tạo bản ghi giao dịch ví loại DEPOSIT
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
}
