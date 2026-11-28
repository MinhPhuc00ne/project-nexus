import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DepositWalletInput } from '../dtos/deposit-wallet.dto';
import { AuctionCheckoutService } from '../../auction/services/auction-checkout.service';
import { WebhookData } from '@payos/node';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { PayosOrderCodeService } from '../../payments/services/payos-order-code.service';
import { PayosService } from '../../payments/services/payos.service';

@Injectable()
export class WalletDepositService {
  private readonly logger = new Logger(WalletDepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly orderCodes: PayosOrderCodeService,
    _configService: ConfigService,
    private readonly auctionCheckout?: AuctionCheckoutService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  /**
   * Retrieve current user wallet details.
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
   * Deposit funds into personal wallet (supports PayOS VietQR or direct deposit).
   */
  async depositToUserWallet(userId: string, dto: DepositWalletInput) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Wallet deposit amount must be greater than 0 VND');
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

    // If PayOS gateway is selected and PayOS service is available
    if (dto.provider === 'PAYOS' && this.payosService?.createPaymentLink) {
      // The same sequence checkout draws from, so a top-up and an order
      // payment can never claim one callback.
      const orderCode = await this.orderCodes.next();

      const walletTx = await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: depositAmount,
          type: WalletTransactionType.DEPOSIT,
          status: WalletTransactionStatus.PENDING,
          referenceId: String(orderCode),
          description: dto.description?.trim() || `NEXUS Pay wallet top-up (Tx ID: ${orderCode})`,
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
        message: 'PayOS top-up link created successfully. Please scan the VietQR code to complete.',
      };
    }

    // Direct deposit (for test automation or when DIRECT is specified)
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
          description: dto.description?.trim() || 'Personal wallet deposit',
        },
      });

      await this.auctionCheckout?.processPendingDepositsForUser(tx, userId);
      const updatedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });

      return { updatedWallet, transaction };
    });

    return {
      success: true,
      message: `Successfully deposited ${Number(dto.amount).toLocaleString('vi-VN')} VND into your wallet.`,
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
   * Check wallet top-up status by orderCode.
   */
  async checkPayosWalletDepositStatus(orderCode: number, userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundException('User wallet does not exist');
    }

    const tx = await this.prisma.walletTransaction.findFirst({
      where: {
        walletId: wallet.id,
        referenceId: String(orderCode),
        type: WalletTransactionType.DEPOSIT,
      },
    });

    if (!tx) {
      throw new NotFoundException('No wallet top-up transaction found for this order code');
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
        this.logger.log(`PayOS wallet top-up orderCode=${orderCode} was already processed`);
        return { success: true, message: 'Already processed' };
      }

      if (Number(webhookData.amount) !== Number(walletTx.amount)) {
        throw new BadRequestException('PayOS top-up amount does not match transaction.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id: walletTx.id },
          data: {
            status: WalletTransactionStatus.SUCCESS,
            description: `${walletTx.description} (Paid via PayOS VietQR)`,
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

        if (typeof tx?.notification?.create === 'function') {
          await publishNotification(
            tx,
            {
              userId: walletOwnerId,
              title: 'NEXUS Pay wallet top-up successful ✅',
              content: `You successfully deposited ${Number(walletTx.amount).toLocaleString('vi-VN')} VND into your NEXUS Pay wallet via PayOS (VietQR).`,
              type: NotificationType.PAYMENT,
              channel: NotificationChannel.IN_APP,
            },
            this.notifications,
          );
        }
      });

      this.logger.log(
        `PayOS wallet top-up orderCode=${orderCode} succeeded for userId=${walletTx.wallet.userId}`,
      );
      return { success: true, message: 'Wallet deposit processed successfully' };
    }

    this.logger.warn(
      `Payment or WalletTransaction record not found for PayOS orderCode=${orderCode}`,
    );
    return { success: false, message: 'Payment record not found' };
  }
}
