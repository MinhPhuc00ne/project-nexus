import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import {
  X,
  CreditCard,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import {
  quoteAuctionAwardApi,
  checkoutAuctionAwardApi,
  formatAuctionImage,
  type AuctionAwardItem,
  type AuctionAwardQuote,
} from '../../services/auction.service';
import { getAddresses, type UserAddress } from '../../services/address';
import { getBuyerWalletApi, type BuyerWalletResponse } from '../../services/wallet.service';
import { useToast } from '../ToastNotification/useToast';

/**
 * Props for the post-auction award checkout modal.
 */
interface AuctionAwardCheckoutModalProps {
  award: AuctionAwardItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId?: string) => void;
}

/**
 * Modal allowing an auction winner to select a delivery address, preview GHN shipping quotes,
 * apply the 30% escrow deposit offset, and settle the remaining 70% balance via wallet.
 *
 * @param props - Component props containing the active auction award and modal callbacks.
 * @returns Rendered modal dialog or null when closed.
 */
export default function AuctionAwardCheckoutModal({
  award,
  isOpen,
  onClose,
  onSuccess,
}: AuctionAwardCheckoutModalProps): React.ReactElement | null {
  const { t, i18n } = useTranslation('auction');
  const navigate = useNavigate();
  const toast = useToast();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [wallet, setWallet] = useState<BuyerWalletResponse | null>(null);

  const [quote, setQuote] = useState<AuctionAwardQuote | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function init(): Promise<void> {
      setLoadingInitial(true);
      setErrorMsg(null);
      try {
        const [addrList, walletData] = await Promise.all([
          getAddresses().catch(() => []),
          getBuyerWalletApi().catch(() => null),
        ]);

        if (!isMounted) return;
        setAddresses(addrList);
        setWallet(walletData);

        const defaultAddr = addrList.find((a) => a.isDefault) || addrList[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : t('awardCheckout.loadInfoError'));
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, [isOpen, award.id, t]);

  const fetchQuote = useCallback(
    async (addressId: string): Promise<void> => {
      if (!addressId) return;
      setLoadingQuote(true);
      setErrorMsg(null);
      try {
        const res = await quoteAuctionAwardApi(award.id, { addressId });
        setQuote(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('awardCheckout.ghnQuoteError');
        setErrorMsg(msg);
      } finally {
        setLoadingQuote(false);
      }
    },
    [award.id, t],
  );

  useEffect(() => {
    if (selectedAddressId && isOpen) {
      void fetchQuote(selectedAddressId);
    }
  }, [selectedAddressId, isOpen, fetchQuote]);

  if (!isOpen) return null;

  const itemTitle =
    award.auctionItem?.title || award.auction?.title || t('awardCheckout.lotFallback');
  const itemImage = award.auctionItem?.images?.[0]
    ? formatAuctionImage(award.auctionItem.images[0])
    : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';

  const walletBalance = Number(wallet?.balance ?? 0);
  const dueNow = quote?.dueNow ?? 0;
  const isBalanceSufficient = quote ? walletBalance >= dueNow : true;
  const missingAmount = Math.max(0, dueNow - walletBalance);

  const handleCheckout = async (): Promise<void> => {
    if (!selectedAddressId) {
      setErrorMsg(t('awardCheckout.selectAddressError'));
      return;
    }
    if (!quote) {
      setErrorMsg(t('awardCheckout.waitingQuoteError'));
      return;
    }
    if (!isBalanceSufficient) {
      setErrorMsg(
        t('awardCheckout.insufficientBalanceError', {
          amount: formatCurrency(missingAmount, i18n.language),
        }),
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await checkoutAuctionAwardApi(award.id, { addressId: selectedAddressId });
      const orderId = res?.id ?? res?.order?.id;
      toast.success(t('awardCheckout.checkoutSuccessToast'), {
        targetUrl: orderId ? `/buyer/orders/${orderId}` : '/buyer/orders',
      });
      onSuccess(orderId);
      onClose();
      if (orderId) {
        navigate(`/buyer/orders/${orderId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('awardCheckout.checkoutError');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('awardCheckout.title')}</h3>
              <p className="text-[11px] text-slate-500">{t('awardCheckout.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product snapshot */}
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center gap-3">
            <img
              src={itemImage}
              alt={itemTitle}
              className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
            />
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200 mb-1">
                {award.tier === 'SECOND_CHANCE'
                  ? t('awardCheckout.secondChanceBadge')
                  : t('awardCheckout.winnerBadge')}
              </span>
              <h4 className="text-xs font-bold text-slate-900 truncate">{itemTitle}</h4>
              <p className="text-[11px] text-slate-500">
                {t('awardCheckout.paymentDeadline')}{' '}
                <strong className="text-amber-700">
                  {new Date(award.expiresAt).toLocaleTimeString(getIntlLocale(i18n.language))}{' '}
                  {new Date(award.expiresAt).toLocaleDateString(getIntlLocale(i18n.language))}
                </strong>
              </p>
            </div>
          </div>

          {/* Shipping Address Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-violet-600" />
                {t('awardCheckout.shippingAddressTitle')}
              </label>
              <button
                type="button"
                onClick={() => navigate('/buyer/addresses')}
                className="text-[11px] font-semibold text-violet-600 hover:underline flex items-center gap-0.5"
              >
                {t('awardCheckout.manageAddresses')} <ArrowUpRight size={11} />
              </button>
            </div>

            {loadingInitial ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-600" />{' '}
                {t('awardCheckout.loadingAddresses')}
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-xs text-amber-800 flex items-center justify-between">
                <span>{t('awardCheckout.noAddresses')}</span>
                <button
                  type="button"
                  onClick={() => navigate('/buyer/addresses')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  {t('awardCheckout.addAddress')}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      className={`block p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50/40 ring-1 ring-violet-400'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="shippingAddress"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-0.5 text-violet-600 focus:ring-violet-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <span>{addr.recipientName}</span>
                            <span className="text-slate-500 font-normal">({addr.phone})</span>
                            {addr.isDefault && (
                              <span className="text-[9px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.2 rounded">
                                {t('awardCheckout.defaultBadge')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 truncate mt-0.5">
                            {[addr.street, addr.ward, addr.district, addr.city]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing & Fee Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <CreditCard size={13} className="text-slate-600" />
              {t('awardCheckout.breakdownTitle')}
            </h5>

            <div className="flex justify-between text-slate-600">
              <span>{t('awardCheckout.totalWinningPrice')}</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  quote?.offerAmount ?? Number(award.offerAmount || 0),
                  i18n.language,
                )}
              </span>
            </div>

            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} /> {t('awardCheckout.depositHeld')}
              </span>
              <span className="font-semibold">
                -
                {formatCurrency(quote?.depositAmount ?? Number(award.depositAmount), i18n.language)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>{t('awardCheckout.remaining70')}</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(quote?.remainingProductAmount ?? quote?.dueNow ?? 0, i18n.language)}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Truck size={12} className="text-slate-500" /> {t('awardCheckout.ghnFee')}
              </span>
              <span className="font-semibold text-slate-900">
                {loadingQuote ? (
                  <span className="text-slate-400 text-[11px]">
                    {t('awardCheckout.calculating')}
                  </span>
                ) : (
                  formatCurrency(quote?.shippingFee ?? 0, i18n.language)
                )}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm">
              <span className="text-slate-900">{t('awardCheckout.dueNow')}</span>
              <span className="text-violet-700 text-base">
                {formatCurrency(dueNow, i18n.language)}
              </span>
            </div>
          </div>

          {/* Wallet Balance Status */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isBalanceSufficient
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet
                size={16}
                className={isBalanceSufficient ? 'text-emerald-600' : 'text-amber-600'}
              />
              <div>
                <p className="font-semibold">
                  {t('awardCheckout.availableBalance')}{' '}
                  <strong>{formatCurrency(walletBalance, i18n.language)}</strong>
                </p>
                {!isBalanceSufficient && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {t('awardCheckout.missingAmount', {
                      amount: formatCurrency(missingAmount, i18n.language),
                    })}
                  </p>
                )}
              </div>
            </div>

            {!isBalanceSufficient && (
              <button
                type="button"
                onClick={() => navigate('/buyer/wallet')}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0"
              >
                {t('awardCheckout.topUpNow')}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {t('awardCheckout.close')}
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || loadingQuote || !isBalanceSufficient || !selectedAddressId}
            className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> {t('awardCheckout.processing')}
              </>
            ) : (
              <>
                <CreditCard size={13} />{' '}
                {t('awardCheckout.confirmPay', {
                  amount: formatCurrency(dueNow, i18n.language),
                })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
