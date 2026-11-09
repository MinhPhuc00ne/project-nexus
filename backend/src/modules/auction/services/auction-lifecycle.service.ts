import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionCheckoutService } from '../../commerce/services/auction-checkout.service';
import { AuctionService } from './auction.service';

/** Recovers due auctions and unpaid winning offers after restarts using persisted deadlines. */
@Injectable()
export class AuctionLifecycleService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private readonly logger = new Logger(AuctionLifecycleService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly auctions: AuctionService,
    private readonly checkout: AuctionCheckoutService,
  ) {}

  /** Starts bounded, nonoverlapping deadline processing. */
  onModuleInit(): void {
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.tick()
        .catch(() => this.logger.warn('Auction deadlines will be retried.'))
        .finally(() => {
          this.running = undefined;
        });
    }, 30000);
    this.timer.unref();
  }

  /** Stops processing and allows in-flight transactions to finish. */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.running;
  }

  /** Processes due rows; transaction locks make overlapping application instances idempotent. @returns Completion of one batch. */
  async tick(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.auction.findMany({
      where: { status: { in: ['ACTIVE', 'EXTENDED', 'SCHEDULED'] }, endTime: { lte: now } },
      take: 20,
      orderBy: { endTime: 'asc' },
      select: { id: true },
    });
    for (const auction of due) {
      try {
        await this.auctions.endAuction(auction.id);
      } catch {
        this.logger.warn(`Auction finalization requires retry: ${auction.id}`);
      }
    }
    const expired = await this.prisma.auctionAward.findMany({
      where: { status: 'AWAITING_CHECKOUT', expiresAt: { lte: now } },
      take: 20,
      orderBy: { expiresAt: 'asc' },
      select: { id: true },
    });
    for (const award of expired) {
      try {
        await this.checkout.expire(award.id);
      } catch {
        this.logger.warn(`Auction offer requires reconciliation: ${award.id}`);
      }
    }
  }
}
