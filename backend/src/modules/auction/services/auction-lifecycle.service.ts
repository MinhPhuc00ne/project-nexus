import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AuctionStatus as NexusAuctionStatus } from '@nexus/types';
import { AuctionAwardStatus, AuctionStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuctionCheckoutService } from '../../commerce/services/auction-checkout.service';
import { AuctionGateway } from '../gateways/auction.gateway';
import { AuctionService } from './auction.service';

/** Recovers due auction lots, overdue awards, and broadcasts live room timer syncs. */
@Injectable()
export class AuctionLifecycleService implements OnModuleInit, OnModuleDestroy {
  private sweepTimer?: ReturnType<typeof setInterval>;
  private syncTimer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private syncing?: Promise<void>;
  private readonly logger = new Logger(AuctionLifecycleService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly auctions: AuctionService,
    private readonly checkout: AuctionCheckoutService,
    private readonly gateway: AuctionGateway,
  ) {}

  /** Starts bounded, nonoverlapping deadline sweeps and 1-second WebSocket timer syncs. */
  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      if (this.running) return;
      this.running = this.tick()
        .catch(() => this.logger.warn('Auction deadlines will be retried.'))
        .finally(() => {
          this.running = undefined;
        });
    }, 30000);
    this.sweepTimer.unref();

    this.syncTimer = setInterval(() => {
      if (this.syncing) return;
      this.syncing = this.syncActiveTimers()
        .catch(() => undefined)
        .finally(() => {
          this.syncing = undefined;
        });
    }, 1000);
    this.syncTimer.unref();
  }

  /** Stops timers and allows in-flight transactions to finish cleanly. */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.sweepTimer);
    clearInterval(this.syncTimer);
    await Promise.all([this.running, this.syncing]);
  }

  /** Processes due auction lots and overdue 24h awards atomically. */
  async tick(): Promise<void> {
    const now = new Date();
    await this.auctions.endDueLots();

    const expired = await this.prisma.auctionAward.findMany({
      where: {
        status: {
          in: [
            AuctionAwardStatus.AWAITING_CHECKOUT,
            AuctionAwardStatus.AWAITING_ACCEPTANCE,
            AuctionAwardStatus.AWAITING_DEPOSIT,
          ],
        },
        expiresAt: { lte: now },
      },
      take: 25,
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

  /** Broadcasts per-room and per-lot remaining seconds over WebSocket. */
  async syncActiveTimers(): Promise<void> {
    const nowMs = Date.now();
    const activeAuctions = await this.prisma.auction.findMany({
      where: { status: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] } },
      select: {
        id: true,
        endTime: true,
        status: true,
        isExtended: true,
        items: {
          where: {
            status: 'APPROVED',
            lotStatus: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] },
          },
          select: { id: true, endTime: true, lotStatus: true, isExtended: true },
        },
      },
      take: 50,
    });

    for (const auction of activeAuctions) {
      this.gateway.broadcastTimerSync({
        auctionId: auction.id,
        remainingSeconds: Math.max(0, Math.floor((auction.endTime.getTime() - nowMs) / 1000)),
        endTime: auction.endTime.toISOString(),
        status: auction.status as unknown as NexusAuctionStatus,
        isExtended: auction.isExtended,
        lotTimers: auction.items.map((lot) => {
          const lotEnd = lot.endTime ?? auction.endTime;
          return {
            auctionItemId: lot.id,
            remainingSeconds: Math.max(0, Math.floor((lotEnd.getTime() - nowMs) / 1000)),
            endTime: lotEnd.toISOString(),
            status: lot.lotStatus as unknown as NexusAuctionStatus,
            isExtended: lot.isExtended,
          };
        }),
      });
    }
  }
}
