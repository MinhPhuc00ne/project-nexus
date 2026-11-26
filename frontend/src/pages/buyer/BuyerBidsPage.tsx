import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import {
  Gavel,
  Clock,
  Trophy,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Flame,
  ShoppingBag,
  Loader2,
  Sparkles,
  CreditCard,
  Ban,
  MessageSquare,
  AlertTriangle,
  Wallet,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  getMyBidsApi,
  getMyAuctionAwardsApi,
  respondSecondChanceAwardApi,
  requestAuctionSupportChatApi,
  formatAuctionImage,
  type AuctionAwardItem,
} from '../../services/auction.service';
import { getBuyerWalletApi } from '../../services/wallet.service';
import AuctionAwardCheckoutModal from '../../components/auction/AuctionAwardCheckoutModal';
import AuctionComplaintModal from '../../components/auction/AuctionComplaintModal';
import { openChatConversation } from '../../components/chat/chatEvents';
import { useToast } from '../../components/ToastNotification/useToast';
import { getApiErrorMessage } from '../../lib/apiErrors';

export type BuyerBidStatus = 'ALL' | 'WINNING' | 'ACTIVE' | 'OUTBID' | 'WON' | 'LOST' | 'ENDED';

export interface BuyerBidItem {
  id: string;
  auctionId: string;
  productName: string;
  img: string;
  myBid: number;
  currentBid: number;
  startPrice: number;
  status: Exclude<BuyerBidStatus, 'ALL'>;
  endTime: string;
  totalBids: number;
  shopName: string;
}

const statusConfig = {
  WINNING: {
    labelKey: 'bidsPage.status.winningLabel',
    icon: <Trophy size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    descKey: 'bidsPage.status.winningDesc',
  },
  ACTIVE: {
    labelKey: 'bidsPage.status.activeLabel',
    icon: <TrendingUp size={11} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    descKey: 'bidsPage.status.activeDesc',
  },
  OUTBID: {
    labelKey: 'bidsPage.status.outbidLabel',
    icon: <AlertCircle size={11} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
    descKey: 'bidsPage.status.outbidDesc',
  },
  WON: {
    labelKey: 'bidsPage.status.wonLabel',
    icon: <CheckCircle size={11} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    descKey: 'bidsPage.status.wonDesc',
  },
  LOST: {
    labelKey: 'bidsPage.status.lostLabel',
    icon: <XCircle size={11} />,
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    descKey: 'bidsPage.status.lostDesc',
  },
  ENDED: {
    labelKey: 'bidsPage.status.endedLabel',
    icon: <Clock size={11} />,
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    descKey: 'bidsPage.status.endedDesc',
  },
} as const;

const tabs = [
  { key: 'ALL', labelKey: 'bidsPage.tabs.all' },
  { key: 'WINNING', labelKey: 'bidsPage.tabs.winning' },
  { key: 'ACTIVE', labelKey: 'bidsPage.tabs.active' },
  { key: 'OUTBID', labelKey: 'bidsPage.tabs.outbid' },
  { key: 'WON', labelKey: 'bidsPage.tabs.won' },
  { key: 'LOST', labelKey: 'bidsPage.tabs.lost' },
] as const satisfies { key: BuyerBidStatus; labelKey: string }[];

export default function BuyerBidsPage({ purchasesOnly = false }: { purchasesOnly?: boolean }) {
  const { t, i18n } = useTranslation('buyer');
  const navigate = useNavigate();
  const toast = useToast();

  const [bids, setBids] = useState<BuyerBidItem[]>([]);
  const [awards, setAwards] = useState<AuctionAwardItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BuyerBidStatus>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [activeCheckoutAward, setActiveCheckoutAward] = useState<AuctionAwardItem | null>(null);
  const [activeComplaintData, setActiveComplaintData] = useState<{
    auctionId: string;
    auctionItemId?: string | null;
    lotTitle?: string;
  } | null>(null);

  // Second chance response loading
  const [respondingAwardId, setRespondingAwardId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [bidsData, awardsData, walletData] = await Promise.all([
        purchasesOnly ? Promise.resolve([]) : getMyBidsApi().catch(() => []),
        getMyAuctionAwardsApi(),
        getBuyerWalletApi().catch(() => null),
      ]);

      setAwards(Array.isArray(awardsData) ? awardsData : []);
      if (walletData) {
        setWalletBalance(Number(walletData.balance ?? 0));
      }

      const mapped: BuyerBidItem[] = (Array.isArray(bidsData) ? bidsData : []).map((b) => {
        const isLeadingOrWinning = Boolean(b.auction.isLeading || b.status === 'WINNING');
        let bidStatus: Exclude<BuyerBidStatus, 'ALL'>;
        if (b.auction.status === 'ENDED' || b.auction.status === 'CANCELLED') {
          bidStatus = isLeadingOrWinning ? 'WON' : 'LOST';
        } else if (b.auction.status === 'ACTIVE' || b.auction.status === 'EXTENDED') {
          bidStatus = isLeadingOrWinning ? 'WINNING' : 'OUTBID';
        } else {
          bidStatus = 'ACTIVE';
        }

        const lotItem = (
          b as unknown as {
            auctionItem?: {
              title?: string;
              images?: string[];
              currentHighestBid?: number | string;
            };
          }
        )?.auctionItem;

        const rawImg =
          lotItem?.images?.[0] ||
          b.auction.product?.images?.[0]?.imageUrl ||
          (b.auction as unknown as { items?: Array<{ images?: string[] }> })?.items?.[0]
            ?.images?.[0];
        const firstImg = rawImg
          ? formatAuctionImage(rawImg)
          : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';

        const productName = lotItem?.title
          ? `${lotItem.title} • ${b.auction.title}`
          : b.auction.product?.title || b.auction.title;

        return {
          id: b.id,
          auctionId: b.auction.id,
          productName,
          img: firstImg,
          myBid: Number(b.bidAmount),
          currentBid:
            Number(lotItem?.currentHighestBid) ||
            Number(b.auction.currentHighestBid) ||
            Number(b.bidAmount),
          startPrice: Number(b.auction.product?.basePrice || 0),
          status: bidStatus,
          endTime: b.auction.endTime,
          totalBids: (b.auction as unknown as { totalBidsCount?: number })?.totalBidsCount || 0,
          shopName:
            (b.auction as unknown as { seller?: { fullName?: string } })?.seller?.fullName ||
            t('bidsPage.defaultShopName'),
        };
      });
      setBids(mapped);
    } catch (err) {
      setActionError(
        getApiErrorMessage(
          (err as { response?: { data?: unknown } })?.response?.data,
          t('bidsPage.loadError'),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [purchasesOnly, t]);

  useEffect(() => {
    void loadData();
    const refresh = () => {
      void loadData();
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [loadData]);

  // Handle Respond to Second-Chance
  const handleRespondSecondChance = async (award: AuctionAwardItem, accept: boolean) => {
    const requiredDeposit = Number(award.depositAmount);
    if (accept && walletBalance < requiredDeposit) {
      const missing = requiredDeposit - walletBalance;
      const confirmTopup = window.confirm(
        t('bidsPage.insufficientDepositConfirm', {
          balance: formatCurrency(walletBalance, i18n.language),
          deposit: formatCurrency(requiredDeposit, i18n.language),
          missing: formatCurrency(missing, i18n.language),
        }),
      );
      if (confirmTopup) {
        navigate('/buyer/wallet');
        return;
      }
    }

    if (!accept) {
      const confirmDecline = window.confirm(t('bidsPage.declineConfirm'));
      if (!confirmDecline) return;
    }

    setRespondingAwardId(award.id);
    setActionError(null);
    try {
      const res = await respondSecondChanceAwardApi(award.id, accept);
      if (accept) {
        if (res?.status === 'AWAITING_DEPOSIT') {
          toast.error(
            t('bidsPage.awaitingDepositToast', {
              deposit: formatCurrency(Number(award.depositAmount), i18n.language),
            }),
            { targetUrl: '/buyer/wallet' },
          );
        } else {
          toast.success(t('bidsPage.acceptSuccessToast'));
        }
      } else {
        toast.success(t('bidsPage.declineSuccessToast'));
      }
      void loadData();
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        (err as { response?: { data?: unknown } })?.response?.data,
        t('bidsPage.respondError'),
      );
      setActionError(msg);
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setRespondingAwardId(null);
    }
  };

  /**
   * Asks support about a lot and opens the conversation that creates.
   *
   * This used to navigate to `/buyer/chat`, both on success and in the catch —
   * a route that does not exist. A buyer's chat is the widget rendered on every
   * page, not a page of its own, so pressing "chat with support" left them on a
   * dead route with their message sent and nowhere to read the reply. The
   * widget opens on the conversation instead, which is what the auction detail
   * page already did.
   */
  const handleOpenSupportChat = async (auctionId: string, shopTitle?: string) => {
    try {
      const conversation = await requestAuctionSupportChatApi(
        auctionId,
        t('bidsPage.supportChatMessage', {
          title: shopTitle || t('bidsPage.auctionItemFallback'),
        }),
      );
      toast.success(t('bidsPage.supportChatToast'));
      openChatConversation(conversation.id);
    } catch (error) {
      // Without a conversation there is nothing to open, so say so rather than
      // sending them somewhere.
      toast.error(error instanceof Error ? error.message : t('bidsPage.supportChatFailed'));
    }
  };

  // Segregate awards by status and tier
  const pendingCheckoutAwards = awards.filter((a) => a.status === 'AWAITING_CHECKOUT');
  const secondChanceOffers = awards.filter(
    (a) =>
      a.tier === 'SECOND_CHANCE' &&
      (a.status === 'AWAITING_ACCEPTANCE' || a.status === 'AWAITING_DEPOSIT'),
  );
  const defaultedAwards = awards.filter((a) => a.status === 'PAYMENT_DEFAULT');

  const safeBids = Array.isArray(bids) ? bids : [];
  const filtered = safeBids.filter((b) => activeTab === 'ALL' || b?.status === activeTab);
  const winningCount = safeBids.filter((b) => b?.status === 'WINNING').length;
  const activeCount = safeBids.filter(
    (b) => b?.status === 'ACTIVE' || b?.status === 'WINNING',
  ).length;
  const wonCount = safeBids.filter((b) => b?.status === 'WON').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Gavel size={18} className="text-violet-600" />
            {purchasesOnly ? t('bidsPage.purchasesOnlyTitle') : t('bidsPage.myAuctionsTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {purchasesOnly ? t('bidsPage.purchasesOnlySubtitle') : t('bidsPage.myAuctionsSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          title={t('bidsPage.refreshTitle')}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {!purchasesOnly && (
        <>
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
                <Trophy size={13} />
                {t('bidsPage.status.winningLabel')}
              </div>
              <p className="text-xl font-extrabold text-amber-800">{winningCount}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
              <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                <Flame size={13} />
                {t('bidsPage.status.activeLabel')}
              </div>
              <p className="text-xl font-extrabold text-blue-800">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                <CheckCircle size={13} />
                {t('bidsPage.wonOrRightsCard')}
              </div>
              <p className="text-xl font-extrabold text-emerald-800">
                {wonCount + pendingCheckoutAwards.length}
              </p>
            </div>
          </div>
        </>
      )}

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: SECOND CHANCE OFFERS (TOP 2 BIDDER) */}
      {secondChanceOffers.length > 0 && (
        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                {t('bidsPage.secondChanceTitle', { count: secondChanceOffers.length })}
              </h2>
              <p className="text-[11px] text-slate-600 m-0">{t('bidsPage.secondChanceDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {secondChanceOffers.map((award) => {
              const deposit = Number(award.depositAmount);
              const isAwaitingDeposit = award.status === 'AWAITING_DEPOSIT';
              const missingDeposit = Math.max(0, deposit - walletBalance);
              const isResponding = respondingAwardId === award.id;
              const lotTitle =
                award.auctionItem?.title || award.auction?.title || t('bidsPage.lotFallback');

              return (
                <div
                  key={award.id}
                  className="bg-white border border-blue-200/90 rounded-lg p-3.5 flex flex-col justify-between shadow-xs space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {t('bidsPage.top2Badge')}
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {t('bidsPage.deposit30', {
                          amount: formatCurrency(deposit, i18n.language),
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                      {lotTitle}
                    </h4>

                    <p className="mb-2 text-[11px] text-slate-500">{award.auction?.title}</p>
                    <p className="mb-2 text-[11px] font-semibold text-amber-700">
                      {t('bidsPage.responseDeadline', {
                        date: new Date(award.expiresAt).toLocaleString(
                          getIntlLocale(i18n.language),
                        ),
                      })}
                    </p>

                    <p className="text-[11px] text-slate-600">
                      {t('bidsPage.proposedTotal')}{' '}
                      <strong className="text-slate-900">
                        {formatCurrency(
                          Number(award.offerAmount || award.bid?.bidAmount || 0),
                          i18n.language,
                        )}
                      </strong>
                    </p>

                    {isAwaitingDeposit ? (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-amber-900">
                          <AlertTriangle size={12} /> {t('bidsPage.insufficientWalletTitle')}
                        </div>
                        <p>
                          <Trans
                            ns="buyer"
                            i18nKey="bidsPage.insufficientWalletDesc"
                            values={{ amount: formatCurrency(missingDeposit, i18n.language) }}
                            components={{ bold: <strong /> }}
                          />
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">
                        {t('bidsPage.secondChanceNote')}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSupportChat(award.auctionId, lotTitle)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-violet-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare size={12} /> {t('bidsPage.chatWithShop')}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isResponding}
                        onClick={() => handleRespondSecondChance(award, false)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition flex items-center gap-1 cursor-pointer"
                        title={t('bidsPage.declineTitle')}
                      >
                        <Ban size={12} /> {t('bidsPage.decline')}
                      </button>

                      {isAwaitingDeposit ? (
                        <button
                          type="button"
                          onClick={() => navigate('/buyer/wallet')}
                          className="px-3 py-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Wallet size={12} /> {t('bidsPage.topUpNow')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isResponding}
                          onClick={() => handleRespondSecondChance(award, true)}
                          className="px-3 py-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          {isResponding ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          {t('bidsPage.confirmBuyDeposit')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: ACTIVE 24H CHECKOUT AWARDS (PRIMARY_WINNER & ACCEPTED SECOND_CHANCE) */}
      {pendingCheckoutAwards.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                {t('bidsPage.pendingCheckoutTitle', { count: pendingCheckoutAwards.length })}
              </h2>
              <p className="text-[11px] text-slate-600 m-0">{t('bidsPage.pendingCheckoutDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingCheckoutAwards.map((award) => {
              const deposit = Number(award.depositAmount);
              const totalAmount = Number(award.offerAmount || award.order?.totalAmount || 0);
              const lotTitle =
                award.auctionItem?.title || award.auction?.title || t('bidsPage.lot3dFallback');
              const expiresDate = new Date(award.expiresAt);
              const intlLocale = getIntlLocale(i18n.language);

              return (
                <div
                  key={award.id}
                  className="bg-white border border-amber-200/90 rounded-xl p-3.5 flex flex-col justify-between shadow-xs space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock size={11} />
                        {t('bidsPage.deadline', {
                          time: expiresDate.toLocaleTimeString(intlLocale),
                          date: expiresDate.toLocaleDateString(intlLocale),
                        })}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t('bidsPage.depositHeldBadge', {
                          amount: formatCurrency(deposit, i18n.language),
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                      {lotTitle}
                    </h4>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p>
                        {t('bidsPage.winningPrice')}{' '}
                        <strong className="text-slate-900">
                          {formatCurrency(totalAmount, i18n.language)}
                        </strong>
                      </p>
                      <p className="text-[10px] text-slate-500">{t('bidsPage.remainingNote')}</p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSupportChat(award.auctionId, lotTitle)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-violet-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare size={12} /> {t('bidsPage.chatWithShop')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCheckoutAward(award)}
                      className="px-3.5 py-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard size={12} /> {t('bidsPage.payAndReceive')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: DEFAULTED AWARDS (PAYMENT_DEFAULT: QUÁ HẠN 24H) */}
      {!purchasesOnly && defaultedAwards.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500 text-white font-bold">
              <AlertTriangle size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                {t('bidsPage.defaultedTitle', { count: defaultedAwards.length })}
              </h2>
              <p className="text-[11px] text-rose-700 m-0">{t('bidsPage.defaultedDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {defaultedAwards.map((award) => {
              const lotTitle =
                award.auctionItem?.title || award.auction?.title || t('bidsPage.lotFallback');
              return (
                <div
                  key={award.id}
                  className="bg-white border border-rose-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        {t('bidsPage.overdueBadge')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {award.completedAt
                          ? new Date(award.completedAt).toLocaleDateString(
                              getIntlLocale(i18n.language),
                            )
                          : ''}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                      {lotTitle}
                    </h4>

                    <p className="text-[11px] text-slate-500">
                      {t('bidsPage.forfeitedDeposit', {
                        amount: formatCurrency(Number(award.depositAmount), i18n.language),
                      })}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 italic">
                      {t('bidsPage.complaintHint')}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveComplaintData({
                          auctionId: award.auctionId,
                          auctionItemId: award.auctionItemId,
                          lotTitle,
                        })
                      }
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200 cursor-pointer"
                    >
                      {t('bidsPage.complainToAdmin')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!purchasesOnly && (
        <>
          {/* TABS FILTER FOR BID HISTORY */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
            {tabs.map((tab) => {
              const count =
                tab.key === 'ALL' ? bids.length : bids.filter((b) => b.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t(tab.labelKey)}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="py-14 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-violet-600" />{' '}
              {t('bidsPage.loadingBids')}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-400 mb-4">
                <Gavel size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {t('bidsPage.emptyBidsTitle')}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                {t('bidsPage.emptyBidsDesc')}
              </p>
              <Link
                to="/auction"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition shadow-sm"
              >
                <ShoppingBag size={14} />
                {t('bidsPage.joinAuctionNow')}
              </Link>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((bid) => {
                const s = statusConfig[bid.status] ?? statusConfig.ACTIVE;
                return (
                  <div
                    key={bid.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                      <span className="text-xs font-semibold text-slate-500">{bid.shopName}</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}
                      >
                        {s.icon} {t(s.labelKey)}
                      </span>
                    </div>
                    <div className="flex items-start gap-4 px-4 py-4">
                      <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                        <img
                          src={bid.img}
                          alt={bid.productName}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 line-clamp-2">
                          {bid.productName}
                        </p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-slate-50 p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">
                              {t('bidsPage.myBidLabel')}
                            </p>
                            <p className="text-xs font-extrabold text-violet-700">
                              {formatCurrency(bid.myBid, i18n.language)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2">
                            <p className="text-[10px] text-slate-400 mb-0.5">
                              {t('bidsPage.currentBidLabel')}
                            </p>
                            <p className="text-xs font-extrabold text-slate-800">
                              {formatCurrency(bid.currentBid, i18n.language)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
                      <Link
                        to={`/auction/${bid.auctionId}`}
                        className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
                      >
                        {t('bidsPage.viewAuction')} <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {purchasesOnly && loading && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          {t('bidsPage.loadingRights')}
        </p>
      )}
      {purchasesOnly &&
        !loading &&
        !actionError &&
        secondChanceOffers.length === 0 &&
        pendingCheckoutAwards.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-800">{t('bidsPage.noOffersTitle')}</p>
            <p className="mt-2 text-sm text-slate-500">{t('bidsPage.noOffersDesc')}</p>
          </div>
        )}

      {/* CHECKOUT MODAL (24H WINDOW: 70% + SHIPPING) */}
      {activeCheckoutAward && (
        <AuctionAwardCheckoutModal
          award={activeCheckoutAward}
          isOpen={Boolean(activeCheckoutAward)}
          onClose={() => setActiveCheckoutAward(null)}
          onSuccess={() => {
            setActiveCheckoutAward(null);
            void loadData();
          }}
        />
      )}

      {/* COMPLAINT MODAL */}
      {activeComplaintData && (
        <AuctionComplaintModal
          auctionId={activeComplaintData.auctionId}
          auctionItemId={activeComplaintData.auctionItemId}
          lotTitle={activeComplaintData.lotTitle}
          isOpen={Boolean(activeComplaintData)}
          onClose={() => setActiveComplaintData(null)}
          onSuccess={() => {
            setActiveComplaintData(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
