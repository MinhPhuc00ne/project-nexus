import { Injectable } from '@nestjs/common';
import { AuctionItemStatus, AuctionStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { effectivePrice } from '../../../core/domain/product-price';
import {
  CommerceChatAuctionHit,
  CommerceChatCatalogResult,
  matchesChatSearchTokens,
  normalizeChatSearchText,
} from '../../../core/domain/commerce-chat.types';

@Injectable()
export class CatalogChatFacade {
  constructor(private readonly prisma: PrismaService) {}

  async searchCatalog(keyword: string): Promise<CommerceChatCatalogResult> {
    const normalizedQuery = normalizeChatSearchText(keyword);
    const tokens = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean) : [];
    const activeAuctionStatuses: AuctionStatus[] = [
      AuctionStatus.ACTIVE,
      AuctionStatus.EXTENDED,
      AuctionStatus.SCHEDULED,
    ];

    const [rawProducts, rawAuctions] = await Promise.all([
      typeof this.prisma.product?.findMany === 'function'
        ? this.prisma.product.findMany({
            where: {
              status: ProductStatus.ACTIVE,
              hiddenByShopSuspension: false,
              seller: { isShopSuspended: false },
            },
            select: {
              id: true,
              title: true,
              description: true,
              basePrice: true,
              salePrice: true,
              saleStartsAt: true,
              saleEndsAt: true,
              category: { select: { name: true } },
              inventories: { select: { availableQty: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        : Promise.resolve([]),
      typeof this.prisma.auction?.findMany === 'function'
        ? this.prisma.auction.findMany({
            where: { status: { in: activeAuctionStatuses } },
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              startingPrice: true,
              currentHighestBid: true,
              items: {
                where: {
                  status: AuctionItemStatus.APPROVED,
                  lotStatus: { in: activeAuctionStatuses },
                },
                orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
                select: {
                  id: true,
                  title: true,
                  description: true,
                  lotStatus: true,
                  startingPrice: true,
                  proposedStartingPrice: true,
                  currentHighestBid: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
        : Promise.resolve([]),
    ]);

    const now = new Date();
    const matchedProducts = rawProducts
      .filter((p) =>
        matchesChatSearchTokens(
          `${p.title} ${p.description ?? ''} ${p.category?.name ?? ''}`,
          tokens,
          normalizedQuery,
        ),
      )
      .sort((a, b) => {
        const aTitle = matchesChatSearchTokens(a.title, tokens, normalizedQuery) ? 0 : 1;
        const bTitle = matchesChatSearchTokens(b.title, tokens, normalizedQuery) ? 0 : 1;
        return aTitle - bTitle;
      })
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        price: effectivePrice(p, now),
        availableQty: (p.inventories ?? []).reduce(
          (sum, inv) => sum + Math.max(0, inv.availableQty),
          0,
        ),
      }));

    const auctionCandidates: { hit: CommerceChatAuctionHit; titleHit: boolean }[] = [];
    for (const auction of rawAuctions) {
      if (auction.items && auction.items.length > 0) {
        for (const item of auction.items) {
          if (
            matchesChatSearchTokens(
              `${item.title} ${item.description ?? ''} ${auction.title}`,
              tokens,
              normalizedQuery,
            )
          ) {
            const highest = Number(item.currentHighestBid ?? 0);
            const starting = Number(item.startingPrice ?? item.proposedStartingPrice ?? 0);
            auctionCandidates.push({
              hit: {
                id: item.id,
                auctionId: auction.id,
                title: item.title,
                auctionTitle: auction.title,
                status: item.lotStatus,
                price: highest > 0 ? highest : starting,
              },
              titleHit: matchesChatSearchTokens(item.title, tokens, normalizedQuery),
            });
          }
        }
      } else if (
        matchesChatSearchTokens(
          `${auction.title} ${auction.description ?? ''}`,
          tokens,
          normalizedQuery,
        )
      ) {
        const highest = Number(auction.currentHighestBid ?? 0);
        const starting = Number(auction.startingPrice ?? 0);
        auctionCandidates.push({
          hit: {
            id: auction.id,
            auctionId: auction.id,
            title: auction.title,
            auctionTitle: auction.title,
            status: auction.status,
            price: highest > 0 ? highest : starting,
          },
          titleHit: matchesChatSearchTokens(auction.title, tokens, normalizedQuery),
        });
      }
    }

    const statusRank = (status: AuctionStatus): number =>
      status === AuctionStatus.ACTIVE || status === AuctionStatus.EXTENDED ? 0 : 1;
    const matchedAuctions = auctionCandidates
      .sort((a, b) => {
        const titleDiff = Number(b.titleHit) - Number(a.titleHit);
        return titleDiff !== 0 ? titleDiff : statusRank(a.hit.status) - statusRank(b.hit.status);
      })
      .slice(0, 5)
      .map((entry) => entry.hit);

    return {
      query: keyword.trim(),
      products: matchedProducts,
      auctions: matchedAuctions,
    };
  }
}
