import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Scan, ArrowRight } from 'lucide-react';
import type { SimilarWatch } from './types';

interface SimilarAuctionsSectionProps {
  watches: SimilarWatch[];
  likedSimilar: Record<string, boolean>;
  onToggleLike: (id: string) => void;
}

export const SimilarAuctionsSection: React.FC<SimilarAuctionsSectionProps> = ({
  watches,
  likedSimilar,
  onToggleLike,
}) => {
  if (!watches || watches.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 [margin-bottom:3.5rem]">
      <div className="flex items-end justify-between mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-extrabold text-slate-900 m-0">
            Vật Phẩm Tương Tự & Cùng Phiên Đấu Giá
          </h2>
          <p className="text-[13px] text-slate-500 m-0">
            Các cỗ máy cơ vi cơ học danh giá đã qua kiểm định LiDAR 3D nghiêm ngặt
          </p>
        </div>

        <Link
          to="/search?floor=Sàn+Đấu+Giá+Live"
          className="text-[13px] font-bold text-blue-600 no-underline inline-flex items-center gap-1 [transition:gap_0.15s_ease] hover:gap-2 hover:underline"
        >
          <span>Xem tất cả {watches.length} phiên</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid [grid-template-columns:repeat(4,_1fr)] gap-5 max-[1024px]:[grid-template-columns:repeat(2,_1fr)] max-[580px]:[grid-template-columns:1fr]">
        {watches.map((item) => {
          const liked = likedSimilar[item.id] || false;
          return (
            <Link
              key={item.id}
              to={`/auction/${item.id}`}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition relative shadow-xs hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg no-underline group"
            >
              {/* Top Badge */}
              <span
                className={`absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wide z-10 ${
                  item.badge.type === 'live'
                    ? 'bg-red-500 text-white'
                    : item.badge.type === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-600 text-white'
                }`}
              >
                {item.badge.text}
              </span>

              {/* Favorite Button */}
              <button
                type="button"
                className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer z-10 transition hover:text-red-500 hover:bg-white ${
                  liked ? 'text-red-500 fill-red-500' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLike(item.id);
                }}
                aria-label="Thêm vào yêu thích"
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              </button>

              {/* Image with 3D tag */}
              <div className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center p-3">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-4/5 h-4/5 object-contain transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200 px-2 py-0.5 rounded text-[10.5px] font-bold text-blue-900 shadow-xs">
                  <Scan className="w-3 h-3 text-blue-600" />
                  <span>3D Có sẵn</span>
                </span>
              </div>

              {/* Info Area */}
              <div className="p-3.5 flex flex-col [flex:1] justify-between gap-3">
                <div>
                  <p className="[font-size:10.5px] font-extrabold text-slate-500 uppercase [letter-spacing:0.05em] m-0">
                    {item.brand}
                  </p>
                  <h4 className="[font-size:13.5px] font-bold text-slate-900 [line-height:1.35] [margin:0.2rem_0_0_0] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-end justify-between gap-2 pt-2 [border-top:1px_solid_#f1f5f9]">
                  <div className="flex flex-col">
                    <span className="[font-size:10.5px] text-slate-500 m-0">{item.priceLabel}</span>
                    <p
                      className={`[font-size:17px] font-black text-red-500 m-0 [&.black]:text-slate-900 ${item.badge.type === 'upcoming' ? 'black' : ''}`}
                    >
                      {item.price}
                    </p>
                    <span className="[font-size:10.5px] font-semibold text-blue-600 m-0">
                      {item.usdPrice}
                    </span>
                  </div>

                  <div
                    className={`[padding:0.25rem_0.5rem] rounded-md text-[11px] font-bold text-center flex flex-col items-center justify-center [min-width:60px] [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.green]:[background-color:#ecfdf5] [&.green]:text-emerald-600 [&_.pill-sub]:[font-size:9px] [&_.pill-sub]:font-medium [&_.pill-sub]:[opacity:0.8] ${item.statusType}`}
                  >
                    <span className="pill-sub">{item.statusLabel}</span>
                    <span>{item.statusVal}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SimilarAuctionsSection;
