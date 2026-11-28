import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role, Wallet, WalletType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * The platform's own ledgers: `ESCROW_LIABILITY` holds buyer funds until
 * settlement/refund, `PLATFORM_REVENUE` records earned platform fees, and
 * `getOrCreatePrimaryAdminWallet` remains available for admin personal wallet
 * operations.
 *
 * This is a leaf: it reads/writes the database and nothing else, and the back
 * office reads the treasury rather than owning it.
 */
@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves or creates a singleton system wallet (`ESCROW_LIABILITY` or
   * `PLATFORM_REVENUE`) with `userId = null`.
   */
  async getOrCreateSystemWallet(
    type: Extract<WalletType, 'ESCROW_LIABILITY' | 'PLATFORM_REVENUE'>,
    txClient?: Prisma.TransactionClient,
  ): Promise<Wallet> {
    const client = txClient || this.prisma;
    const existing = await client.wallet.findFirst({
      where: { type, userId: null },
    });
    if (existing) {
      return existing;
    }

    try {
      const created = await client.wallet.create({
        data: {
          type,
          userId: null,
          balance: 0,
          lockedBalance: 0,
          currency: 'VND',
        },
      });
      this.logger.log(`Initialized system wallet ${type}: ${created.id}`);
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await client.wallet.findFirst({
          where: { type, userId: null },
        });
        if (concurrent) {
          return concurrent;
        }
      }
      throw error;
    }
  }

  getOrCreateEscrowWallet(txClient?: Prisma.TransactionClient): Promise<Wallet> {
    return this.getOrCreateSystemWallet(WalletType.ESCROW_LIABILITY, txClient);
  }

  getOrCreatePlatformRevenueWallet(txClient?: Prisma.TransactionClient): Promise<Wallet> {
    return this.getOrCreateSystemWallet(WalletType.PLATFORM_REVENUE, txClient);
  }

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
        'No Administrator (ADMIN) account found on the system to assign the platform wallet.',
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
      this.logger.log(`Initialized system Admin wallet for userId: ${adminUser.id}`);
    }

    return wallet;
  }
}
