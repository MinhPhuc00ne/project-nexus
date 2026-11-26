import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuctionStatus } from '@nexus/types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  adminStartAuctionApi,
  adminLockConsignmentApi,
  getAdminAuctionItemsApi,
  getAdminAuctionsApi,
  type AdminAuctionListResponse,
  type AdminAuctionEntity,
  type AuctionConsignmentItem,
} from '@/features/auction/services/auction.service';
import { useToast } from '../../ToastNotification';
import { consignmentLockReason } from './consignmentAvailability';

type AdminAuctionRowWithItems = AdminAuctionEntity & {
  items?: AuctionConsignmentItem[];
};

function buildLegacyProductFallback(item: AdminAuctionRowWithItems): AuctionConsignmentItem[] {
  if (item.items && item.items.length > 0) {
    return item.items;
  }
  if (!item.product) {
    return [];
  }
  return [
    {
      id: item.product.id,
      title: item.product.title,
      description: item.description,
      images: item.imageUrl ? [item.imageUrl] : [],
      threeModelKey: item.product.threeModelKey,
      lotNumber: 1,
      startingPrice: Number(item.startingPrice ?? 0),
      bidIncrement: 0,
      seller: item.seller ?? undefined,
    },
  ];
}

async function resolveApprovedShowcaseItems(
  item: AdminAuctionRowWithItems,
): Promise<AuctionConsignmentItem[]> {
  try {
    const itemsRes = await getAdminAuctionItemsApi(item.id);
    const approvedItems: AuctionConsignmentItem[] = itemsRes.items
      .filter((lot) => lot.status === 'APPROVED')
      .sort((a, b) => (a.lotNumber ?? 999) - (b.lotNumber ?? 999))
      .map((lot) => {
        let reservePrice: number | null = null;
        if (lot.reservePrice) reservePrice = Number(lot.reservePrice);
        else if (lot.proposedReservePrice) reservePrice = Number(lot.proposedReservePrice);

        return {
          id: lot.id,
          title: lot.title,
          description: lot.description,
          images: lot.images,
          threeModelKey: lot.threeModelKey,
          appraisalCertificateNumber: lot.appraisalCertificateNumber,
          appraisalAgency: lot.appraisalAgency,
          certificateImages: lot.certificateImages,
          certificateIssueDate: lot.certificateIssueDate,
          status: lot.status,
          lotNumber: lot.lotNumber,
          startingPrice: lot.startingPrice
            ? Number(lot.startingPrice)
            : Number(lot.proposedStartingPrice),
          proposedStartingPrice: Number(lot.proposedStartingPrice),
          reservePrice,
          proposedReservePrice: lot.proposedReservePrice ? Number(lot.proposedReservePrice) : null,
          bidIncrement: lot.bidIncrement
            ? Number(lot.bidIncrement)
            : Number(lot.proposedBidIncrement),
          proposedBidIncrement: Number(lot.proposedBidIncrement),
          seller: lot.seller,
        };
      });

    return approvedItems.length > 0 ? approvedItems : buildLegacyProductFallback(item);
  } catch {
    return buildLegacyProductFallback(item);
  }
}

export function useAdminAuctions() {
  const { t } = useTranslation('admin');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { token } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<AdminAuctionListResponse | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<AdminAuctionEntity | null>(null);
  const [editingAuction, setEditingAuction] = useState<AdminAuctionEntity | null>(null);
  const [deletingAuction, setDeletingAuction] = useState<AdminAuctionEntity | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [lockingAuction, setLockingAuction] = useState<AdminAuctionEntity | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState('');
  const [showcaseState, setShowcaseState] = useState<{
    auctionId: string;
    title: string;
    description?: string;
    items: AuctionConsignmentItem[];
    playbackMode: 'live' | 'admin-replay';
  } | null>(null);

  async function openShowcaseForAuction(item: AdminAuctionEntity) {
    const items = await resolveApprovedShowcaseItems(item);
    setShowcaseState({
      auctionId: item.id,
      title: item.title,
      description: item.description,
      items,
      playbackMode: 'admin-replay',
    });
  }

  async function handleLockConsignment() {
    if (!lockingAuction || locking || startingId) return;
    const reasonKey = consignmentLockReason(lockingAuction, Date.now());
    if (reasonKey) {
      setLockError(t(`auctions.lockReasons.${reasonKey}`));
      return;
    }
    setLocking(true);
    setLockError('');
    try {
      const updated = await adminLockConsignmentApi(lockingAuction.id);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((row) =>
                row.id === updated.id ? { ...row, ...updated } : row,
              ),
            }
          : current,
      );
      setLockingAuction(null);
      toast.success(t('auctions.page.lockSuccess'));
    } catch (cause: unknown) {
      setLockError(cause instanceof Error ? cause.message : t('auctions.page.lockError'));
    } finally {
      setLocking(false);
    }
  }

  async function handleStartAuction(item: AdminAuctionEntity) {
    if (startingId) return;
    setStartingId(item.id);
    try {
      const started = await adminStartAuctionApi(item.id);
      const showcaseItems =
        started.items && started.items.length > 0
          ? started.items
          : await resolveApprovedShowcaseItems(item);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((row) =>
                row.id === item.id
                  ? {
                      ...row,
                      status: AuctionStatus.ACTIVE,
                      isConsignmentLocked: true,
                      items: showcaseItems,
                    }
                  : row,
              ),
            }
          : current,
      );
      toast.success(t('auctions.page.startSuccess', { title: item.title }));
      setShowcaseState({
        auctionId: started.id,
        title: started.title,
        description: started.description,
        items: showcaseItems,
        playbackMode: 'live',
      });
    } catch (cause: unknown) {
      toast.error(cause instanceof Error ? cause.message : t('auctions.page.startError'));
    } finally {
      setStartingId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    void getAdminAuctionsApi({
      page,
      limit: 10,
      search: keyword,
      status: (status || undefined) as AuctionStatus | undefined,
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : t('auctions.page.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, page, keyword, status, revision, t]);

  const lockReasonKey = lockingAuction ? consignmentLockReason(lockingAuction, now) : '';

  return {
    now,
    lockDisabledReason: lockReasonKey ? t(`auctions.lockReasons.${lockReasonKey}`) : '',
    token,
    data,
    status,
    setStatus,
    search,
    setSearch,
    setKeyword,
    page,
    setPage,
    setRevision,
    revision,
    loading,
    error,
    creating,
    setCreating,
    selectedAuction,
    setSelectedAuction,
    editingAuction,
    setEditingAuction,
    deletingAuction,
    setDeletingAuction,
    startingId,
    lockingAuction,
    setLockingAuction,
    locking,
    lockError,
    setLockError,
    showcaseState,
    setShowcaseState,
    openShowcaseForAuction,
    handleLockConsignment,
    handleStartAuction,
  };
}
