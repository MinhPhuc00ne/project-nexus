import { useCallback, useEffect, useState } from 'react';
import { AuctionStatus } from '@nexus/contracts';
import { getSellerAuctionConsignmentsApi } from '@/features/auction/services/auction.service';
import { getSellerOrders } from '@/features/orders/services/sellerOrders';
import { getSellerRevenue } from '@/features/wallet/services/sellerFinance';
import type { SellerAuctionConsignment } from '@/features/auction/types/auction-consignment.types';
import type { SellerOrder } from '@/features/orders/types/order.types';
import type { SellerRevenue } from '@/features/wallet/types/seller-finance.types';

/** An auction is live while it is taking bids, including an extension. */
const LIVE_AUCTION_STATUSES: AuctionStatus[] = [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED];

/** What the dashboard knows about the shop's money and orders. */
export interface SellerOverviewState {
  overview: SellerRevenue | null;
  /** How many of the shop's approved lots are taking bids right now. */
  liveAuctions: number | null;
  isLoading: boolean;
  /** Set when the figures could not be read; the panels then show a dash. */
  error: string | null;
  reload: () => void;
}

/**
 * Reads the shop's revenue overview for the dashboard.
 *
 * The dashboard showed either a dash or a set of invented figures — 348,6M in
 * revenue, three pending orders, a 62,6%/37,4% split — swapped in by a "view
 * sample data" button. `/seller/finance/revenue` has had the real ones all
 * along: the wallet, the order counts by state, gross and net revenue, the
 * platform's fee and a monthly breakdown. The finance page already read it; the
 * dashboard did not.
 *
 * @returns The overview, whether it is still loading, and a way to try again.
 */
export function useSellerOverview(): SellerOverviewState {
  const [overview, setOverview] = useState<SellerRevenue | null>(null);
  const [liveAuctions, setLiveAuctions] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getSellerRevenue()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        console.error('Unable to load the seller revenue overview:', caught);
        setError(caught instanceof Error ? caught.message : 'unknown');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // The lot count comes from the seller's own consignments: an approved lot
    // whose auction is taking bids. A failure here does not fail the panel —
    // the revenue figures are the point of it — so the count stays unknown.
    getSellerAuctionConsignmentsApi()
      .then((consignments) => {
        if (cancelled) return;
        setLiveAuctions(consignments.filter(isLiveAuction).length);
      })
      .catch((caught: unknown) => {
        console.error('Unable to count the live auctions:', caught);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { overview, liveAuctions, isLoading, error, reload };
}

/**
 * Whether a consigned lot is taking bids right now.
 *
 * @param consignment - The lot and the auction it belongs to.
 * @returns True when the lot was approved and its auction is live.
 */
export function isLiveAuction(consignment: SellerAuctionConsignment): boolean {
  return (
    consignment.status === 'APPROVED' && LIVE_AUCTION_STATUSES.includes(consignment.auction.status)
  );
}

/**
 * The shop's most recent orders, for the dashboard's short list.
 *
 * The panel used to list three invented orders — a fixed buyer, a fixed price,
 * a status of "packing" — behind the same sample-data button. The seller orders
 * endpoint answers the real ones, newest first, and the orders page already
 * reads it.
 *
 * @param limit - How many to show.
 * @returns The orders and whether they are still loading.
 */
export function useSellerRecentOrders(limit: number): {
  orders: SellerOrder[];
  isLoading: boolean;
} {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSellerOrders({ page: 1, limit })
      .then((page) => {
        if (!cancelled) setOrders(page.items);
      })
      .catch((caught: unknown) => {
        console.error('Unable to load the recent seller orders:', caught);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { orders, isLoading };
}

/**
 * The shop's consigned auction lots, newest first.
 *
 * @returns The lots and whether they are still loading.
 */
export function useSellerConsignments(): {
  consignments: SellerAuctionConsignment[];
  isLoading: boolean;
} {
  const [consignments, setConsignments] = useState<SellerAuctionConsignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSellerAuctionConsignmentsApi()
      .then((items) => {
        if (!cancelled) setConsignments(items);
      })
      .catch((caught: unknown) => {
        console.error('Unable to load the seller consignments:', caught);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { consignments, isLoading };
}
