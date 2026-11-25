import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DepositWalletDto } from '../dtos/deposit-wallet.dto';
import { AuctionCheckoutService } from './auction-checkout.service';
import { PayosService } from './payos.service';

export class OrderWalletHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    _configService: ConfigService,
    private readonly auctionCheckout?: AuctionCheckoutService,
  ) {}

  /**
   * Xem thông tin ví người dùng hiện tại
   */
  async getUserWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
        include: {
          transactions: true,
        },
      });
    }

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
      currency: wallet.currency,
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        referenceId: t.referenceId,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Nạp tiền vào ví cá nhân (hỗ trợ qua cổng PayOS VietQR hoặc nạp trực tiếp)
   */
  async depositToUserWallet(userId: string, dto: DepositWalletDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Số tiền nạp vào ví phải lớn hơn 0 đồng');
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
    }

    const depositAmount = new Prisma.Decimal(dto.amount);

    // Nếu chọn cổng PayOS và dịch vụ PayOS khả dụng (môi trường runtime thực tế)
    if (dto.provider === 'PAYOS' && this.payosService?.createPaymentLink) {
      const orderCode = Number(
        `${Math.floor(Date.now() / 1000)}${Math.floor(Math.random() * 90 + 10)}`,
      );

      const walletTx = await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: depositAmount,
          type: WalletTransactionType.DEPOSIT,
          status: WalletTransactionStatus.PENDING,
          referenceId: String(orderCode),
          description: dto.description?.trim() || `Nạp tiền ví NEXUS Pay (Mã GD: ${orderCode})`,
        },
      });

      const paymentLink = await this.payosService.createPaymentLink({
        orderCode,
        amount: dto.amount,
        description: `Nap vi NEXUS Pay`,
        returnUrl: 'https://nexus.local/wallet',
        cancelUrl: 'https://nexus.local/wallet',
      });

      return {
        success: true,
        paymentProvider: 'PAYOS',
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        amount: dto.amount,
        accountNumber: paymentLink.accountNumber,
        accountName: paymentLink.accountName,
        bin: paymentLink.bin,
        transactionId: walletTx.id,
        message: 'Tạo link nạp tiền PayOS thành công. Vui lòng quét mã VietQR để hoàn tất.',
      };
    }

    // Nạp tiền trực tiếp (cho test automation hoặc khi chỉ định DIRECT)
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
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
          description: dto.description?.trim() || 'Nạp tiền vào ví cá nhân',
        },
      });

      await this.auctionCheckout?.processPendingDepositsForUser(tx, userId);
      const updatedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });

      return { updatedWallet, transaction };
    });

    return {
      success: true,
      message: `Nạp thành công ${Number(dto.amount).toLocaleString('vi-VN')} VND vào ví.`,
      balance: Number(result.updatedWallet.balance),
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
   * Kiểm tra trạng thái nạp tiền ví theo orderCode
   */
  async checkPayosWalletDepositStatus(orderCode: number, userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundException('Ví người dùng không tồn tại');
    }

    const tx = await this.prisma.walletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        referenceId: String(orderCode),
        type: WalletTransactionType.DEPOSIT,
      },
    });

    if (!tx) {
      throw new NotFoundException('Không tìm thấy giao dịch nạp ví tương ứng với mã đơn này');
    }

    return {
      orderCode,
      status: tx.status,
      amount: Number(tx.amount),
      description: tx.description,
      createdAt: tx.createdAt,
      balance: Number(wallet.balance),
    };
  }
}
