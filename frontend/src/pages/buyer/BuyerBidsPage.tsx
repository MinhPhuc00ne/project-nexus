import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import {
  getMyBidsApi,
  getMyAuctionAwardsApi,
  declineAuctionAwardApi,
  formatAuctionImage,
  type AuctionAwardItem,
} from '../../services/auction.service';

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

const statusConfig: Record<
  Exclude<BuyerBidStatus, 'ALL'>,
  { label: string; icon: React.ReactNode; cls: string; desc: string }
> = {
  WINNING: {
    label: 'Đang dẫn đầu',
    icon: <Trophy size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Giá thầu của bạn cao nhất',
  },
  ACTIVE: {
    label: 'Đang tham gia',
    icon: <TrendingUp size={11} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Phiên đang diễn ra',
  },
  OUTBID: {
    label: 'Bị vượt giá',
    icon: <AlertCircle size={11} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
    desc: 'Người khác đặt cao hơn',
  },
  WON: {
    label: 'Đã thắng',
    icon: <CheckCircle size={11} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Chúc mừng! Bạn đã thắng đấu giá',
  },
  LOST: {
    label: 'Đã thua',
    icon: <XCircle size={11} />,
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    desc: 'Phiên đã kết thúc',
  },
  ENDED: {
    label: 'Đã kết thúc',
    icon: <Clock size={11} />,
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    desc: 'Phiên đấu giá đã kết thúc',
  },
};

const tabs: { key: BuyerBidStatus; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'WINNING', label: 'Đang dẫn đầu' },
  { key: 'ACTIVE', label: 'Đang tham gia' },
  { key: 'OUTBID', label: 'Bị vượt giá' },
  { key: 'WON', label: 'Đã thắng' },
  { key: 'LOST', label: 'Đã thua' },
];

export default function BuyerBidsPage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState<BuyerBidItem[]>([]);
  const [awards, setAwards] = useState<AuctionAwardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BuyerBidStatus>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [bidsData, awardsData] = await Promise.all([getMyBidsApi(), getMyAuctionAwardsApi()]);

        if (isMounted) {
          setAwards(Array.isArray(awardsData) ? awardsData : []);
          const mapped: BuyerBidItem[] = (Array.isArray(bidsData) ? bidsData : []).map((b) => {
            let status: Exclude<BuyerBidStatus, 'ALL'> = 'ACTIVE';
            if (b.auction.status === 'ENDED' || b.auction.status === 'CANCELLED') {
              status = b.auction.isLeading || b.status === 'WINNING' ? 'WON' : 'LOST';
            } else if (b.auction.status === 'ACTIVE' || b.auction.status === 'EXTENDED') {
              status = b.auction.isLeading || b.status === 'WINNING' ? 'WINNING' : 'OUTBID';
            } else {
              status = 'ACTIVE';
            }

            const rawImg =
              b.auction.product?.images?.[0]?.imageUrl ||
              (b.auction as unknown as { items?: Array<{ images?: string[] }> })?.items?.[0]
                ?.images?.[0];
            const firstImg = rawImg
              ? formatAuctionImage(rawImg)
              : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';

            return {
              id: b.id,
              auctionId: b.auction.id,
              productName: b.auction.product?.title || b.auction.title,
              img: firstImg,
              myBid: Number(b.bidAmount),
              currentBid: Number(b.auction.currentHighestBid) || Number(b.bidAmount),
              startPrice: Number(b.auction.product?.basePrice || 0),
              status,
              endTime: b.auction.endTime,
              totalBids: 0,
              shopName: 'NEXUS Official Live Auction',
            };
          });
          setBids(mapped);
        }
      } catch {
        if (isMounted) {
          setBids([]);
          setAwards([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeclineAward = async (awardId: string) => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn từ chối quyền mua giải thưởng này? Bạn sẽ bị trừ 10 điểm uy tín theo quy định sàn.',
      )
    ) {
      return;
    }
    try {
      await declineAuctionAwardApi(awardId);
      setAwards((prev) => prev.filter((a) => a.id !== awardId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể từ chối quyền mua.';
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const safeBids = Array.isArray(bids) ? bids : [];
  const filtered = safeBids.filter((b) => activeTab === 'ALL' || b?.status === activeTab);
  const winningCount = safeBids.filter((b) => b?.status === 'WINNING').length;
  const activeCount = safeBids.filter(
    (b) => b?.status === 'ACTIVE' || b?.status === 'WINNING',
  ).length;
  const wonCount = safeBids.filter((b) => b?.status === 'WON').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Gavel size={18} className="text-violet-600" />
          Phiên đấu giá của tôi
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Theo dõi các lượt đặt giá và kết quả đấu giá 3D theo thời gian thực
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
            <Trophy size={13} />
            Đang dẫn đầu
          </div>
          <p className="text-xl font-extrabold text-amber-800">{winningCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
            <Flame size={13} />
            Đang tham gia
          </div>
          <p className="text-xl font-extrabold text-blue-800">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
            <CheckCircle size={13} />
            Đã thắng
          </div>
          <p className="text-xl font-extrabold text-emerald-800">{wonCount}</p>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
          {actionError}
        </div>
      )}

      {/* WON AWARDS WAITING FOR CHECKOUT */}
      {awards.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Quyền Mua Thắng Đấu Giá Của Bạn ({awards.length})
              </h2>
              <p className="text-[11px] text-slate-500 m-0">
                Tiền cọc đã được khấu trừ tự động. Vui lòng xác nhận địa chỉ và hoàn tất trong vòng
                24 giờ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {awards.map((award) => (
              <div
                key={award.id}
                className="bg-white border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                      Hạn chót: {new Date(award.expiresAt).toLocaleTimeString('vi-VN')}{' '}
                      {new Date(award.expiresAt).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Đã trừ cọc {Number(award.depositAmount).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                    {award.auction?.title || 'Hiện vật đấu giá số hóa 3D'}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Tổng giá trúng thầu:{' '}
                    <strong className="text-slate-900">
                      {Number(award.order?.totalAmount || 0).toLocaleString('vi-VN')} ₫
                    </strong>
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeclineAward(award.id)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Ban size={12} /> Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/buyer/orders/${award.orderId}`)}
                    className="px-3 py-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard size={12} /> Thanh toán nhận hàng
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-14 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-violet-600" /> Đang tải danh sách đấu giá…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-400 mb-4">
            <Gavel size={28} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Bạn chưa tham gia phiên đấu giá nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
            Khám phá các phiên đấu giá trực tiếp với công nghệ xoay mô hình 3D thực tế trên NEXUS.
          </p>
          <Link
            to="/auction"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition shadow-sm"
          >
            <ShoppingBag size={14} />
            Tham gia đấu giá ngay
          </Link>
        </div>
      ) : (
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
                    {s.icon} {s.label}
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
                        <p className="text-[10px] text-slate-400 mb-0.5">Giá thầu của tôi</p>
                        <p className="text-xs font-extrabold text-violet-700">
                          {bid.myBid.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Giá hiện tại</p>
                        <p className="text-xs font-extrabold text-slate-800">
                          {bid.currentBid.toLocaleString('vi-VN')} ₫
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
                    Xem phiên đấu giá <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
