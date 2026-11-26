/**
 * Demo auctions across every stage of the lifecycle, placed around the moment
 * the seed runs.
 *
 * Two sessions are live with bidding history that ends seconds ago, so somebody
 * can open the room and outbid immediately. Two have just ended and are inside
 * the winner's payment window, which is what makes winner checkout and
 * second-chance offers demonstrable. Two are scheduled, and two are settled.
 */
import {
  AuctionAwardStatus,
  AuctionAwardTier,
  AuctionItemStatus,
  AuctionStatus,
  BidStatus,
  PrismaClient,
  Role,
} from '@prisma/client';
import { DemoClock, SeededRandom } from './random';
import type { DemoPeople } from './01-users-shops';

export interface DemoAuction {
  id: string;
  title: string;
  status: AuctionStatus;
  lotIds: string[];
}

export interface DemoAuctions {
  live: DemoAuction[];
  upcoming: DemoAuction[];
  awaitingPayment: DemoAuction[];
  settled: DemoAuction[];
}

interface SessionSpec {
  title: string;
  status: AuctionStatus;
  startMinutes: number;
  endMinutes: number;
  lots: number;
  /** Whether bidding history and an award are generated. */
  bids: boolean;
  award: 'none' | 'awaiting' | 'paid';
}

/** Minutes are relative to the moment the run starts; negative is in the past. */
const SESSIONS: SessionSpec[] = [
  {
    title: 'Phiên đấu giá trực tiếp: Gốm sứ Chu Đậu & Bát Tràng',
    status: AuctionStatus.ACTIVE,
    startMinutes: -20,
    endMinutes: 45,
    lots: 3,
    bids: true,
    award: 'none',
  },
  {
    title: 'Phiên đấu giá trực tiếp: Đồng hồ cơ & Máy ảnh phim',
    status: AuctionStatus.ACTIVE,
    startMinutes: -8,
    endMinutes: 72,
    lots: 2,
    bids: true,
    award: 'none',
  },
  {
    title: 'Phiên sắp diễn ra: Tủ chè, sập gụ Bắc Bộ',
    status: AuctionStatus.SCHEDULED,
    startMinutes: 180,
    endMinutes: 420,
    lots: 2,
    bids: false,
    award: 'none',
  },
  {
    title: 'Phiên sắp diễn ra: Tiền cổ Đông Dương & Tem thư',
    status: AuctionStatus.SCHEDULED,
    startMinutes: 1440,
    endMinutes: 1680,
    lots: 2,
    bids: false,
    award: 'none',
  },
  {
    title: 'Phiên vừa kết thúc: Tranh sơn mài Đông Dương',
    status: AuctionStatus.ENDED,
    startMinutes: -300,
    endMinutes: -25,
    lots: 2,
    bids: true,
    award: 'awaiting',
  },
  {
    title: 'Phiên vừa kết thúc: Thư pháp Hán Nôm lưu niên',
    status: AuctionStatus.ENDED,
    startMinutes: -420,
    endMinutes: -70,
    lots: 1,
    bids: true,
    award: 'awaiting',
  },
  {
    title: 'Phiên đã hoàn tất: Hoành phi câu đối sơn thếp',
    status: AuctionStatus.SETTLED,
    startMinutes: -60 * 24 * 9,
    endMinutes: -60 * 24 * 9 + 240,
    lots: 2,
    bids: true,
    award: 'paid',
  },
  {
    title: 'Phiên đã hoàn tất: Trường kỷ gỗ trắc khảm trai',
    status: AuctionStatus.SETTLED,
    startMinutes: -60 * 24 * 20,
    endMinutes: -60 * 24 * 20 + 300,
    lots: 1,
    bids: true,
    award: 'paid',
  },
];

const LOT_TITLES = [
  'Lô 1: Bình gốm hoa lam vẽ sen, cao 42cm',
  'Lô 2: Ấm gốm men ngọc phục chế nguyên khối',
  'Lô 3: Đĩa gốm vẽ cá chép, đường kính 28cm',
  'Lô 4: Đồng hồ Poljot 17 Jewels còn hộp gốc',
  'Lô 5: Canon AE-1 Program kèm ống 50mm f1.8',
  'Lô 6: Tủ chè gỗ gụ chạm tứ quý',
  'Lô 7: Sập gụ chân quỳ nguyên bản',
  'Lô 8: Tờ 1 đồng Đông Dương 1921',
  'Lô 9: Bộ tem Việt Nam 1968 còn keo',
  'Lô 10: Tranh sơn mài "Thiếu nữ bên hoa sen"',
  'Lô 11: Tranh sơn mài phong cảnh Hồ Tây',
  'Lô 12: Thư pháp "Tâm An" trên giấy dó',
  'Lô 13: Hoành phi "Đức Lưu Quang" sơn thếp',
  'Lô 14: Đôi câu đối gỗ mít chạm triện',
  'Lô 15: Trường kỷ gỗ trắc khảm trai',
];

/**
 * Creates the demo auctions, their lots, bid history and awards.
 *
 * @param prisma - A connected client.
 * @param clock - The run's clock.
 * @param random - The run's generator.
 * @param people - The sellers consigning lots and the buyers bidding.
 * @returns The auctions grouped by what a demo would use them for.
 */
export async function seedAuctionsAndBids(
  prisma: PrismaClient,
  clock: DemoClock,
  random: SeededRandom,
  people: DemoPeople,
): Promise<DemoAuctions> {
  const grouped: DemoAuctions = { live: [], upcoming: [], awaitingPayment: [], settled: [] };
  let lotCursor = 0;

  for (const spec of SESSIONS) {
    const startTime = clock.minutesFromNow(spec.startMinutes);
    const endTime = clock.minutesFromNow(spec.endMinutes);
    const seller = random.pick(people.sellers);
    const startingPrice = random.money(1_000_000, 9_000_000, 100_000);
    const bidIncrement = random.money(100_000, 500_000, 50_000);

    const auction = await prisma.auction.create({
      data: {
        title: spec.title,
        description: `${spec.title}. Hiện vật đã qua thẩm định, có giấy chứng nhận kèm theo.`,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(spec.title)}/1200/675`,
        sellerId: seller.id,
        createdByAdminId: people.admin.id,
        startingPrice,
        bidIncrement,
        reservePrice: Math.round((startingPrice * 1.4) / 100_000) * 100_000,
        status: spec.status,
        startTime,
        endTime,
        originalEndTime: endTime,
        minBuyerReputation: 40,
        minSellerReputation: 50,
        createdAt: clock.minutesFromNow(spec.startMinutes - random.int(2880, 10080)),
      },
      select: { id: true },
    });

    const lotIds: string[] = [];

    for (let lotIndex = 0; lotIndex < spec.lots; lotIndex += 1) {
      const lotTitle = LOT_TITLES[lotCursor % LOT_TITLES.length];
      lotCursor += 1;
      const lotStarting = random.money(800_000, 15_000_000, 100_000);
      const lotIncrement = random.money(100_000, 600_000, 50_000);

      const lot = await prisma.auctionItem.create({
        data: {
          auctionId: auction.id,
          sellerId: seller.id,
          title: lotTitle,
          description: `${lotTitle}. Kèm ảnh chi tiết và giấy thẩm định.`,
          images: Array.from(
            { length: 3 },
            (_, imageIndex) =>
              `https://picsum.photos/seed/${encodeURIComponent(`${lotTitle}-${imageIndex}`)}/900/675`,
          ),
          proposedStartingPrice: lotStarting,
          proposedBidIncrement: lotIncrement,
          proposedReservePrice: Math.round((lotStarting * 1.35) / 100_000) * 100_000,
          startingPrice: lotStarting,
          bidIncrement: lotIncrement,
          reservePrice: Math.round((lotStarting * 1.35) / 100_000) * 100_000,
          lotNumber: lotIndex + 1,
          status: AuctionItemStatus.APPROVED,
          lotStatus: spec.status,
          startTime,
          endTime,
          originalEndTime: endTime,
          reviewedByAdminId: people.admin.id,
          reviewedAt: clock.minutesFromNow(spec.startMinutes - random.int(60, 2880)),
          appraisalCertificateNumber: `NEX-${random.int(10_000, 99_999)}`,
          appraisalAgency: random.pick([
            'Trung tâm Thẩm định Cổ vật Hà Nội',
            'Hội Cổ vật Thăng Long',
            'Viện Giám định Mỹ thuật',
          ]),
          certificateImages: [
            `https://picsum.photos/seed/${encodeURIComponent(`cert-${lotTitle}`)}/900/1200`,
          ],
          certificateIssueDate: clock.daysAgo(random.int(30, 400)),
          weightGrams: random.int(500, 15_000),
        },
        select: { id: true },
      });
      lotIds.push(lot.id);

      if (!spec.bids) continue;

      // Bidding history walks upward and, for a live session, lands seconds
      // before now so the room looks alive the moment it is opened.
      const bidders = random.sample(people.buyers, Math.min(3, people.buyers.length));
      const bidCount = random.int(3, 7);
      let amount = lotStarting;
      let lastBid: { id: string; bidderId: string; amount: number } | null = null;

      for (let bidIndex = 0; bidIndex < bidCount; bidIndex += 1) {
        amount += lotIncrement * random.int(1, 3);
        const bidder = bidders[bidIndex % bidders.length];
        const isLast = bidIndex === bidCount - 1;
        const placedAt =
          spec.status === AuctionStatus.ACTIVE
            ? clock.minutesAgo(isLast ? random.int(0, 2) : random.int(3, 18))
            : new Date(endTime.getTime() - (isLast ? 45_000 : random.int(2, 90) * 60_000));

        const bid = await prisma.bid.create({
          data: {
            auctionId: auction.id,
            auctionItemId: lot.id,
            bidderId: bidder.id,
            bidAmount: amount,
            status: isLast ? BidStatus.WINNING : BidStatus.SUPERSEDED,
            placedAt,
          },
          select: { id: true },
        });
        lastBid = { id: bid.id, bidderId: bidder.id, amount };
      }

      if (lastBid) {
        await prisma.auctionItem.update({
          where: { id: lot.id },
          data: {
            currentHighestBid: lastBid.amount,
            currentHighestBidderId: lastBid.bidderId,
            totalBidsCount: bidCount,
          },
        });
        await prisma.auction.update({
          where: { id: auction.id },
          data: {
            currentHighestBid: lastBid.amount,
            currentHighestBidderId: lastBid.bidderId,
            totalBidsCount: { increment: bidCount },
          },
        });

        if (spec.award !== 'none') {
          const deposit = Math.round((lastBid.amount * 0.1) / 1000) * 1000;
          await prisma.auctionAward.create({
            data: {
              auctionId: auction.id,
              auctionItemId: lot.id,
              bidId: lastBid.id,
              buyerId: lastBid.bidderId,
              tier: AuctionAwardTier.PRIMARY_WINNER,
              offerAmount: lastBid.amount,
              depositAmount: deposit,
              status:
                spec.award === 'awaiting'
                  ? AuctionAwardStatus.AWAITING_CHECKOUT
                  : AuctionAwardStatus.PAID,
              // An awaiting award keeps a window that is still open, which is
              // what makes winner checkout testable right now.
              expiresAt:
                spec.award === 'awaiting'
                  ? clock.hoursFromNow(random.int(6, 40))
                  : new Date(endTime.getTime() + 48 * 3_600_000),
              confirmedAt: spec.award === 'paid' ? new Date(endTime.getTime() + 3_600_000) : null,
              completedAt: spec.award === 'paid' ? new Date(endTime.getTime() + 7_200_000) : null,
            },
          });
        }
      }
    }

    // A complaint on one settled session gives the admin queue something real.
    if (spec.status === AuctionStatus.SETTLED && random.chance(0.5) && lotIds.length > 0) {
      await prisma.auctionComplaint.create({
        data: {
          auctionId: auction.id,
          auctionItemId: lotIds[0],
          reporterId: random.pick(people.buyers).id,
          reporterRole: Role.BUYER,
          reason: 'Hiện vật nhận được có vết nứt không thể hiện trong ảnh mô tả.',
          evidenceUrls: [
            `https://picsum.photos/seed/${encodeURIComponent(`complaint-${auction.id}`)}/900/675`,
          ],
          createdAt: new Date(endTime.getTime() + 2 * 86_400_000),
        },
      });
    }

    const entry: DemoAuction = { id: auction.id, title: spec.title, status: spec.status, lotIds };
    if (spec.status === AuctionStatus.ACTIVE) grouped.live.push(entry);
    else if (spec.status === AuctionStatus.SCHEDULED) grouped.upcoming.push(entry);
    else if (spec.status === AuctionStatus.ENDED) grouped.awaitingPayment.push(entry);
    else grouped.settled.push(entry);
  }

  return grouped;
}
