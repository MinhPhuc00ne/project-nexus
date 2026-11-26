export interface RevenuePeriod {
  label: string;
  total: number;
  auction: number;
  normal: number;
  unit: string;
  labels: string[];
  // The backend scales each series independently. These are not VND amounts.
  auctionValues: number[];
  normalValues: number[];
}

export interface AdminOverviewAnalytics {
  revenuePeriods: RevenuePeriod[];
  revenueComposition: {
    totalAmount: number;
    totalLabel: string;
    primaryPercentage: number;
    items: {
      name: string;
      description: string;
      amount: string;
      rawAmount: number;
      percentage: string;
      color: string;
    }[];
  };
  bidFrequency: {
    subtitle: string;
    peakWindow: string;
    peakBidsPerMinute: number;
    health: string;
    totalBids: number;
    bidsPerUnit: number;
    labels: string[];
    values: number[];
    rawCounts: number[];
  };
}
