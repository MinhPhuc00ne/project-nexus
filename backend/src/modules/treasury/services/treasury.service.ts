import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role, Wallet } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * The platform's own wallet: the account every fee, escrow hold and refund
 * reservation passes through.
 *
 * Checkout, escrow, refunds and auction deposits all need it, and all four used
 * to get it by injecting `AdminFinanceService` — 794 lines of back-office
 * reporting — for this one method. That made the admin module a dependency of
 * every money flow on the platform, so settling an order pulled in the code
 * that renders admin dashboards.
 *
 * This is a leaf: it reads the database and nothing else, and the back office
 * now reads the treasury rather than owning it.
 */
@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves or automatically initializes the primary platform administrator wallet.
   *
   * @param txClient - Optional transactional client instance
   * @returns Primary admin Wallet entity
   * @throws NotFoundException when no administrator user exists
   */
  async getOrCreatePrimaryAdminWallet(txClient?: Prisma.TransactionClient): Promise<Wallet> {
    const client = txClient || this.prisma;

    let adminUser = await client.user.findFirst({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'asc' },
      include: { wallet: true },
    });

    if (!adminUser) {
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
}
