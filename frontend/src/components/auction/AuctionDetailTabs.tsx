import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import {
  ShieldCheck,
  Sliders,
  Clock,
  MessageSquare,
  Scan,
  RotateCw,
  UserCheck,
  Star,
} from 'lucide-react';
import type { AuctionTabKey } from './types';
import type {
  AuctionEntity,
  AuctionConsignmentItem,
} from '@/features/auction/services/auction.service';
import { getLotBidHistory } from './bidHistory';
import {
  getShopReviewsApi,
  type ShopReviewItem,
} from '@/features/reviews/services/reviews.service';
import { useAuth } from '../../contexts/AuthContext';

interface AuctionDetailTabsProps {
  activeTab: AuctionTabKey;
  setActiveTab: (tab: AuctionTabKey) => void;
  auction?: AuctionEntity | null;
  selectedItem?: AuctionConsignmentItem | null;
  hasItems?: boolean;
}

export const AuctionDetailTabs: React.FC<AuctionDetailTabsProps> = ({
  activeTab,
  setActiveTab,
  auction,
  selectedItem,
  hasItems: _hasItems,
}) => {
  const { t, i18n } = useTranslation('auction');
  const { user: currentUser } = useAuth();
  const hasItems =
    _hasItems ??
    Boolean(selectedItem || auction?.product || (auction?.items && auction.items.length > 0));

  const historyLot = selectedItem ?? auction?.items?.[0];
  const uniqueBids = getLotBidHistory(auction, historyLot);
  const bidsCount = historyLot
    ? Math.max(historyLot.totalBidsCount ?? 0, uniqueBids.length)
    : Math.max(auction?.totalBidsCount ?? 0, uniqueBids.length);
  const [reviews, setReviews] = useState<ShopReviewItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    const sellerId = auction?.seller?.id || auction?.sellerId;
    if (sellerId && activeTab === 'reviews') {
      setIsLoadingReviews(true);
      getShopReviewsApi(sellerId)
        .then((res) => {
          setReviews(res.items || []);
        })
        .catch(() => {
          setReviews([]);
        })
        .finally(() => {
          setIsLoadingReviews(false);
        });
    }
  }, [auction?.seller?.id, auction?.sellerId, activeTab]);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-10 shadow-xs">
      <div className="flex items-center border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-muted border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-ink hover:bg-slate-100 ${
            activeTab === 'certs'
              ? 'text-ink font-semibold bg-white border-b-2 border-primary'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('certs')}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{t('tabs.certs')}</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-muted border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-ink hover:bg-slate-100 ${
            activeTab === 'specs'
              ? 'text-ink font-semibold bg-white border-b-2 border-primary'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('specs')}
        >
          <Sliders className="w-4 h-4 text-blue-500" />
          <span>{t('tabs.specs')}</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-muted border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-ink hover:bg-slate-100 ${
            activeTab === 'history'
              ? 'text-ink font-semibold bg-white border-b-2 border-primary'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>{t('tabs.history', { count: bidsCount })}</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-muted border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-ink hover:bg-slate-100 ${
            activeTab === 'reviews'
              ? 'text-ink font-semibold bg-white border-b-2 border-primary'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('reviews')}
        >
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span>{t('tabs.reviews')}</span>
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: CERTS & INFO */}
        {activeTab === 'certs' &&
          (() => {
            if (!hasItems) {
              return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                  <ShieldCheck className="w-12 h-12 text-slate-400 mb-3" />
                  <h4 className="text-sm font-semibold text-ink mb-1">{t('tabs.noCertsTitle')}</h4>
                  <p className="text-xs text-muted max-w-md leading-relaxed m-0">
                    {t('tabs.noCertsDesc')}
                  </p>
                </div>
              );
            }

            const activeItem = selectedItem || auction?.items?.[0];
            const certNumber =
              activeItem?.appraisalCertificateNumber ||
              (auction?.id ? `NX-3D-${auction.id.slice(0, 8).toUpperCase()}` : 'NX-3D-AP2025X');
            const appraisalAgency = activeItem?.appraisalAgency || t('tabs.defaultAgency');

            return (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink m-0">
                        {t('tabs.certHeading')}
                      </h4>
                      <p className="text-xs text-muted m-0 mt-0.5">
                        {t('tabs.certCodeLabel')}{' '}
                        <strong className="text-ink font-mono">{certNumber}</strong> •{' '}
                        {appraisalAgency}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                    <UserCheck size={14} /> {t('tabs.verifiedValid')}
                  </span>
                </div>

                {activeItem && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          {t('tabs.consignmentRecord')}
                        </span>
                        <strong className="text-ink">
                          {t('tabs.lotTitle', {
                            number: activeItem.lotNumber ?? 1,
                            title: activeItem.title,
                          })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          {t('tabs.agencyLabel')}
                        </span>
                        <strong className="text-blue-700">{appraisalAgency}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          {t('tabs.appraisalStatusLabel')}
                        </span>
                        <span className="text-emerald-600 font-semibold">
                          {t('tabs.originVerified')}
                        </span>
                      </div>
                    </div>

                    {activeItem.certificateImages && activeItem.certificateImages.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-100">
                        <span className="text-muted block text-[11px] mb-2 font-semibold">
                          {t('tabs.attachedCerts')}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {activeItem.certificateImages.map((cImg, idx) => (
                            <a
                              key={idx}
                              href={cImg}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 hover:border-blue-300 transition text-[11px]"
                            >
                              <span>{t('tabs.certDoc', { index: idx + 1 })}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {auction?.description && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                      {t('tabs.itemDescriptionHeading')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-xl">
                      {auction.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
                      <Scan size={14} /> {t('tabs.card1Title')}
                    </div>
                    <p className="text-xs text-slate-600">{t('tabs.card1Desc')}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
                      <ShieldCheck size={14} /> {t('tabs.card2Title')}
                    </div>
                    <p className="text-xs text-slate-600">{t('tabs.card2Desc')}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
                      <RotateCw size={14} /> {t('tabs.card3Title')}
                    </div>
                    <p className="text-xs text-slate-600">{t('tabs.card3Desc')}</p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* TAB 2: SPECS */}
        {activeTab === 'specs' &&
          (() => {
            if (!hasItems) {
              return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                  <Sliders className="w-12 h-12 text-slate-400 mb-3" />
                  <h4 className="text-sm font-semibold text-ink mb-1">{t('tabs.noSpecsTitle')}</h4>
                  <p className="text-xs text-muted max-w-md leading-relaxed m-0">
                    {t('tabs.noSpecsDesc')}
                  </p>
                </div>
              );
            }

            const activeItem = selectedItem || auction?.items?.[0];
            return (
              <table className="w-full text-xs divide-y divide-slate-100">
                <tbody className="divide-y divide-slate-100">
                  {activeItem && (
                    <tr className="bg-blue-50/50">
                      <td className="py-2.5 px-2 font-semibold text-blue-900 w-1/3">
                        {t('tabs.selectedLot')}
                      </td>
                      <td className="py-2.5 px-2 text-blue-950 font-semibold">
                        {t('tabs.lotTitle', {
                          number: activeItem.lotNumber ?? 1,
                          title: activeItem.title,
                        })}
                      </td>
                    </tr>
                  )}
                  {activeItem?.description && (
                    <tr>
                      <td className="py-2.5 font-semibold text-muted">{t('tabs.itemDesc')}</td>
                      <td className="py-2.5 text-slate-700 leading-relaxed">
                        {activeItem.description}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2.5 font-semibold text-muted w-1/3">
                      {t('tabs.sessionTitle')}
                    </td>
                    <td className="py-2.5 text-ink font-semibold">
                      {auction?.title || t('tabs.publicAuctionFallback')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.auctionIdLabel')}</td>
                    <td className="py-2.5 font-mono text-slate-700">
                      {auction?.id || t('tabs.updating')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.startingPrice')}</td>
                    <td className="py-2.5 text-ink font-semibold">
                      {activeItem?.startingPrice
                        ? formatCurrency(Number(activeItem.startingPrice), i18n.language)
                        : activeItem?.proposedStartingPrice
                          ? formatCurrency(Number(activeItem.proposedStartingPrice), i18n.language)
                          : auction?.startingPrice
                            ? formatCurrency(Number(auction.startingPrice), i18n.language)
                            : t('tabs.notSet')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.minIncrement')}</td>
                    <td className="py-2.5 text-blue-600 font-semibold">
                      {activeItem?.bidIncrement
                        ? `+${formatCurrency(Number(activeItem.bidIncrement), i18n.language)}`
                        : activeItem?.proposedBidIncrement
                          ? `+${formatCurrency(Number(activeItem.proposedBidIncrement), i18n.language)}`
                          : auction?.bidIncrement
                            ? `+${formatCurrency(Number(auction.bidIncrement), i18n.language)}`
                            : `+${formatCurrency(1000, i18n.language)}`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.minBuyerRep')}</td>
                    <td className="py-2.5 text-ink font-semibold">
                      {t('tabs.repPoints', { score: auction?.minBuyerReputation ?? 40 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.minSellerRep')}</td>
                    <td className="py-2.5 text-ink font-semibold">
                      {t('tabs.repPoints', { score: auction?.minSellerReputation ?? 50 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.escrowMech')}</td>
                    <td className="py-2.5 text-ink">
                      <span className="font-semibold text-emerald-700">AUCTION_BID_LOCK</span>{' '}
                      {t('tabs.escrowMechLock')}{' '}
                      <span className="font-semibold text-blue-700">AUCTION_BID_REFUND</span>{' '}
                      {t('tabs.escrowMechRefund')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.startTime')}</td>
                    <td className="py-2.5 text-slate-700">
                      {auction?.startTime
                        ? new Date(auction.startTime).toLocaleString(getIntlLocale(i18n.language))
                        : t('tabs.liveNow')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">{t('tabs.endTime')}</td>
                    <td className="py-2.5 text-slate-700">
                      {auction?.endTime
                        ? new Date(auction.endTime).toLocaleString(getIntlLocale(i18n.language))
                        : t('tabs.notScheduled')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-muted">
                      {t('tabs.antiSnipingStatus')}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${auction?.isExtended ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600'}`}
                      >
                        {auction?.isExtended ? t('tabs.extendedBadge') : t('tabs.readyBadge')}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}

        {/* TAB 3: BID HISTORY */}
        {activeTab === 'history' && (
          <div>
            {historyLot && (
              <p className="mb-4 text-sm font-semibold text-ink">
                {t('tabs.lotTitle', {
                  number: historyLot.lotNumber ?? 1,
                  title: historyLot.title,
                })}
              </p>
            )}
            {bidsCount > uniqueBids.length && (
              <p className="mb-3 text-xs text-muted">
                {t('tabs.showingLatestBids', { shown: uniqueBids.length, total: bidsCount })}
              </p>
            )}
            {uniqueBids.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">{t('tabs.noBids')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-muted">
                      <th className="p-3">{t('tabs.colBidder')}</th>
                      <th className="p-3">{t('tabs.colAmount')}</th>
                      <th className="p-3">{t('tabs.colTime')}</th>
                      <th className="p-3">{t('tabs.colEscrow')}</th>
                      <th className="p-3">{t('tabs.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uniqueBids.map((bid, idx) => {
                      const isMe =
                        (currentUser?.id && bid.bidder?.id === currentUser.id) ||
                        (currentUser?.fullName && bid.bidder?.fullName === currentUser.fullName) ||
                        bid.bidder?.fullName?.toLowerCase().includes('tài khoản hiện tại') ||
                        bid.bidder?.id === 'current-user';

                      const rawName = bid.bidder?.fullName || t('tabs.anonymousUser');
                      const displayName = isMe
                        ? currentUser?.fullName || rawName.replace(' (Tài khoản hiện tại)', '')
                        : rawName;

                      return (
                        <tr key={bid.id || idx} className={idx === 0 ? 'bg-amber-50/40' : ''}>
                          <td className="p-3 font-semibold text-ink">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{displayName}</span>
                              {isMe && (
                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                  {t('tabs.youBadge')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={`p-3 font-semibold ${idx === 0 ? 'text-primary text-sm' : 'text-ink'}`}
                          >
                            {formatCurrency(Number(bid.bidAmount), i18n.language)}
                          </td>
                          <td className="p-3 text-muted">
                            {new Date(bid.placedAt).toLocaleTimeString(
                              getIntlLocale(i18n.language),
                            )}{' '}
                            (
                            {new Date(bid.placedAt).toLocaleDateString(
                              getIntlLocale(i18n.language),
                            )}
                            )
                          </td>
                          <td className="p-3">
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              {t('tabs.depositLocked')}
                            </span>
                          </td>
                          <td className="p-3">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                {t('tabs.leadingBadge')}
                              </span>
                            ) : (
                              <span className="text-slate-400">{t('tabs.outbidStatus')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-3xl font-semibold text-amber-500">
                {reviews.length > 0
                  ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                  : '5.0'}
              </div>
              <div>
                <div className="flex text-amber-500 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-muted m-0 mt-0.5">
                  {t('tabs.verifiedReviewsCount', { count: reviews.length })}
                </p>
              </div>
            </div>

            {isLoadingReviews ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t('tabs.loadingReviews')}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-700">{t('tabs.noReviewsTitle')}</p>
                <p className="mt-1 text-slate-400">{t('tabs.noReviewsDesc')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border border-slate-100 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-ink">
                        {r.reviewer?.fullName || t('tabs.anonymousBuyer')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString(getIntlLocale(i18n.language))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-500 mb-1">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-emerald-600 font-semibold text-[10px] ml-1">
                        {t('tabs.deliveredVerified')}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-slate-600 m-0 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AuctionDetailTabs;
