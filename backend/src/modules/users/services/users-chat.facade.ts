import { Injectable } from '@nestjs/common';
import { AuctionItemStatus, AuctionStatus, ReputationTrustLevel, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  CommerceChatAccountStatus,
  CommerceChatAuctionEligibility,
  matchesChatSearchTokens,
  normalizeChatSearchText,
} from '../../../core/domain/commerce-chat.types';

@Injectable()
export class UsersChatFacade {
  constructor(private readonly prisma: PrismaService) {}

  async accountEligibility(
    userId: string,
    auctionNameFilter?: string,
  ): Promise<CommerceChatAccountStatus | null> {
    if (typeof this.prisma.user?.findUnique !== 'function') return null;
    const activeAuctionStatuses: AuctionStatus[] = [
      AuctionStatus.ACTIVE,
      AuctionStatus.EXTENDED,
      AuctionStatus.SCHEDULED,
    ];
    const [user, rawAuctions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          isVerified: true,
          isSellerActive: true,
          isShopSuspended: true,
          reputationScore: true,
          trustLevel: true,
          wallet: { select: { balance: true, lockedBalance: true } },
        },
      }),
      typeof this.prisma.auction?.findMany === 'function'
        ? this.prisma.auction.findMany({
            where: { status: { in: activeAuctionStatuses } },
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              minBuyerReputation: true,
              items: {
                where: {
                  status: AuctionItemStatus.APPROVED,
                  lotStatus: { in: activeAuctionStatuses },
                },
                orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
                select: { id: true, title: true, description: true },
              },
            },
            orderBy: [{ minBuyerReputation: 'asc' }, { createdAt: 'desc' }],
            take: 50,
          })
        : Promise.resolve([]),
    ]);
    if (!user || typeof user.reputationScore !== 'number') return null;

    const minBuyerReputation = 40;
    const globalReasons: string[] = [];
    if (user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF) {
      globalReasons.push('Admin / Support Staff accounts cannot place bids.');
    }
    if (user.isSellerActive) {
      globalReasons.push(
        'Account is currently in Seller mode. Switch back to Buyer mode to place bids.',
      );
    }
    if (user.isShopSuspended || user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      globalReasons.push('Account is suspended or has restricted trading privileges.');
    }
    if (!user.wallet) {
      globalReasons.push('NEXUS Pay wallet has not been initialized to lock bid deposits.');
    }

    const normalizedFilter = normalizeChatSearchText(auctionNameFilter ?? '');
    const filterTokens = normalizedFilter ? normalizedFilter.split(' ').filter(Boolean) : [];
    const filteredAuctions = filterTokens.length
      ? rawAuctions.filter((auction) => {
          const roomMatch = matchesChatSearchTokens(
            `${auction.title} ${auction.description ?? ''}`,
            filterTokens,
            normalizedFilter,
          );
          const itemMatch = (auction.items ?? []).some((item) =>
            matchesChatSearchTokens(
              `${item.title} ${item.description ?? ''}`,
              filterTokens,
              normalizedFilter,
            ),
          );
          return roomMatch || itemMatch;
        })
      : rawAuctions;

    const evaluatedAuctions: CommerceChatAuctionEligibility[] = filteredAuctions.map((auction) => {
      const requiredRep =
        typeof auction.minBuyerReputation === 'number'
          ? auction.minBuyerReputation
          : minBuyerReputation;
      const reasons = [...globalReasons];
      if (user.reputationScore < requiredRep) {
        reasons.push(
          `Current reputation score (${user.reputationScore}) is below the session requirement (${requiredRep}).`,
        );
      }
      const matchedItems = filterTokens.length
        ? (auction.items ?? [])
            .filter((item) =>
              matchesChatSearchTokens(
                `${item.title} ${item.description ?? ''}`,
                filterTokens,
                normalizedFilter,
              ),
            )
            .map((item) => item.title)
        : [];
      return {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        minBuyerReputation: requiredRep,
        eligible: reasons.length === 0,
        reasons,
        matchedItems,
      };
    });

    const eligibleAuctions = evaluatedAuctions.filter((a) => a.eligible);
    const ineligibleAuctions = evaluatedAuctions.filter((a) => !a.eligible);

    const summaryReasons = [...globalReasons];
    if (user.reputationScore < minBuyerReputation) {
      summaryReasons.push(
        `Current reputation score (${user.reputationScore}) is below the minimum requirement (${minBuyerReputation}).`,
      );
    }

    return {
      role: user.role,
      isVerified: user.isVerified,
      isSellerActive: user.isSellerActive,
      isShopSuspended: user.isShopSuspended,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      hasWallet: Boolean(user.wallet),
      availableBalance: Number(user.wallet?.balance ?? 0),
      lockedBalance: Number(user.wallet?.lockedBalance ?? 0),
      minBuyerReputation,
      auctionEligible: evaluatedAuctions.length
        ? eligibleAuctions.length > 0
        : summaryReasons.length === 0,
      auctionReasons: summaryReasons,
      auctions: evaluatedAuctions,
      eligibleAuctions,
      ineligibleAuctions,
    };
  }
}
