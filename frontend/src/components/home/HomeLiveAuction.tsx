import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HomeCountdown } from './HomeCountdown';
import { HomeAuctionCard } from './HomeAuctionCard';
import { formatAuctionImage, type AuctionEntity } from '../../services/auction.service';

export interface HomeLiveAuctionProps {
  auctions?: AuctionEntity[];
}

export function HomeLiveAuction({ auctions }: HomeLiveAuctionProps) {
  if (!auctions || auctions.length === 0) return null;

  const featuredAuction = auctions[0];
  const isUpcoming =
    featuredAuction.status === 'SCHEDULED' ||
    (Boolean(featuredAuction.startTime) &&
      new Date(featuredAuction.startTime).getTime() > Date.now());

  const featuredTitle =
    featuredAuction.title ||
    featuredAuction.product?.title ||
    featuredAuction.items?.[0]?.title ||
    'Phòng Đấu Giá Trực Tiếp';

  const resolveRealImage = (auc: AuctionEntity): string => {
    if (auc.items && auc.items.length > 0) {
      for (const item of auc.items) {
        if (item.images && item.images.length > 0) {
          const valid = item.images.find((u) => typeof u === 'string' && u.trim().length > 0);
          if (valid) return formatAuctionImage(valid);
        }
      }
    }
    if (auc.product && Array.isArray(auc.product.images) && auc.product.images.length > 0) {
      for (const img of auc.product.images) {
        if (img?.imageUrl && img.imageUrl.trim().length > 0) {
          return formatAuctionImage(img.imageUrl);
        }
      }
    }
    return 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80';
  };

  const featuredImage = resolveRealImage(featuredAuction);

  const itemsCount = featuredAuction.items?.length || 0;

  const featuredPrice = Number(
    featuredAuction.currentHighestBid || featuredAuction.startingPrice || 0,
  );

  const depositVal = Math.round(Number(featuredAuction.startingPrice || 0) * 0.1);

  const targetUrl = `/auction/${featuredAuction.id}`;

  const targetDateStr = isUpcoming ? featuredAuction.startTime : featuredAuction.endTime;

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!targetDateStr) return 0;
    return Math.max(0, Math.floor((new Date(targetDateStr).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!targetDateStr) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(targetDateStr).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr]);

  const h = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');

  return (
    <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-sky-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            Tính Năng Độc Quyền
          </span>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          Người đang xem: 1,42k
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-[15px] font-extrabold uppercase tracking-[0.04em] text-slate-800">
          NEXUS LIVE AUCTION - Phòng Đấu Giá 3D Trực Tiếp
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Mô phỏng 3D góc xoay 360°, bảo vệ Anti-Sniping và hàng đợi Atomic Queue.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-[18px] border border-slate-300 bg-slate-950">
          <img
            src={featuredImage}
            alt={featuredTitle}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80';
            }}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span
              className={`rounded px-2.5 py-1 text-[10px] font-bold text-white shadow-xs ${
                isUpcoming ? 'bg-amber-500' : 'bg-red-500'
              }`}
            >
              {isUpcoming ? 'SẮP DIỄN RA' : 'LIVE TRỰC TIẾP'}
            </span>
            {itemsCount > 1 && (
              <span className="rounded bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
                {itemsCount} LÔ SẢN PHẨM
              </span>
            )}
            <span className="rounded border border-sky-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-sky-600">
              Màn hình 3D 360°
            </span>
          </div>
          <span className="absolute right-3 top-3 rounded bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
            Cọc 10% (Hoàn tự động)
          </span>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/90 p-2 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-slate-600">
              Góc máy: Hero Perspective 45°
            </span>
            <div className="flex gap-2">
              <Link
                to={targetUrl}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Xoay 3D
              </Link>
              <Link
                to={targetUrl}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Ảnh Thực Tế
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {featuredAuction.items?.[0]?.lotNumber
                ? `LÔ #${featuredAuction.items[0].lotNumber}`
                : featuredAuction.id
                  ? `LOT #${featuredAuction.id.slice(0, 8).toUpperCase()}`
                  : 'Lô đặc biệt #01'}
            </span>

            <span className="rounded bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-500">
              Seller KYC: Verified
            </span>
          </div>

          <h3 className="mt-4 text-[22px] font-extrabold text-slate-800 line-clamp-2">
            {featuredTitle}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {isUpcoming
              ? 'Phiên đấu giá đã được lên lịch. Người mua có thể xem trước sản phẩm, hồ sơ kiểm định và đặt lịch.'
              : 'Mẫu đang được người mua theo dõi ngay trong phòng đấu giá tương tác 3D.'}
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {isUpcoming ? 'Giá Khởi Điểm' : 'Giá Hiện Tại'}
              </p>
              <p className="mt-2 text-[24px] font-extrabold text-sky-600">
                {featuredPrice.toLocaleString('vi-VN')} đ
              </p>
              <p className="text-[11px] text-slate-400">
                Tiền cọc: {depositVal.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {isUpcoming ? 'Khởi Tranh Sau' : 'Đếm Ngược Kết Thúc'}
              </p>
              <div className="mt-2 flex justify-end">
                <HomeCountdown values={[h, m, s]} />
              </div>
              <p className="mt-2 text-[11px] text-red-500">
                {isUpcoming ? 'Trạng Thái: Đã Lên Lịch' : 'Anti-Sniping: Active'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              to={targetUrl}
              className={`flex-1 rounded-xl px-5 py-3 text-center text-sm font-bold text-white shadow-lg transition ${
                isUpcoming
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  : 'bg-[#1a8bff] hover:bg-[#1277eb] shadow-sky-200'
              }`}
            >
              {isUpcoming ? 'Xem Chi Tiết & Đặt Lịch' : 'Đặt Giá Ngay'}
            </Link>

            <Link
              to={targetUrl}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Chi Tiết Phòng
            </Link>
          </div>
        </div>
      </div>

      {auctions.length > 1 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {auctions.slice(1, 4).map((auction) => (
            <HomeAuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </section>
  );
}
