import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Award,
  MapPin,
  ShieldCheck,
  Clock,
  Share2,
  MessageCircle,
} from 'lucide-react';
import type { ShopListItem } from '../../services/products.service';

interface ShopHeaderProps {
  shop: ShopListItem;
  onShare: () => void;
  onContact: () => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({ shop, onShare, onContact }) => {
  const getTrustBadge = (trustLevel: string) => {
    const level = trustLevel.toUpperCase();
    if (level === 'DIAMOND') {
      return { label: 'Kim Cương', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (level === 'PLATINUM') {
      return { label: 'Bạch Kim', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
    if (level === 'GOLD') {
      return { label: 'Hoàng Gia / Vàng', color: 'bg-amber-50 text-amber-700 border-amber-300' };
    }
    return {
      label: 'Đối Tác Xác Thực',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  };

  const badge = getTrustBadge(shop.trustLevel);

  return (
    <section className="bg-slate-900 text-white relative overflow-hidden border-b border-slate-800">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 pointer-events-none" />
      <div className="max-w-screen-2xl mx-auto px-6 py-10 relative z-10">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-white transition">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/search" className="hover:text-white transition">
            Gian hàng
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-200 font-semibold">{shop.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-blue-900/30 border-2 border-white/10 shrink-0 overflow-hidden">
              {shop.avatarUrl ? (
                <img src={shop.avatarUrl} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <span>{shop.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {shop.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
                {shop.isSellerActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Đang hoạt động
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-300 font-medium mb-3">
                Đại diện: <span className="text-white font-semibold">{shop.sellerFullName}</span>
              </p>

              {shop.description && (
                <p className="text-xs text-slate-400 max-w-xl line-clamp-2 mb-3">
                  {shop.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                {shop.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {shop.address.district ? `${shop.address.district}, ` : ''}
                    {shop.address.city || 'Việt Nam'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Điểm uy tín: <strong className="text-white">{shop.reputationScore}/100</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Phản hồi: <strong className="text-white">99%</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
            >
              <Share2 className="w-4 h-4 text-slate-300" />
              <span>Chia sẻ</span>
            </button>
            <button
              type="button"
              onClick={onContact}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Liên hệ Shop</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopHeader;
