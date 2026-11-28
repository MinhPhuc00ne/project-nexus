import {
  NotificationPublisher,
  publishNotifications,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AuctionItemStatus,
  AuctionStatus,
  BannerCreatorRole,
  NotificationChannel,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import type {
  AuctionStatus as NexusAuctionStatus,
  WsAuctionIntroItemPayload,
} from '@nexus/contracts';
import { DomainEventsService } from '../../../core/events/domain-events.service';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AdminCreateAuctionInput } from '../dtos/admin-create-auction.dto';
import { AdminUpdateAuctionInput } from '../dtos/admin-update-auction.dto';
import { AuctionGateway } from '../gateways/auction.gateway';
import { MIN_AUCTION_DURATION_MS, getIntroDurationMs } from './auction-domain.utils';

@Injectable()
export class AuctionAdminHelper {
  private readonly logger = new Logger(AuctionAdminHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionGateway: AuctionGateway,
    @Optional() private readonly domainEvents?: DomainEventsService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  /**
   * Admin creates a multi-lot auction room and notifies eligible Sellers using the room creation time
   * so they can consign items before the consignment deadline.
   */
  async adminCreateAuction(adminId: string, dto: AdminCreateAuctionInput) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid start or end time.');
    }
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('End time must be after start time.');
    }

    let consignmentDeadline: Date | null = null;
    if (dto.consignmentDeadline) {
      consignmentDeadline = new Date(dto.consignmentDeadline);
      if (Number.isNaN(consignmentDeadline.getTime())) {
        throw new BadRequestException('Invalid consignment deadline.');
      }
      if (
        consignmentDeadline.getTime() <= startTime.getTime() ||
        consignmentDeadline.getTime() >= endTime.getTime()
      ) {
        throw new BadRequestException(
          'Consignment deadline must be after the auction start time and before the end time.',
        );
      }
    }

    const minBuyerReputation = dto.minBuyerReputation ?? 40;
    const minSellerReputation = dto.minSellerReputation ?? 50;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.auction.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          imageUrl: dto.imageUrl?.trim() || null,
          createdByAdminId: adminId,
          status: AuctionStatus.SCHEDULED,
          startTime,
          endTime,
          originalEndTime: endTime,
          consignmentDeadline,
          minBuyerReputation,
          minSellerReputation,
          startingPrice: 0,
          bidIncrement: 100000,
        },
      });

      if (created.imageUrl?.trim()) {
        await tx.eventBanner.create({
          data: {
            title: created.title.trim().slice(0, 150),
            imageUrl: created.imageUrl.trim(),
            targetUrl: auctionTargetUrl(created.id),
            auctionId: created.id,
            startsAt: consignmentDeadline ?? startTime,
            endsAt: endTime,
            isActive: true,
            priority: 0,
            creatorId: adminId,
            creatorRole: BannerCreatorRole.ADMIN,
          },
        });
      }

      const eligibleSellers = await tx.user.findMany({
        where: {
          id: { not: adminId },
          role: Role.SELLER,
          isShopSuspended: false,
          reputationScore: { gte: minSellerReputation },
        },
        select: { id: true },
      });

      if (eligibleSellers.length > 0) {
        const createdAtLabel = created.createdAt.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        const deadlineLabel = consignmentDeadline
          ? consignmentDeadline.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          : startTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await publishNotifications(
          tx,
          eligibleSellers.map((seller) => ({
            userId: seller.id,
            auctionId: created.id,
            targetUrl: auctionTargetUrl(created.id),
            title: `New auction open for consignment: ${created.title}`,
            content: `Auction room created by Admin at ${createdAtLabel}. Eligible sellers may submit consigned items before ${deadlineLabel}.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_CONSIGNMENT_OPENED',
              auctionId: created.id,
              createdAt: created.createdAt.toISOString(),
              consignmentDeadline: consignmentDeadline?.toISOString() ?? null,
            },
          })),
          this.notifications,
        );
      }

      return created;
    });
  }

  /**
   * Admin updates a SCHEDULED auction room configuration.
   */
  async adminUpdateAuction(auctionId: string, dto: AdminUpdateAuctionInput) {
    const existing = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!existing) {
      throw new NotFoundException('Auction room not found.');
    }
    if (existing.status !== AuctionStatus.SCHEDULED && existing.status !== AuctionStatus.DRAFT) {
      throw new BadRequestException('Auction room can only be edited before it starts.');
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    const consignmentDeadline =
      dto.consignmentDeadline !== undefined
        ? dto.consignmentDeadline
          ? new Date(dto.consignmentDeadline)
          : null
        : existing.consignmentDeadline;

    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('End time must be after start time.');
    }
    if (
      consignmentDeadline &&
      (consignmentDeadline.getTime() <= startTime.getTime() ||
        consignmentDeadline.getTime() >= endTime.getTime())
    ) {
      throw new BadRequestException(
        'Consignment deadline must be after the start time and before the end time.',
      );
    }

    const updated = await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
        startTime,
        endTime,
        originalEndTime: endTime,
        consignmentDeadline,
        ...(dto.minBuyerReputation !== undefined
          ? { minBuyerReputation: dto.minBuyerReputation }
          : {}),
        ...(dto.minSellerReputation !== undefined
          ? { minSellerReputation: dto.minSellerReputation }
          : {}),
      },
    });

    try {
      const consignedItems = await this.prisma.auctionItem.findMany({
        where: { auctionId },
        select: { sellerId: true },
        distinct: ['sellerId'],
      });

      if (consignedItems.length > 0) {
        const deadlineLabel = consignmentDeadline
          ? consignmentDeadline.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          : startTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const endTimeLabel = endTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await publishNotifications(
          this.prisma,
          consignedItems.map((s) => ({
            userId: s.sellerId,
            auctionId: updated.id,
            targetUrl: auctionTargetUrl(updated.id),
            title: `Auction schedule updated: ${updated.title} ⏰`,
            content: `Auction "${updated.title}" that you consigned to has been rescheduled by Admin. Consignment deadline: ${deadlineLabel}, ends at: ${endTimeLabel}. Please check the updated schedule.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_SCHEDULE_UPDATED',
              auctionId: updated.id,
              consignmentDeadline: consignmentDeadline?.toISOString() ?? null,
              endTime: endTime.toISOString(),
            },
          })),
          this.notifications,
        );
      }

      await this.prisma.eventBanner.updateMany({
        where: { auctionId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim().slice(0, 150) } : {}),
          ...(dto.imageUrl !== undefined && dto.imageUrl ? { imageUrl: dto.imageUrl.trim() } : {}),
          startsAt: consignmentDeadline ?? startTime,
          endsAt: endTime,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to sync notification/banner during auction update: ${(err as Error).message}`,
      );
    }

    return updated;
  }

  /**
   * Admin locks consignment early so sellers can no longer submit new items to the room.
   */
  async adminLockConsignment(auctionId: string) {
    const existing = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!existing) {
      throw new NotFoundException('Auction room not found.');
    }
    if (existing.isConsignmentLocked) {
      return existing;
    }

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        isConsignmentLocked: true,
        consignmentLockedAt: new Date(),
      },
    });
  }

  /**
   * Admin starts a scheduled multi-lot auction session manually:
   * locks consignment, activates all approved lots simultaneously, broadcasts WebSocket `AUCTION_STARTED`,
   * and notifies Buyers that live viewing and bidding has opened.
   */
  async adminStartAuction(auctionId: string) {
    const now = new Date();
    const { updated, approvedLots } = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} FOR UPDATE`;
      const existing = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          items: {
            where: { status: AuctionItemStatus.APPROVED },
            orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
            include: {
              seller: {
                select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true },
              },
            },
          },
        },
      });
      if (!existing) {
        throw new NotFoundException('Auction room not found.');
      }
      if (existing.status !== AuctionStatus.SCHEDULED) {
        throw new BadRequestException('Can only start an auction room in scheduled state.');
      }
      if (existing.items.length === 0) {
        throw new BadRequestException('Auction room has no approved (APPROVED) items to start.');
      }

      const plannedDuration = existing.endTime.getTime() - existing.startTime.getTime();
      const targetEndTime =
        existing.endTime.getTime() > now.getTime() + 60_000
          ? existing.endTime
          : new Date(now.getTime() + Math.max(MIN_AUCTION_DURATION_MS, plannedDuration));

      await tx.auctionItem.updateMany({
        where: { auctionId, status: AuctionItemStatus.APPROVED },
        data: {
          lotStatus: AuctionStatus.ACTIVE,
          startTime: now,
          endTime: targetEndTime,
          originalEndTime: targetEndTime,
          isExtended: false,
        },
      });

      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: AuctionStatus.ACTIVE,
          isConsignmentLocked: true,
          consignmentLockedAt: existing.consignmentLockedAt ?? now,
          startTime: now,
          endTime: targetEndTime,
          originalEndTime: targetEndTime,
        },
      });

      return { updated: updatedAuction, approvedLots: existing.items };
    });

    const introDurationMs = getIntroDurationMs(approvedLots.length);
    const introItems: WsAuctionIntroItemPayload[] = approvedLots.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      images: item.images,
      threeModelKey: item.threeModelKey,
      lotNumber: item.lotNumber,
      startingPrice: Number(item.startingPrice ?? item.proposedStartingPrice),
      proposedStartingPrice: Number(item.proposedStartingPrice),
      reservePrice: item.reservePrice ? Number(item.reservePrice) : null,
      proposedReservePrice: item.proposedReservePrice ? Number(item.proposedReservePrice) : null,
      bidIncrement: Number(item.bidIncrement ?? item.proposedBidIncrement),
      proposedBidIncrement: Number(item.proposedBidIncrement),
      appraisalCertificateNumber: item.appraisalCertificateNumber,
      appraisalAgency: item.appraisalAgency,
      certificateImages: item.certificateImages,
      certificateIssueDate: item.certificateIssueDate?.toISOString() ?? null,
      lotStatus: AuctionStatus.ACTIVE as unknown as NexusAuctionStatus,
      currentHighestBid: 0,
      currentHighestBidderId: null,
      totalBidsCount: 0,
      startTime: now.toISOString(),
      endTime: updated.endTime.toISOString(),
      seller: item.seller,
    }));

    this.auctionGateway.broadcastAuctionStarted({
      auctionId: updated.id,
      title: updated.title,
      description: updated.description,
      startedAt: now.toISOString(),
      endTime: updated.endTime.toISOString(),
      serverTime: new Date().toISOString(),
      introDurationMs,
      items: introItems,
    });
    this.domainEvents?.publishAuctionStateChanged({
      auctionId: updated.id,
      reason: 'STARTED',
    });

    await this.dispatchAuctionStartNotifications(
      updated,
      approvedLots.map((item) => item.sellerId),
    );

    return {
      ...updated,
      startingPrice: Number(updated.startingPrice),
      bidIncrement: Number(updated.bidIncrement),
      introDurationMs,
      approvedLotsCount: approvedLots.length,
      items: introItems,
      lots: introItems,
    };
  }

  /**
   * Admin deletes a non-active auction room that has no bids or awards.
   */
  async adminDeleteAuction(auctionId: string) {
    const existing = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { _count: { select: { bids: true, awards: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Auction room not found.');
    }
    if (existing.status === AuctionStatus.ACTIVE || existing.status === AuctionStatus.EXTENDED) {
      throw new BadRequestException('Cannot delete an active auction room.');
    }
    if (existing._count.bids > 0 || existing._count.awards > 0) {
      throw new BadRequestException(
        'Cannot delete an auction room that already has bids or awards.',
      );
    }

    try {
      const consignedItems = await this.prisma.auctionItem.findMany({
        where: { auctionId },
        select: { sellerId: true },
        distinct: ['sellerId'],
      });

      if (consignedItems.length > 0) {
        await publishNotifications(
          this.prisma,
          consignedItems.map((s) => ({
            userId: s.sellerId,
            title: `Auction cancelled: ${existing.title} ⚠️`,
            content: `Auction "${existing.title}" has been cancelled by Admin. Items you consigned to this auction have been returned to your inventory.`,
            type: NotificationType.AUCTION,
            channel: NotificationChannel.IN_APP,
            metadata: {
              actionType: 'AUCTION_CANCELLED_BY_ADMIN',
              auctionTitle: existing.title,
            },
          })),
          this.notifications,
        );
      }

      await this.prisma.eventBanner.updateMany({
        where: { auctionId },
        data: { isActive: false },
      });
    } catch (err) {
      this.logger.error(
        `Failed to process notifications/banners when deleting auction: ${(err as Error).message}`,
      );
    }

    await this.prisma.auction.delete({ where: { id: auctionId } });
    return { success: true, deletedId: auctionId };
  }

  private async dispatchAuctionStartNotifications(
    auction: {
      id: string;
      title: string;
      startTime: Date;
      endTime: Date;
      minBuyerReputation: number;
    },
    consignedSellerIds: string[],
  ): Promise<void> {
    const buyerUsers = await this.prisma.user.findMany({
      where: {
        role: Role.BUYER,
        isShopSuspended: false,
        reputationScore: { gte: auction.minBuyerReputation },
      },
      select: { id: true },
    });

    const uniqueBuyerIds = buyerUsers.map((u) => u.id);
    const uniqueSellerIds = [...new Set(consignedSellerIds)];

    const notifications: Prisma.NotificationCreateManyInput[] = [];

    for (const userId of uniqueBuyerIds) {
      notifications.push({
        userId,
        auctionId: auction.id,
        targetUrl: auctionTargetUrl(auction.id),
        title: `Auction "${auction.title}" has started!`,
        content: 'The auction room is now live for 3D viewing and bidding.',
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'AUCTION_STARTED_BUYER',
          auctionId: auction.id,
          startedAt: auction.startTime.toISOString(),
          endTime: auction.endTime.toISOString(),
        },
      });
    }

    for (const sellerId of uniqueSellerIds) {
      notifications.push({
        userId: sellerId,
        auctionId: auction.id,
        targetUrl: `/seller/auctions/${auction.id}`,
        title: `Auction "${auction.title}" featuring your item has started!`,
        content:
          'The auction containing your consigned lot is now live. You can follow the room progress directly.',
        type: NotificationType.AUCTION,
        channel: NotificationChannel.IN_APP,
        metadata: {
          actionType: 'AUCTION_STARTED_SELLER',
          auctionId: auction.id,
        },
      });
    }

    if (notifications.length > 0) {
      await publishNotifications(this.prisma, notifications, this.notifications);
    }
  }
}
