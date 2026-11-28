import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { Heart, Share2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { BidStatus, AuctionStatus } from '@nexus/contracts';
import type {
  AuctionViewerMode,
  AuctionTabKey,
  SimilarWatch,
} from '@/features/auction/types/auction.types';
import AuctionGallery from '../../components/auction/AuctionGallery';
import AuctionBidTerminal from '../../components/auction/AuctionBidTerminal';
import AuctionSupportRequest from '../../components/auction/AuctionSupportRequest';
import AuctionDetailTabs from '../../components/auction/AuctionDetailTabs';
import { getLotBidHistory, mergeBidHistory } from '../../components/auction/bidHistory';
import SimilarAuctionsSection from '../../components/auction/SimilarAuctionsSection';
import { CinematicAuctionIntro } from '../../components/auction/CinematicAuctionIntro';
import { AuctionShowcaseHUD } from '../../components/auction/showcase/AuctionShowcaseHUD';
import {
  getAuctionsApi,
  getAuctionDetailApi,
  getAuctionIntroShowcaseApi,
  placeBidApi,
  createAuctionSocket,
  checkBuyerEligibilityApi,
  formatAuctionImage,
  type AuctionEntity,
  type AuctionConsignmentItem,
  type BuyerEligibilityResponse,
  type AuctionBidItem,
} from '@/features/auction/services/auction.service';
import { getStoredToken } from '@/features/auth/services/auth';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Live auction room page for guests and buyers with real-time WebSocket bidding,
 * 3D showcase playback, and lot-level bid terminal synchronization.
 */
export const AuctionPage: React.FC = () => {
  const { t, i18n } = useTranslation('auction');
  const { user } = useAuth();
  const userRef = useRef(user);
  const { id } = useParams<{ id: string }>();
  const [activeAuction, setActiveAuction] = useState<AuctionEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<AuctionTabKey>('certs');
  const [viewerMode, setViewerMode] = useState<AuctionViewerMode>('photo');
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [selectedLotIndex, setSelectedLotIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likedSimilar, setLikedSimilar] = useState<Record<string, boolean>>({});
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(false);
  const [show3DShowcase, setShow3DShowcase] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<'live' | 'admin-replay'>('live');
  const [initialElapsedMs, setInitialElapsedMs] = useState<number>(0);
  const [videoPlaybackTime, setVideoPlaybackTime] = useState<number>(0);

  const [currentPrice, setCurrentPrice] = useState(0);
  const [leadingBidder, setLeadingBidder] = useState(() => t('page.noBidsYet'));
  const [bidSuccessToast, setBidSuccessToast] = useState<string | null>(null);
  const [bidErrorToast, setBidErrorToast] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<BuyerEligibilityResponse | null>(null);
  const [similarList, setSimilarList] = useState<SimilarWatch[]>([]);

  const [rotationAngle, setRotationAngle] = useState(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const resolveLeadingBidderLabel = useCallback(
    (lot: AuctionConsignmentItem | undefined, auction: AuctionEntity | null): string => {
      const currentUser = userRef.current;
      const hasLotBids = Boolean(
        (lot && Number(lot.totalBidsCount) > 0) || (lot && Number(lot.currentHighestBid) > 0),
      );
      if (lot && lot.currentHighestBidderId && hasLotBids) {
        if (currentUser?.id && lot.currentHighestBidderId === currentUser.id) {
          return `${currentUser.fullName || t('page.youLabel')} ${t('page.youSuffix')}`;
        }
        const matchedBid = getLotBidHistory(auction, lot).find(
          (b) =>
            b.bidder?.id === lot.currentHighestBidderId ||
            Number(b.bidAmount) === Number(lot.currentHighestBid),
        );
        if (matchedBid?.bidder?.fullName) {
          const isMe =
            (currentUser?.id && matchedBid.bidder.id === currentUser.id) ||
            (currentUser?.fullName && matchedBid.bidder.fullName === currentUser.fullName);
          return isMe
            ? `${matchedBid.bidder.fullName} ${t('page.youSuffix')}`
            : matchedBid.bidder.fullName;
        }
      }
      const lotBids = getLotBidHistory(auction, lot);
      if (lotBids.length > 0) {
        const topBid = lotBids[0];
        const isMe =
          (currentUser?.id && topBid.bidder?.id === currentUser.id) ||
          (currentUser?.fullName && topBid.bidder?.fullName === currentUser.fullName);
        return isMe
          ? `${topBid.bidder?.fullName || t('page.youLabel')} ${t('page.youSuffix')}`
          : topBid.bidder?.fullName || t('page.anonymousBidder');
      }
      return t('page.noBidsYet');
    },
    [t],
  );

  const upsertBidList = useCallback(
    (currentBids: AuctionBidItem[] | undefined, incomingBid: AuctionBidItem): AuctionBidItem[] => {
      return mergeBidHistory(currentBids, [incomingBid]);
    },
    [],
  );

  useEffect(() => {
    if (!activeAuction) return;
    const lot = activeAuction.items?.[selectedLotIndex] || activeAuction.items?.[0];
    setLeadingBidder(resolveLeadingBidderLabel(lot, activeAuction));
    if (lot) setCurrentPrice(Number(lot.currentHighestBid) || 0);
  }, [user, activeAuction, selectedLotIndex, resolveLeadingBidderLabel]);

  const tRef = useRef(t);
  tRef.current = t;
  const languageRef = useRef(i18n.language);
  languageRef.current = i18n.language;
  const resolveLeadingBidderLabelRef = useRef(resolveLeadingBidderLabel);
  resolveLeadingBidderLabelRef.current = resolveLeadingBidderLabel;

  useEffect(() => {
    let socketClient: ReturnType<typeof createAuctionSocket> | null = null;
    let isMounted = true;

    async function loadAuction(): Promise<void> {
      setIsLoading(true);
      try {
        let auctionData: AuctionEntity | null = null;
        if (id) {
          auctionData = await getAuctionDetailApi(id);
        } else {
          const list = await getAuctionsApi({ limit: 10 });
          if (list?.items && list.items.length > 0) {
            const target =
              list.items.find((a) => a.status === 'ACTIVE' || a.status === 'EXTENDED') ||
              list.items.find((a) => a.status === 'SCHEDULED') ||
              list.items[0];
            if (target) {
              auctionData = await getAuctionDetailApi(target.id);
            }
          }
        }

        if (!isMounted) return;

        if (auctionData) {
          setActiveAuction(auctionData);
          if (auctionData.videoUrl && auctionData.videoUrl.trim().length > 0) {
            setShowCinematicIntro(true);
          } else {
            setShowCinematicIntro(false);
          }
          const firstLot = auctionData.items?.[0];
          const hasBids = Boolean(
            (auctionData.bids && auctionData.bids.length > 0) ||
            (firstLot && Number(firstLot.totalBidsCount) > 0) ||
            (auctionData.totalBidsCount && Number(auctionData.totalBidsCount) > 0) ||
            (firstLot && Number(firstLot.currentHighestBid) > 0) ||
            Number(auctionData.currentHighestBid) > 0,
          );
          const price = hasBids
            ? Number(firstLot?.currentHighestBid) || Number(auctionData.currentHighestBid) || 0
            : 0;
          setCurrentPrice(price);
          setLeadingBidder(resolveLeadingBidderLabelRef.current(firstLot, auctionData));
          const isTimeOver = Boolean(
            auctionData.endTime && new Date(auctionData.endTime).getTime() <= Date.now(),
          );
          const isEnded =
            auctionData.status === 'ENDED' ||
            auctionData.status === 'SETTLED' ||
            auctionData.status === 'CANCELLED' ||
            isTimeOver;
          const isLiveSession =
            !isEnded && (auctionData.status === 'ACTIVE' || auctionData.status === 'EXTENDED');
          const isScheduled =
            !isLiveSession &&
            !isEnded &&
            (auctionData.status === 'SCHEDULED' ||
              new Date(auctionData.startTime).getTime() > Date.now());
          const targetDateStr = isScheduled ? auctionData.startTime : auctionData.endTime;
          const remaining = Math.max(
            0,
            Math.floor((new Date(targetDateStr).getTime() - Date.now()) / 1000),
          );
          setTimeLeft(remaining);

          if (getStoredToken()) {
            checkBuyerEligibilityApi(auctionData.id)
              .then((elig) => {
                if (isMounted) setEligibility(elig);
              })
              .catch(() => {});
          }

          try {
            const showcase = await getAuctionIntroShowcaseApi(auctionData.id);
            if (isMounted && showcase?.isIntroActive) {
              setPlaybackMode('live');
              setInitialElapsedMs(showcase.elapsedMs || 0);
              setShow3DShowcase(true);
            }
          } catch {
            setShow3DShowcase(false);
          }

          if (!isMounted) return;
          socketClient = createAuctionSocket(auctionData.id);

          socketClient.onAuctionStarted((payload) => {
            if (!isMounted) return;
            if (payload.auctionId === auctionData.id) {
              setActiveAuction((prev) =>
                prev
                  ? {
                      ...prev,
                      status: AuctionStatus.ACTIVE,
                      items:
                        payload.items && payload.items.length > 0
                          ? (payload.items as unknown as AuctionConsignmentItem[])
                          : prev.items,
                    }
                  : prev,
              );
              setBidSuccessToast(
                tRef.current('page.auctionStartedToast', { title: payload.title }),
              );
              if (auctionData.endTime) {
                const remaining = Math.max(
                  0,
                  Math.floor((new Date(auctionData.endTime).getTime() - Date.now()) / 1000),
                );
                setTimeLeft(remaining);
              }
              setTimeout(() => setBidSuccessToast(null), 5000);

              if (payload.items && payload.items.length > 0) {
                setPlaybackMode('live');
                setInitialElapsedMs(0);
                setShow3DShowcase(true);
              } else if (auctionData.videoUrl) {
                setShowCinematicIntro(true);
              }
            }
          });

          socketClient.onBidPlaced((payload) => {
            if (!isMounted) return;
            const validBid = Number(payload.bidAmount) || 0;
            setCurrentPrice(validBid);
            const currentUser = userRef.current;
            const isMe =
              (currentUser?.id && payload.bidderId === currentUser.id) ||
              (currentUser?.fullName && payload.bidderName === currentUser.fullName);
            setLeadingBidder(
              isMe ? `${payload.bidderName} ${tRef.current('page.youSuffix')}` : payload.bidderName,
            );

            setActiveAuction((prev) => {
              if (!prev) return null;
              const newBid: AuctionBidItem = {
                id: payload.bidId,
                auctionItemId: payload.auctionItemId,
                bidAmount: validBid,
                status: BidStatus.ACCEPTED,
                placedAt: payload.placedAt || new Date().toISOString(),
                bidder: {
                  id: payload.bidderId,
                  fullName: payload.bidderName,
                },
              };
              const updatedBids = upsertBidList(prev.bids, newBid);
              const accurateCount = payload.totalBidsCount ?? updatedBids.length;

              const updatedItems = prev.items?.map((item) => {
                if (item.id === payload.auctionItemId) {
                  return {
                    ...item,
                    bids: upsertBidList(item.bids, newBid),
                    currentHighestBid: validBid,
                    currentHighestBidderId: payload.bidderId,
                    totalBidsCount: accurateCount,
                  };
                }
                return item;
              });

              return {
                ...prev,
                currentHighestBid: validBid,
                currentHighestBidderId: payload.bidderId,
                totalBidsCount: accurateCount,
                bids: updatedBids,
                items: updatedItems || prev.items,
              };
            });
          });

          socketClient.onTimeExtended((payload) => {
            if (!isMounted) return;
            setTimeLeft((prev) => prev + payload.extendedBySeconds);
            setActiveAuction((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                endTime: payload.newEndTime || prev.endTime,
                status: AuctionStatus.EXTENDED,
                isExtended: true,
              };
            });
            setBidSuccessToast(
              tRef.current('page.antiSnipingExtendedToast', { seconds: payload.extendedBySeconds }),
            );
            setTimeout(() => setBidSuccessToast(null), 4000);
          });
        } else {
          setActiveAuction(null);
        }

        const res = await getAuctionsApi({ limit: 8 });
        if (isMounted && res?.items && res.items.length > 0) {
          const otherAuctions = res.items.filter((a) => a.id !== auctionData?.id);
          if (otherAuctions.length > 0) {
            const mapped: SimilarWatch[] = otherAuctions.map((a) => {
              const isLive = a.status === 'ACTIVE' || a.status === 'EXTENDED';
              const aHasItems = Boolean(a.items && a.items.length > 0) || Boolean(a.product);
              const img =
                (a.imageUrl && a.imageUrl.trim().length > 0
                  ? formatAuctionImage(a.imageUrl)
                  : null) ||
                (a.items?.[0]?.images?.[0] ? formatAuctionImage(a.items[0].images[0]) : null) ||
                (a.product?.images?.[0]?.imageUrl
                  ? formatAuctionImage(a.product.images[0].imageUrl)
                  : null) ||
                '';
              const currentBid = Number(a.currentHighestBid) || Number(a.startingPrice) || 0;
              return {
                id: a.id,
                badge: {
                  text: isLive
                    ? tRef.current('page.badgeLive')
                    : a.status === 'SCHEDULED'
                      ? tRef.current('page.badgeUpcoming')
                      : tRef.current('page.badgeEnded'),
                  type: isLive ? 'live' : a.status === 'SCHEDULED' ? 'upcoming' : 'buy-now',
                },
                brand: a.product?.category?.name || tRef.current('page.defaultBrand'),
                title: a.title,
                image: img,
                priceLabel: isLive
                  ? tRef.current('page.priceLabelCurrent')
                  : tRef.current('page.priceLabelStart'),
                price: formatCurrency(currentBid, languageRef.current),
                usdPrice: (() => {
                  if (currentBid <= 0) return '(≈ $0 USD)';
                  const rawUsd = currentBid / 24000;
                  const formatted =
                    rawUsd < 10
                      ? new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(rawUsd)
                      : rawUsd < 1000
                        ? new Intl.NumberFormat('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          }).format(rawUsd)
                        : new Intl.NumberFormat('en-US', {
                            maximumFractionDigits: 0,
                          }).format(Math.round(rawUsd));
                  return `(≈ $${formatted} USD)`;
                })(),
                statusLabel: isLive
                  ? tRef.current('page.statusLabelLive')
                  : tRef.current('page.statusLabelTime'),
                statusVal: isLive
                  ? tRef.current('page.statusLive')
                  : a.status === 'SCHEDULED'
                    ? tRef.current('page.statusUpcoming')
                    : tRef.current('page.statusEnded'),
                statusType: isLive ? 'blue' : 'green',
                hasItems: aHasItems,
                hasVideo: Boolean(a.videoUrl && a.videoUrl.trim().length > 0),
              };
            });
            setSimilarList(mapped);
          } else {
            setSimilarList([]);
          }
        } else if (isMounted) {
          setSimilarList([]);
        }
      } catch (err: unknown) {
        console.error('Failed to load auction session:', err);
        if (isMounted) setActiveAuction(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAuction();

    return () => {
      isMounted = false;
      socketClient?.disconnect();
    };
  }, [id, upsertBidList]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatVND = (amount: number): string => {
    return formatCurrency(Number(amount) || 0, i18n.language);
  };

  const handleCloseShowcase = useCallback((): void => {
    setShow3DShowcase(false);
    setPlaybackMode('admin-replay');
  }, []);

  const handleSelectLot = useCallback(
    (idx: number): void => {
      setSelectedLotIndex(idx);
      setSelectedThumb(0);
      const targetLot = activeAuction?.items?.[idx];
      const hasLotBids = Boolean(
        (targetLot && Number(targetLot.totalBidsCount) > 0) ||
        (targetLot && Number(targetLot.currentHighestBid) > 0),
      );
      setCurrentPrice(hasLotBids ? Number(targetLot?.currentHighestBid) || 0 : 0);
      setLeadingBidder(resolveLeadingBidderLabel(targetLot, activeAuction));
    },
    [activeAuction, resolveLeadingBidderLabel],
  );

  const handleBidSuccess = async (amount: number): Promise<void> => {
    if (!activeAuction?.id) return;

    try {
      const res = await placeBidApi(activeAuction.id, {
        bidAmount: amount,
        auctionItemId: currentLot?.id,
      });
      const newPrice = Number(res?.bidAmount ?? res?.currentHighestBid ?? amount);
      setCurrentPrice(newPrice);
      const currentUser = userRef.current;
      const myName = currentUser?.fullName || t('page.youLabel');
      setLeadingBidder(`${myName} ${t('page.youSuffix')}`);

      const myNewBid: AuctionBidItem = {
        id: res.bidId,
        auctionItemId: currentLot?.id,
        bidAmount: newPrice,
        status: BidStatus.ACCEPTED,
        placedAt: new Date().toISOString(),
        bidder: {
          id: currentUser?.id || 'current-user',
          fullName: myName,
        },
      };

      setActiveAuction((prev) => {
        if (!prev) return null;
        const updatedBids = upsertBidList(prev.bids, myNewBid);
        const accurateCount = res.totalBidsCount ?? updatedBids.length;

        const updatedItems = prev.items?.map((item, idx) => {
          if (item.id === currentLot?.id || (!currentLot?.id && idx === 0)) {
            return {
              ...item,
              bids: upsertBidList(item.bids, myNewBid),
              currentHighestBid: newPrice,
              currentHighestBidderId: currentUser?.id || 'current-user',
              totalBidsCount: accurateCount,
            };
          }
          return item;
        });

        const isoEndTime = res.endTime
          ? typeof res.endTime === 'string'
            ? res.endTime
            : new Date(res.endTime).toISOString()
          : prev.endTime;

        return {
          ...prev,
          currentHighestBid: newPrice,
          currentHighestBidderId: currentUser?.id || 'current-user',
          totalBidsCount: accurateCount,
          bids: updatedBids,
          items: updatedItems || prev.items,
          endTime: isoEndTime,
          ...(res.extended ? { status: AuctionStatus.EXTENDED, isExtended: true } : {}),
        };
      });

      setBidSuccessToast(t('page.bidSuccessToast', { amount: formatVND(newPrice) }));
      setTimeout(() => setBidSuccessToast(null), 4500);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            t('page.bidFailedToast');
      setBidErrorToast(message);
      setTimeout(() => setBidErrorToast(null), 5000);
    }
  };

  const handleToggleSimilarLike = (targetId: string): void => {
    setLikedSimilar((prev) => ({ ...prev, [targetId]: !prev[targetId] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex flex-col items-center justify-center p-8 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-rose-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">{t('page.loadingRoom')}</p>
      </div>
    );
  }

  if (!activeAuction) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            🔨
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">{t('page.emptyTitle')}</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">{t('page.emptyDesc')}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition"
          >
            {t('page.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  const currentLot = activeAuction.items?.[selectedLotIndex] || activeAuction.items?.[0];
  const lotImages = (currentLot?.images || [])
    .filter((u) => Boolean(u && typeof u === 'string' && u.trim().length > 0))
    .map((u) => formatAuctionImage(u));

  const productImages = (activeAuction.product?.images || [])
    .filter((img) => Boolean(img?.imageUrl && img.imageUrl.trim().length > 0))
    .map((img) => ({
      ...img,
      imageUrl: formatAuctionImage(img.imageUrl),
    }));

  let rawThumbnails: Array<{ label: string; src: string }> = [];

  if (lotImages.length > 0) {
    rawThumbnails = lotImages.map((url, i) => ({
      label:
        i === 0
          ? t('page.lotMainPhoto', { number: currentLot?.lotNumber ?? selectedLotIndex + 1 })
          : t('page.lotAnglePhoto', { index: i + 1 }),
      src: url,
    }));
  } else if (activeAuction.imageUrl && activeAuction.imageUrl.trim().length > 0) {
    rawThumbnails = [
      {
        label: t('page.adminBannerLabel'),
        src: formatAuctionImage(activeAuction.imageUrl),
      },
    ];
  } else if (productImages.length > 0) {
    rawThumbnails = productImages.map((img, i) => ({
      label: img.isThumbnail
        ? t('page.productMainPhoto')
        : t('page.lotAnglePhoto', { index: i + 1 }),
      src: img.imageUrl,
    }));
  }

  const dynamicThumbnails = rawThumbnails;
  const hasLots = Boolean(activeAuction.items && activeAuction.items.length > 0);
  const hasItems = hasLots || Boolean(activeAuction.product);
  const hasBanner = Boolean(activeAuction.imageUrl && activeAuction.imageUrl.trim().length > 0);
  const hasVideo = Boolean(activeAuction.videoUrl && activeAuction.videoUrl.trim().length > 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {bidSuccessToast && (
        <div className="fixed top-20 right-6 z-[2500] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{bidSuccessToast}</span>
        </div>
      )}

      {bidErrorToast && (
        <div className="fixed top-20 right-6 z-[2500] flex items-center gap-3 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-bounce">
          <AlertCircle className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{bidErrorToast}</span>
        </div>
      )}

      {show3DShowcase && activeAuction && (
        <AuctionShowcaseHUD
          auctionTitle={activeAuction.title}
          auctionDescription={activeAuction.description ?? undefined}
          items={activeAuction.items ?? []}
          playbackMode={playbackMode}
          initialElapsedMs={initialElapsedMs}
          onComplete={handleCloseShowcase}
          onCancel={handleCloseShowcase}
        />
      )}

      <CinematicAuctionIntro
        isOpen={showCinematicIntro}
        onClose={() => setShowCinematicIntro(false)}
        auction={activeAuction}
        currentLot={currentLot}
        selectedLotIndex={selectedLotIndex}
        onSelectLot={handleSelectLot}
        initialTime={videoPlaybackTime}
        onTimeSync={(t) => setVideoPlaybackTime(t)}
      />

      <main className="max-w-7xl mx-auto px-4 py-5 pb-14">
        <div className="flex items-center justify-between mb-5 text-[13px] text-slate-500">
          <nav className="flex items-center gap-2 flex-wrap" aria-label={t('page.breadcrumbAria')}>
            <Link to="/" className="text-slate-500 hover:text-rose-500 transition">
              {t('page.breadcrumbHome')}
            </Link>
            <span className="text-slate-300">/</span>
            <Link to="/auction" className="text-slate-500 hover:text-rose-500 transition">
              {t('page.breadcrumbAuctions')}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {currentLot?.title || activeAuction.title}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer transition hover:border-slate-300 ${
                isLiked ? 'text-red-500 border-red-200 bg-red-50' : ''
              }`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500' : ''}`} />
              <span>{isLiked ? t('page.saved') : t('page.favorite')}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer transition hover:border-slate-300"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                alert(t('page.linkCopied'));
              }}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('page.share')}</span>
            </button>
          </div>
        </div>

        {activeAuction.items && activeAuction.items.length > 1 && (
          <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Layers size={17} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    {t('page.lotsTitle', { count: activeAuction.items.length })}
                  </h3>
                  <p className="text-[11px] text-slate-500 m-0">{t('page.lotsSubtitle')}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                {t('page.viewingLot', { number: currentLot?.lotNumber ?? selectedLotIndex + 1 })}
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
              {activeAuction.items.map((lot, idx) => {
                const isSelected = selectedLotIndex === idx;
                const thumb = lot.images?.[0]
                  ? formatAuctionImage(lot.images[0])
                  : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';
                return (
                  <button
                    key={lot.id || idx}
                    type="button"
                    onClick={() => handleSelectLot(idx)}
                    className={`flex items-center gap-3 p-2.5 px-3.5 rounded-xl border text-left cursor-pointer transition shrink-0 max-w-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={lot.title}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {t('page.lotBadge', { number: lot.lotNumber ?? idx + 1 })}
                        </span>
                        {lot.threeModelKey && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-sky-100 text-sky-700">
                            3D
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate mt-1 max-w-[150px]">
                        {lot.title}
                      </p>
                      <p className="text-[11px] font-extrabold text-blue-600 mt-0.5">
                        {lot.startingPrice
                          ? formatCurrency(Number(lot.startingPrice), i18n.language)
                          : t('page.awaitingValuation')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* THÔNG BÁO NẾU PHIÊN CHƯA CÓ SẢN PHẨM / LÔ HÀNG KÝ GỬI */}
        {(!activeAuction.items || activeAuction.items.length === 0) && !activeAuction.product && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 flex items-center gap-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 text-sm">
                {t('page.awaitingConsignmentTitle')}
              </p>
              <p className="text-amber-700 mt-0.5">
                <Trans
                  ns="auction"
                  i18nKey="page.awaitingConsignmentDesc"
                  components={{ bold: <b /> }}
                />
              </p>
            </div>
          </div>
        )}

        {/* TOP SECTION: 2 COLUMNS (GALLERY & TERMINAL) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8 mb-10">
          {/* LEFT: GALLERY & INTEGRATED VIDEO STAGE (PHƯƠNG ÁN B KẾT HỢP) */}
          <AuctionGallery
            auction={activeAuction}
            currentLot={currentLot}
            viewerMode={viewerMode}
            setViewerMode={setViewerMode}
            selectedThumb={selectedThumb}
            setSelectedThumb={setSelectedThumb}
            rotationAngle={rotationAngle}
            setRotationAngle={setRotationAngle}
            thumbnails={dynamicThumbnails}
            videoTime={videoPlaybackTime}
            onTimeUpdate={(t) => setVideoPlaybackTime(t)}
            onOpenCinematic={() => setShowCinematicIntro(true)}
            hasItems={hasItems}
            hasBanner={hasBanner}
            hasVideo={hasVideo}
            timeLeft={timeLeft}
          />

          {/* RIGHT: BID TERMINAL */}
          <AuctionBidTerminal
            auction={activeAuction}
            selectedItem={currentLot}
            timeLeft={timeLeft}
            currentPrice={currentPrice}
            leadingBidder={leadingBidder}
            onBidSuccess={handleBidSuccess}
            isEligible={eligibility?.isEligible ?? true}
            eligibilityReason={eligibility?.reason}
            isFlaggedViewOnly={eligibility?.isFlaggedViewOnly ?? false}
            totalBidsCount={currentLot?.totalBidsCount ?? activeAuction.totalBidsCount ?? 0}
            buyerReputationScore={eligibility?.currentScore}
            requiredReputationScore={
              eligibility?.requiredScore ?? activeAuction.minBuyerReputation ?? 40
            }
            hasItems={hasItems}
          />
        </div>

        <AuctionSupportRequest auctionId={activeAuction.id} />

        {/* TABS SECTION */}
        <AuctionDetailTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          auction={activeAuction}
          selectedItem={currentLot}
          hasItems={hasItems}
        />

        {/* SIMILAR AUCTIONS SECTION */}
        <SimilarAuctionsSection
          watches={similarList}
          likedSimilar={likedSimilar}
          onToggleLike={handleToggleSimilarLike}
        />
      </main>
    </div>
  );
};

export default AuctionPage;
