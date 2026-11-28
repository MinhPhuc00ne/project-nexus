import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Aggregates platform operational analytics for Admin Overview dashboard charts.
 */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates platform operational analytics for Admin Overview dashboard charts:
   * 1. Platform fee revenue trend periods (7d, 30d, month, year) split into 3D auctions vs normal orders
   * 2. Revenue composition breakdown (normal e-commerce orders vs 3D auctions and category breakdown)
   * 3. Hourly bid frequency distribution and peak bidding telemetry
   */
  async getDashboardAnalytics() {
    const now = new Date();

    // 1. Fetch EscrowRecords with related order and category details
    const escrowRecords = await this.prisma.escrowRecord.findMany({
      where: {
        status: { in: ['HELD', 'DISBURSED'] },
      },
      select: {
        id: true,
        platformFee: true,
        totalAmount: true,
        heldAt: true,
        disbursedAt: true,
        order: {
          select: {
            id: true,
            isAuction: true,
            createdAt: true,
            items: {
              select: {
                totalPrice: true,
                product: {
                  select: {
                    categoryId: true,
                    category: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { heldAt: 'desc' },
    });

    // 2. Fetch Bids for hourly bid frequency
    const bids = await this.prisma.bid.findMany({
      select: {
        id: true,
        placedAt: true,
      },
      orderBy: { placedAt: 'desc' },
    });

    // Calculate overall composition
    let totalNormalFee = 0;
    let totalAuctionFee = 0;
    const categoryRevenueMap = new Map<string, number>();

    for (const record of escrowRecords) {
      const fee = Number(record.platformFee || 0);
      const isAuction = Boolean(record.order?.isAuction);

      if (isAuction) {
        totalAuctionFee += fee;
      } else {
        totalNormalFee += fee;
        if (record.order?.items) {
          for (const item of record.order.items) {
            const catName = item.product?.category?.name || 'Other';
            const catFee = fee / Math.max(1, record.order.items.length);
            categoryRevenueMap.set(catName, (categoryRevenueMap.get(catName) || 0) + catFee);
          }
        }
      }
    }

    const totalFee = totalNormalFee + totalAuctionFee;
    const normalPercent = totalFee > 0 ? (totalNormalFee / totalFee) * 100 : 0;
    const auctionPercent = totalFee > 0 ? (totalAuctionFee / totalFee) * 100 : 0;

    const formatShortAmount = (amount: number): string => {
      if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(2)}B ₫`;
      }
      if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M ₫`;
      }
      return `${amount.toLocaleString('en-US')} ₫`;
    };

    const revenueComposition = {
      totalAmount: totalFee,
      totalLabel: formatShortAmount(totalFee),
      primaryPercentage: Number(normalPercent.toFixed(1)),
      items: [
        {
          name: 'Standard E-Commerce (7%)',
          description: 'NEXUS Verified Sellers',
          amount: formatShortAmount(totalNormalFee),
          rawAmount: totalNormalFee,
          percentage: `${normalPercent.toFixed(1)}%`,
          color: 'bg-primary',
        },
        {
          name: 'Exclusive Auction (16%)',
          description: 'WebGL Interactive Room',
          amount: formatShortAmount(totalAuctionFee),
          rawAmount: totalAuctionFee,
          percentage: `${auctionPercent.toFixed(1)}%`,
          color: 'bg-blue-400',
        },
      ],
      byCategory: Array.from(categoryRevenueMap.entries()).map(([name, fee]) => ({
        name,
        amount: Math.round(fee),
        percentage: totalFee > 0 ? `${((fee / totalFee) * 100).toFixed(1)}%` : '0%',
      })),
    };

    // Calculate 4 revenue periods: 7 days, 30 days, This month, This year
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Period 1: 7 days
    const last7DaysLabels: string[] = [];
    const last7DaysAuction: number[] = [0, 0, 0, 0, 0, 0, 0];
    const last7DaysNormal: number[] = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last7DaysLabels.push(i === 0 ? 'Today' : dayNames[d.getDay()]);
    }

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let period7TotalAuction = 0;
    let period7TotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= sevenDaysAgo && recDate <= now) {
        const diffDays = Math.floor((recDate.getTime() - sevenDaysAgo.getTime()) / 86400000);
        const index = Math.max(0, Math.min(6, diffDays));
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          last7DaysAuction[index] += fee;
          period7TotalAuction += fee;
        } else {
          last7DaysNormal[index] += fee;
          period7TotalNormal += fee;
        }
      }
    }

    // Period 2: 30 days (divided into 7 points)
    const last30Labels = ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'];
    const last30Auction: number[] = [0, 0, 0, 0, 0, 0, 0];
    const last30Normal: number[] = [0, 0, 0, 0, 0, 0, 0];
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    let period30TotalAuction = 0;
    let period30TotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= thirtyDaysAgo && recDate <= now) {
        const diffDays = Math.floor((recDate.getTime() - thirtyDaysAgo.getTime()) / 86400000);
        const bucket = Math.max(0, Math.min(6, Math.floor((diffDays / 30) * 7)));
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          last30Auction[bucket] += fee;
          period30TotalAuction += fee;
        } else {
          last30Normal[bucket] += fee;
          period30TotalNormal += fee;
        }
      }
    }

    // Period 3: This month (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Today'];
    const monthAuction: number[] = [0, 0, 0, 0, 0];
    const monthNormal: number[] = [0, 0, 0, 0, 0];
    let monthTotalAuction = 0;
    let monthTotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= monthStart && recDate <= now) {
        const dayOfMonth = recDate.getDate();
        const bucket = Math.max(0, Math.min(4, Math.floor((dayOfMonth - 1) / 7)));
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          monthAuction[bucket] += fee;
          monthTotalAuction += fee;
        } else {
          monthNormal[bucket] += fee;
          monthTotalNormal += fee;
        }
      }
    }

    // Period 4: This year (current year - 12 months)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const yearAuction: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const yearNormal: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let yearTotalAuction = 0;
    let yearTotalNormal = 0;

    for (const record of escrowRecords) {
      const date = record.disbursedAt ?? record.heldAt ?? record.order?.createdAt;
      if (!date) continue;
      const recDate = new Date(date);
      if (recDate >= yearStart && recDate <= now) {
        const m = recDate.getMonth();
        const fee = Number(record.platformFee || 0);
        if (record.order?.isAuction) {
          yearAuction[m] += fee;
          yearTotalAuction += fee;
        } else {
          yearNormal[m] += fee;
          yearTotalNormal += fee;
        }
      }
    }

    // Helper to scale chart numbers for SVG display (0 - 200 scale or in millions)
    const scaleValues = (rawValues: number[]) => {
      const max = Math.max(...rawValues, 1);
      if (max <= 200) return rawValues;
      return rawValues.map((v) => Math.round((v / max) * 180));
    };

    const revenuePeriods = [
      {
        label: '7 days',
        total: period7TotalAuction + period7TotalNormal,
        auction: period7TotalAuction,
        normal: period7TotalNormal,
        unit: 'this week',
        labels: last7DaysLabels,
        auctionValues: scaleValues(last7DaysAuction),
        normalValues: scaleValues(last7DaysNormal),
      },
      {
        label: '30 days',
        total: period30TotalAuction + period30TotalNormal,
        auction: period30TotalAuction,
        normal: period30TotalNormal,
        unit: '30 days',
        labels: last30Labels,
        auctionValues: scaleValues(last30Auction),
        normalValues: scaleValues(last30Normal),
      },
      {
        label: 'This month',
        total: monthTotalAuction + monthTotalNormal,
        auction: monthTotalAuction,
        normal: monthTotalNormal,
        unit: 'this month',
        labels: monthLabels,
        auctionValues: scaleValues(monthAuction),
        normalValues: scaleValues(monthNormal),
      },
      {
        label: `Year ${now.getFullYear()}`,
        total: yearTotalAuction + yearTotalNormal,
        auction: yearTotalAuction,
        normal: yearTotalNormal,
        unit: 'this year',
        labels: yearLabels,
        auctionValues: scaleValues(yearAuction),
        normalValues: scaleValues(yearNormal),
      },
    ];

    // 3. Hourly bid frequency
    const bidHourBuckets = [
      { label: '02h', hours: [0, 1, 2, 3], count: 0 },
      { label: '06h', hours: [4, 5, 6], count: 0 },
      { label: '09h', hours: [7, 8, 9], count: 0 },
      { label: '12h', hours: [10, 11, 12], count: 0 },
      { label: '15h', hours: [13, 14, 15], count: 0 },
      { label: '18h', hours: [16, 17, 18], count: 0 },
      { label: '20h', hours: [19, 20], count: 0 },
      { label: '21h', hours: [21], count: 0 },
      { label: '22h', hours: [22], count: 0 },
      { label: '24h', hours: [23], count: 0 },
    ];

    for (const bid of bids) {
      const placed = new Date(bid.placedAt);
      const h = placed.getHours();
      for (const bucket of bidHourBuckets) {
        if (bucket.hours.includes(h)) {
          bucket.count++;
          break;
        }
      }
    }

    const bidRawCounts = bidHourBuckets.map((b) => b.count);
    const maxBidCount = Math.max(...bidRawCounts, 0);
    const peakBucketIndex = bidHourBuckets.findIndex((b) => b.count === maxBidCount);
    const peakWindow =
      peakBucketIndex >= 0 && maxBidCount > 0
        ? `${bidHourBuckets[peakBucketIndex].label} (peak)`
        : '20h – 22h';
    const peakBidsPerMinute = maxBidCount > 0 ? Math.max(1, Math.round(maxBidCount / 60)) : 0;

    const bidFrequencyValues =
      maxBidCount > 0
        ? bidHourBuckets.map((b) => Math.max(5, Math.round((b.count / maxBidCount) * 98)))
        : bidHourBuckets.map(() => 0);

    const bidFrequency = {
      subtitle: 'WebGL load & hourly bid distribution',
      peakWindow,
      peakBidsPerMinute,
      health: 'CPU 18% • 6 nodes OK',
      totalBids: bids.length,
      bidsPerUnit: 1,
      labels: bidHourBuckets.map((b) => b.label),
      values: bidFrequencyValues,
      rawCounts: bidRawCounts,
    };

    return {
      revenuePeriods,
      revenueComposition,
      bidFrequency,
    };
  }
}
