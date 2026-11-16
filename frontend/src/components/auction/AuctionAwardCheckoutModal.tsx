import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface AuctionAwardCheckoutModalProps {
  award: AuctionAwardItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId?: string) => void;
}

export default function AuctionAwardCheckoutModal({
  award,
  isOpen,
  onClose,
  onSuccess,
}: AuctionAwardCheckoutModalProps) {
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

  // Load addresses & wallet balance
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function init() {
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
          setErrorMsg(
            err instanceof Error ? err.message : 'Không thể tải thông tin địa chỉ hoặc ví.',
          );
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, [isOpen, award.id]);

  // Request quote whenever address changes
  const fetchQuote = useCallback(
    async (addressId: string) => {
      if (!addressId) return;
      setLoadingQuote(true);
      setErrorMsg(null);
      try {
        const res = await quoteAuctionAwardApi(award.id, { addressId });
        setQuote(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể lấy báo giá vận chuyển GHN.';
        setErrorMsg(msg);
      } finally {
        setLoadingQuote(false);
      }
    },
    [award.id],
  );

  useEffect(() => {
    if (selectedAddressId && isOpen) {
      void fetchQuote(selectedAddressId);
    }
  }, [selectedAddressId, isOpen, fetchQuote]);

  if (!isOpen) return null;

  const itemTitle =
    award.auctionItem?.title || award.auction?.title || 'Hiện vật đấu giá trực tiếp 3D';
  const itemImage = award.auctionItem?.images?.[0]
    ? formatAuctionImage(award.auctionItem.images[0])
    : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';

  const walletBalance = Number(wallet?.balance ?? 0);
  const dueNow = quote?.dueNow ?? 0;
  const isBalanceSufficient = quote ? walletBalance >= dueNow : true;
  const missingAmount = Math.max(0, dueNow - walletBalance);

  const handleCheckout = async () => {
    if (!selectedAddressId) {
      setErrorMsg('Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
      return;
    }
    if (!quote) {
      setErrorMsg('Hệ thống đang kết nối tính phí vận chuyển GHN. Vui lòng thử lại sau giây lát.');
      return;
    }
    if (!isBalanceSufficient) {
      setErrorMsg(
        `Số dư ví không đủ. Vui lòng nạp thêm tối thiểu ${missingAmount.toLocaleString('vi-VN')} ₫.`,
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await checkoutAuctionAwardApi(award.id, { addressId: selectedAddressId });
      toast.success('Thanh toán thành công! Đơn hàng đấu giá đã được khởi tạo.', {
        targetUrl: res?.order?.id ? `/buyer/orders/${res.order.id}` : '/buyer/orders',
      });
      onSuccess(res?.order?.id);
      onClose();
      if (res?.order?.id) {
        navigate(`/buyer/orders/${res.order.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thanh toán thất bại, vui lòng thử lại.';
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
              <h3 className="text-sm font-bold text-slate-900">Thanh toán nhận hiện vật đấu giá</h3>
              <p className="text-[11px] text-slate-500">
                Thời hạn 24 giờ • Thanh toán 70% còn lại + Phí vận chuyển GHN
              </p>
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
                  ? 'Cơ hội thứ hai (Top 2)'
                  : 'Thắng đấu giá (Top 1)'}
              </span>
              <h4 className="text-xs font-bold text-slate-900 truncate">{itemTitle}</h4>
              <p className="text-[11px] text-slate-500">
                Hạn chót thanh toán:{' '}
                <strong className="text-amber-700">
                  {new Date(award.expiresAt).toLocaleTimeString('vi-VN')}{' '}
                  {new Date(award.expiresAt).toLocaleDateString('vi-VN')}
                </strong>
              </p>
            </div>
          </div>

          {/* Shipping Address Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-violet-600" />
                Địa chỉ nhận hàng (GHN Express)
              </label>
              <button
                type="button"
                onClick={() => navigate('/buyer/addresses')}
                className="text-[11px] font-semibold text-violet-600 hover:underline flex items-center gap-0.5"
              >
                Quản lý địa chỉ <ArrowUpRight size={11} />
              </button>
            </div>

            {loadingInitial ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-600" /> Đang tải địa chỉ nhận
                hàng...
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-xs text-amber-800 flex items-center justify-between">
                <span>Bạn chưa có địa chỉ nhận hàng nào.</span>
                <button
                  type="button"
                  onClick={() => navigate('/buyer/addresses')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Thêm địa chỉ
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
                                Mặc định
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
              Chi tiết thanh toán
            </h5>

            <div className="flex justify-between text-slate-600">
              <span>Tổng giá trúng thầu:</span>
              <span className="font-semibold text-slate-900">
                {(quote?.offerAmount ?? Number(award.offerAmount || 0)).toLocaleString('vi-VN')} ₫
              </span>
            </div>

            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} /> Tiền cọc đã giữ (30%):
              </span>
              <span className="font-semibold">
                -{(quote?.depositAmount ?? Number(award.depositAmount)).toLocaleString('vi-VN')} ₫
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Tiền hàng 70% còn lại:</span>
              <span className="font-semibold text-slate-900">
                {(quote?.remainingProductAmount ?? quote?.dueNow ?? 0).toLocaleString('vi-VN')} ₫
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Truck size={12} className="text-slate-500" /> Phí giao hàng GHN Express:
              </span>
              <span className="font-semibold text-slate-900">
                {loadingQuote ? (
                  <span className="text-slate-400 text-[11px]">Đang tính...</span>
                ) : (
                  `${(quote?.shippingFee ?? 0).toLocaleString('vi-VN')} ₫`
                )}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm">
              <span className="text-slate-900">Cần thanh toán ngay:</span>
              <span className="text-violet-700 text-base">{dueNow.toLocaleString('vi-VN')} ₫</span>
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
                  Số dư ví khả dụng: <strong>{walletBalance.toLocaleString('vi-VN')} ₫</strong>
                </p>
                {!isBalanceSufficient && (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Thiếu {missingAmount.toLocaleString('vi-VN')} ₫ để thanh toán đơn hàng này.
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
                Nạp tiền ví ngay
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
            Đóng
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || loadingQuote || !isBalanceSufficient || !selectedAddressId}
            className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Đang xử lý...
              </>
            ) : (
              <>
                <CreditCard size={13} /> Xác nhận thanh toán ({dueNow.toLocaleString('vi-VN')} ₫)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
