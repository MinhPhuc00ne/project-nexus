import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { AuctionStatus as NexusAuctionStatus } from '@nexus/types';
import { AuctionAwardStatus, AuctionStatus } from '@prisma/client';
import { DomainEventsService } from '../../../core/events/domain-events.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SocketMetricsService } from '../../../core/realtime/socket-metrics.service';
import { DistributedLockService } from '../../../core/redis/distributed-lock.service';
import { AuctionCheckoutService } from './auction-checkout.service';
import { AuctionGateway } from '../gateways/auction.gateway';
import { AuctionService } from './auction.service';

interface CachedActiveAuctionLot {
  id: string;
  endTime: Date | null;
  lotStatus: AuctionStatus;
  isExtended: boolean;
}

interface CachedActiveAuction {
  id: string;
  endTime: Date;
  status: AuctionStatus;
  isExtended: boolean;
  items: CachedActiveAuctionLot[];
}

/** Recovers due auction lots, overdue awards, and broadcasts live room timer syncs. */
@Injectable()
export class AuctionLifecycleService implements OnModuleInit, OnModuleDestroy {
  private sweepTimer?: ReturnType<typeof setInterval>;
  private syncTimer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private syncing?: Promise<void>;
  private refreshingCache?: Promise<void>;
  private unsubscribeStateChanges?: () => void;
  private cachedActiveAuctions: CachedActiveAuction[] = [];
  private cacheLoaded = false;
  private cacheDirty = true;
  private readonly logger = new Logger(AuctionLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctions: AuctionService,
    private readonly checkout: AuctionCheckoutService,
    private readonly gateway: AuctionGateway,
    private readonly locks: DistributedLockService,
    @Optional() private readonly socketMetrics?: SocketMetricsService,
    @Optional() private readonly domainEvents?: DomainEventsService,
  ) {}

  /** Starts bounded, nonoverlapping deadline sweeps and 1-second WebSocket timer syncs. */
  onModuleInit(): void {
    this.unsubscribeStateChanges = this.domainEvents?.onAuctionStateChanged(() => {
      this.cacheDirty = true;
      void this.refreshActiveAuctionsCache().catch(() => undefined);
    });

    this.sweepTimer = setInterval(() => {
      if (this.running) return;
      // Closing a lot forfeits a deposit and notifies a bidder, so it must
      // happen once across the cluster rather than once per instance.
      this.running = this.locks
        .runExclusively('auction:deadline-sweep', 25, () => this.tick())
        .then(() => undefined)
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

  /** Stops timers, unsubscribes from domain events, and allows in-flight work to drain. */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.sweepTimer);
    clearInterval(this.syncTimer);
    this.unsubscribeStateChanges?.();
    this.unsubscribeStateChanges = undefined;
    await Promise.all([this.running, this.syncing, this.refreshingCache]);
  }

  /** Refreshes the in-memory active auction cache, coalescing concurrent reloads. */
  async refreshActiveAuctionsCache(): Promise<void> {
    if (this.refreshingCache) {
      return this.refreshingCache;
    }

    this.refreshingCache = this.prisma.auction
      .findMany({
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
      })
      .then((rows) => {
        this.cachedActiveAuctions = rows;
        this.cacheLoaded = true;
        this.cacheDirty = false;
      })
      .finally(() => {
        this.refreshingCache = undefined;
      });

    return this.refreshingCache;
  }

  /** Processes due auction lots, overdue 24h awards, and refreshes the active cache every 30s. */
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

    await this.refreshActiveAuctionsCache();
  }

  /** Broadcasts per-room and per-lot remaining seconds from cache without 1-second DB polling. */
  async syncActiveTimers(): Promise<void> {
    if (this.socketMetrics && this.socketMetrics.connectedClientsFor('/ws/auctions') === 0) {
      return;
    }

    if (!this.cacheLoaded || this.cacheDirty) {
      await this.refreshActiveAuctionsCache();
    }

    if (this.cachedActiveAuctions.length === 0) {
      return;
    }

    const nowMs = Date.now();
    for (const auction of this.cachedActiveAuctions) {
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
