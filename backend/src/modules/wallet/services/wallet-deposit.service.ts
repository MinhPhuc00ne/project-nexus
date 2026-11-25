import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DepositWalletDto } from '../dtos/deposit-wallet.dto';
import { AuctionCheckoutService } from '../../auction/services/auction-checkout.service';
import { WebhookData } from '@payos/node';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PayosService } from '../../payments/services/payos.service';

@Injectable()
export class WalletDepositService {
  private readonly logger = new Logger(WalletDepositService.name);

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

  /**
   * Settles a verified PayOS callback against a wallet top-up.
   *
   * PayOS sends one callback shape for both an order payment and a top-up, and
   * the two are told apart only by which record carries the orderCode. This
   * used to live inside the order payment helper as the branch taken when no
   * payment matched, which is how the module that settles orders ended up
   * crediting wallets and settling auction deposits.
   *
   * @param webhookData - The already-verified callback payload.
   * @returns The settlement, or null when no top-up carries this orderCode.
   */
  async settleTopup(webhookData: WebhookData): Promise<PayosSettlement | null> {
    const { orderCode } = webhookData;

    const walletTx = await this.prisma.walletTransaction.findFirst({
      where: {
        referenceId: String(orderCode),
        type: WalletTransactionType.DEPOSIT,
      },
      include: {
        wallet: true,
      },
    });

    if (walletTx) {
      if (walletTx.status === WalletTransactionStatus.SUCCESS) {
        this.logger.log(`Nạp ví PayOS orderCode=${orderCode} đã được xử lý trước đó`);
        return { success: true, message: 'Already processed' };
      }

      if (Number(webhookData.amount) !== Number(walletTx.amount)) {
        throw new BadRequestException('Số tiền nạp PayOS không khớp giao dịch.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id: walletTx.id },
          data: {
            status: WalletTransactionStatus.SUCCESS,
            description: `${walletTx.description} (Đã thanh toán VietQR PayOS)`,
          },
        });

        await tx.wallet.update({
          where: { id: walletTx.walletId },
          data: {
            balance: { increment: walletTx.amount },
          },
        });

        // A top-up is always paid into the payer’s own wallet. Platform ledger
        // wallets have no owner, so one appearing here means the transaction was
        // written against the wrong wallet and the follow-up work must not run.
        const walletOwnerId = walletTx.wallet.userId;
        if (!walletOwnerId) {
          throw new Error(
            `Wallet top-up ${walletTx.id} credits platform wallet ${walletTx.walletId}, which has no owner`,
          );
        }

        await this.auctionCheckout?.processPendingDepositsForUser(tx, walletOwnerId);

        if (tx.notification?.create) {
          await tx.notification.create({
            data: {
              userId: walletOwnerId,
              title: 'Nạp tiền ví NEXUS Pay thành công ✅',
              content: `Bạn đã nạp thành công ${Number(walletTx.amount).toLocaleString('vi-VN')} VND vào ví NEXUS Pay qua PayOS (VietQR).`,
              type: NotificationType.PAYMENT,
              channel: NotificationChannel.IN_APP,
            },
          });
        }
      });

      this.logger.log(
        `Nạp ví PayOS orderCode=${orderCode} thành công cho userId=${walletTx.wallet.userId}`,
      );
      return { success: true, message: 'Wallet deposit processed successfully' };
    }

    this.logger.warn(
      `Không tìm thấy bản ghi Payment hoặc WalletTransaction cho PayOS orderCode=${orderCode}`,
    );
    return { success: false, message: 'Payment record not found' };
  }
}
