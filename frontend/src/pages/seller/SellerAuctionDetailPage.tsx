import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuctionStatus } from '@nexus/contracts';
import { formatCurrency } from '../../i18n/formatters';
import {
  ArrowLeft,
  Clock3,
  Gavel,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  createAuctionSocket,
  getAuctionDetailApi,
  getAuctionIntroShowcaseApi,
  getSellerAuctionConsignmentsApi,
  type AuctionConsignmentItem,
  type AuctionEntity,
  type AuctionIntroShowcaseResponse,
  type SellerAuctionConsignment,
} from '@/features/auction/services/auction.service';
import {
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';
import SellerAuctionLivePanel from '../../components/seller/SellerAuctionLivePanel';
import SellerAuctionItemsPanels from '../../components/seller/SellerAuctionItemsPanels';
import { canSubmitConsignment } from '../../components/seller/sellerConsignmentHelpers';

const money = (value?: number | string | null): string => formatCurrency(Number(value ?? 0));

/** Shows a Seller-facing read-only view of an auction and the seller's submitted lots. */
export default function SellerAuctionDetailPage(): ReactElement {
  const { t } = useTranslation('seller');
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<AuctionEntity | null>(null);
  const [consignments, setConsignments] = useState<SellerAuctionConsignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveLotIndex, setLiveLotIndex] = useState(0);
  const [showcase, setShowcase] = useState<AuctionIntroShowcaseResponse | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      setError(t('auctions.detail.missingIdErr'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [auctionData, sellerItems, showcaseData] = await Promise.all([
        getAuctionDetailApi(id),
        getSellerAuctionConsignmentsApi(),
        getAuctionIntroShowcaseApi(id),
      ]);
      setAuction(auctionData);
      setConsignments(sellerItems.filter((item) => item.auctionId === id));
      setShowcase(showcaseData);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : t('auctions.detail.loadErr'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // GET /auctions/:id only returns approved lots. The serialized live payload intentionally
  // omits the internal review status, so filtering by item.status here would remove every lot.
  const approvedItems = useMemo(() => auction?.items ?? auction?.lots ?? [], [auction]);
  const shouldConnectSocket =
    auction?.status === AuctionStatus.SCHEDULED ||
    auction?.status === AuctionStatus.ACTIVE ||
    auction?.status === AuctionStatus.EXTENDED;

  useEffect(() => {
    if (!auction?.id || !shouldConnectSocket) return undefined;

    const mapLotUpdate = (
      lots: AuctionConsignmentItem[] | undefined,
      lotId: string,
      updater: (lot: AuctionConsignmentItem) => AuctionConsignmentItem,
    ): AuctionConsignmentItem[] =>
      (lots ?? []).map((lot) => (lot.id === lotId ? updater(lot) : lot));

    const socket = createAuctionSocket(auction.id);
    socket.onBidPlaced((payload) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((current) => {
        if (!current) return current;
        const updater = (lot: AuctionConsignmentItem): AuctionConsignmentItem => ({
          ...lot,
          currentHighestBid: payload.bidAmount,
          totalBidsCount: payload.totalBidsCount ?? (lot.totalBidsCount ?? 0) + 1,
        });
        const nextItems = mapLotUpdate(
          current.items ?? current.lots,
          payload.auctionItemId,
          updater,
        );
        return {
          ...current,
          currentHighestBid: Math.max(Number(current.currentHighestBid || 0), payload.bidAmount),
          totalBidsCount: current.totalBidsCount + 1,
          items: nextItems,
          lots: nextItems,
        };
      });
    });
    socket.onTimeExtended((payload) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((current) => {
        if (!current) return current;
        const updater = (lot: AuctionConsignmentItem): AuctionConsignmentItem => ({
          ...lot,
          endTime: payload.newEndTime,
          isExtended: true,
          lotStatus: AuctionStatus.EXTENDED,
        });
        const nextItems = mapLotUpdate(
          current.items ?? current.lots,
          payload.auctionItemId,
          updater,
        );
        const currentRoomEndMs = new Date(current.endTime).getTime();
        const nextLotEndMs = new Date(payload.newEndTime).getTime();
        return {
          ...current,
          endTime:
            Number.isFinite(nextLotEndMs) && nextLotEndMs > currentRoomEndMs
              ? payload.newEndTime
              : current.endTime,
          isExtended: true,
          items: nextItems,
          lots: nextItems,
        };
      });
    });
    socket.onAuctionStarted((payload) => {
      if (payload.auctionId === auction.id) {
        void load();
        window.setTimeout(() => void load(), 250);
      }
    });
    socket.onTimerSync((payload) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((current) => {
        if (!current) return current;
        const lots = current.items ?? current.lots ?? [];
        const updatedLots = lots.map((lot) => {
          const timer = payload.lotTimers?.find((entry) => entry.auctionItemId === lot.id);
          return timer
            ? {
                ...lot,
                endTime: timer.endTime,
                lotStatus: timer.status,
                isExtended: timer.isExtended,
              }
            : lot;
        });
        return {
          ...current,
          endTime: payload.endTime,
          status: payload.status,
          isExtended: payload.isExtended,
          items: updatedLots,
          lots: updatedLots,
        };
      });
    });
    socket.onLotEnded((payload) => {
      if (payload.auctionId !== auction.id) return;
      void load();
    });

    return () => socket.disconnect();
  }, [auction?.id, shouldConnectSocket, load]);

  useEffect(() => {
    if (liveLotIndex >= approvedItems.length) setLiveLotIndex(0);
  }, [approvedItems.length, liveLotIndex]);

  if (loading) {
    return (
      <Panel title={t('auctions.detail.loadingTitle')}>
        <p className="py-10 text-center text-sm text-slate-500">
          {t('auctions.detail.loadingDesc')}
        </p>
      </Panel>
    );
  }

  if (error || !auction) {
    return (
      <Panel
        title={t('auctions.detail.errorTitle')}
        subtitle={error || t('auctions.detail.notFoundDesc')}
        action={
          <SellerButton secondary onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" />
            {t('auctions.detail.retry')}
          </SellerButton>
        }
      >
        <SellerLink secondary to="/seller/auctions">
          <ArrowLeft size={15} aria-hidden="true" />
          {t('auctions.detail.backToList')}
        </SellerLink>
      </Panel>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5" data-seller="page-stack">
      <PageHeading
        title={t('auctions.detail.pageTitle')}
        description={t('auctions.detail.pageDesc')}
        actions={
          <>
            <SellerButton secondary onClick={() => void load()}>
              <RefreshCw size={15} aria-hidden="true" />
              {t('auctions.detail.refresh')}
            </SellerButton>
            <SellerLink secondary to="/seller/auctions">
              <ArrowLeft size={15} aria-hidden="true" />
              {t('auctions.detail.sessionsList')}
            </SellerLink>
            {canSubmitConsignment(auction) && (
              <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auction.id)}`}>
                <PackageCheck size={15} aria-hidden="true" />
                {t('auctions.detail.addProduct')}
              </SellerLink>
            )}
          </>
        }
      />

      <SellerAuctionLivePanel
        auction={auction}
        approvedItems={approvedItems}
        liveLotIndex={liveLotIndex}
        onLiveLotChange={setLiveLotIndex}
        showcase={showcase}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('auctions.detail.statCurrentPrice')}
          value={money(auction.currentHighestBid || auction.startingPrice)}
          detail={t('auctions.detail.statCurrentPriceDetail')}
          icon={<Gavel size={19} aria-hidden="true" />}
        />
        <StatCard
          label={t('auctions.detail.statBids')}
          value={auction.totalBidsCount.toString()}
          detail={t('auctions.detail.statBidsDetail')}
          icon={<Users size={19} aria-hidden="true" />}
        />
        <StatCard
          label={t('auctions.detail.statApproved')}
          value={approvedItems.length.toString()}
          detail={t('auctions.detail.statApprovedDetail')}
          icon={<ShieldCheck size={19} aria-hidden="true" />}
        />
        <StatCard
          label={t('auctions.detail.statConsignments')}
          value={consignments.length.toString()}
          detail={t('auctions.detail.statConsignmentsDetail')}
          icon={<PackageCheck size={19} aria-hidden="true" />}
        />
      </div>

      <SellerAuctionItemsPanels
        auctionId={auction.id}
        auctionStatus={auction.status}
        consignmentDeadline={auction.consignmentDeadline}
        isConsignmentLocked={auction.isConsignmentLocked}
        approvedItems={approvedItems}
        consignments={consignments}
        liveItems={auction.items}
      />

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock3 size={15} aria-hidden="true" />
        {t('auctions.detail.apiFooter')}
      </div>
    </div>
  );
}
