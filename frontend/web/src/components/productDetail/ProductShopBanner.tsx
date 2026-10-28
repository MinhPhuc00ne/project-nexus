import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Store, Award, Star } from 'lucide-react';
import type { ProductDetail } from '../../types/product.types';
import type { ShopProfile } from '../../types/shop.types';
import { getShopDetail } from '../../services/shops';
import { getStoredToken } from '../../services/auth';

interface ProductShopBannerProps {
  product: ProductDetail;
}

function formatJoinDate(dateString?: string): string {
  if (!dateString) return 'Gần đây';
  const diffDays = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 1) return 'Hôm nay';
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  return `${Math.floor(diffMonths / 12)} năm trước`;
}

function formatTrustLevel(level?: string): string {
  const upper = (level || '').toUpperCase();
  if (upper === 'DIAMOND') return 'Kim Cương';
  if (upper === 'PLATINUM') return 'Bạch Kim';
  if (upper === 'GOLD') return 'Hoàng Gia';
  if (upper === 'SILVER') return 'Bạc';
  if (upper === 'BRONZE') return 'Đồng';
  return 'Đã chứng thực';
}

export const ProductShopBanner: React.FC<ProductShopBannerProps> = ({ product }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);

  const fallbackShop = product.shop;
  const sellerId = fallbackShop?.id;

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    void getShopDetail(sellerId)
      .then((res) => {
        if (!cancelled && res?.shop) setShopProfile(res.shop);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const shopName = shopProfile?.name || fallbackShop?.name || 'Gian Hàng NEXUS';
  const avatarUrl = shopProfile?.avatarUrl || fallbackShop?.avatarUrl;
  const isOnline = Boolean(shopProfile?.isSellerActive ?? fallbackShop?.isSellerActive);
  const totalReviews = shopProfile?.stats?.totalReviews ?? product.reviewsCount ?? 0;
  const totalProducts = shopProfile?.stats?.totalProducts ?? 1;
  const trustScore = shopProfile?.reputationScore ?? fallbackShop?.trustScore ?? 100;
  const trustLevel = shopProfile?.trustLevel ?? fallbackShop?.trustLevel;

  const handleOpenChat = () => {
    if (!getStoredToken()) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    window.dispatchEvent(
      new CustomEvent('nexus:open-chat', {
        detail: { sellerId: sellerId || shopProfile?.id, shopName },
      }),
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Avatar + Name + Action buttons */}
        <div className="flex items-center gap-4 lg:pr-8 lg:border-r border-slate-100 min-w-[280px]">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-sm overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={shopName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-blue-600">
                  {shopName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span
              className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              title={isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-base truncate">
              {sellerId ? (
                <Link to={`/shop/${sellerId}`} className="hover:text-blue-600 transition">
                  {shopName}
                </Link>
              ) : (
                shopName
              )}
            </h3>
            <p
              className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                isOnline ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {isOnline ? 'Online vừa xong' : 'Ngoại tuyến'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#f24e1e] bg-orange-50 border border-[#f24e1e]/40 hover:bg-orange-100 rounded-lg transition cursor-pointer shadow-2xs"
              >
                <MessageSquare size={13} />
                <span>Chat Ngay</span>
              </button>

              {sellerId ? (
                <Link
                  to={`/shop/${sellerId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition"
                >
                  <Store size={13} />
                  <span>Xem Shop</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                  <Store size={13} />
                  <span>Xem Shop</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Shop stats grid (Shopee reference style) */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400">Đánh Giá</span>
            <p className="font-bold text-[#f24e1e] flex items-center gap-1">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{totalReviews}</span>
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400">Tỉ Lệ Phản Hồi</span>
            <p className="font-bold text-[#f24e1e]">{isOnline ? '100%' : 'Chờ phản hồi'}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400">Tham Gia</span>
            <p className="font-bold text-[#f24e1e]">{formatJoinDate(shopProfile?.createdAt)}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400">Sản Phẩm</span>
            <p className="font-bold text-[#f24e1e]">{totalProducts}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400">Thời Gian Phản Hồi</span>
            <p className="font-bold text-slate-800">
              {isOnline ? 'trong vài phút' : 'trong vài giờ'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400">Điểm Uy Tín</span>
            <p className="font-bold text-blue-600 flex items-center gap-1">
              <Award size={13} />
              <span>
                {trustScore} ({formatTrustLevel(trustLevel)})
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductShopBanner;
