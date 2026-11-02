import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Store, Award, Star, Flag } from 'lucide-react';
import type { ProductDetail } from '../../types/product.types';
import type { ShopProfile } from '../../types/shop.types';
import { getShopDetail } from '../../services/shops';
import { getStoredToken } from '../../services/auth';
import ReportModal from '../report/ReportModal';

interface ProductShopBannerProps {
  product: ProductDetail;
  onReported?: (msg: string) => void;
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

export const ProductShopBanner: React.FC<ProductShopBannerProps> = ({ product, onReported }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [showReportShopModal, setShowReportShopModal] = useState(false);

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
  // Avatar của Shop độc lập hoàn toàn với Avatar của Seller
  const shopAvatarUrl = shopProfile?.avatarUrl ?? fallbackShop?.avatarUrl;
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Shop Logo + Name + Action buttons */}
        <div className="flex items-center gap-4 lg:pr-8 lg:border-r border-slate-200 min-w-[300px]">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-lg border border-blue-200 bg-blue-50 overflow-hidden flex items-center justify-center">
              {shopAvatarUrl ? (
                <img src={shopAvatarUrl} alt={shopName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-[#1c3973]">
                  {shopName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${
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
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {isOnline ? 'Gian hàng đang hoạt động' : 'Tạm ngưng trực tuyến'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Chat Ngay</span>
              </button>

              {sellerId ? (
                <Link
                  to={`/shop/${sellerId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition"
                >
                  <Store size={13} />
                  <span>Xem Shop</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
                  <Store size={13} />
                  <span>Xem Shop</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowReportShopModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50/50 rounded-md transition cursor-pointer"
                title="Báo cáo vi phạm gian hàng"
              >
                <Flag size={12} />
                <span>Báo cáo Shop</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Shop stats grid (Blue & White signature style) */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500">Đánh Giá Gian Hàng</span>
            <p className="font-bold text-blue-700 flex items-center gap-1">
              <Star size={12} className="fill-blue-600 text-blue-600" />
              <span>{totalReviews} đánh giá</span>
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500">Tỉ Lệ Phản Hồi</span>
            <p className="font-bold text-blue-700">{isOnline ? '99%' : 'Chờ phản hồi'}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500">Tham Gia</span>
            <p className="font-bold text-slate-800">{formatJoinDate(shopProfile?.createdAt)}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500">Sản Phẩm</span>
            <p className="font-bold text-blue-700">{totalProducts}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500">Thời Gian Phản Hồi</span>
            <p className="font-bold text-slate-800">
              {isOnline ? 'trong vài phút' : 'trong vài giờ'}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500">Điểm Uy Tín</span>
            <p className="font-bold text-blue-700 flex items-center gap-1">
              <Award size={13} />
              <span>
                {trustScore} ({formatTrustLevel(trustLevel)})
              </span>
            </p>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportShopModal}
        onClose={() => setShowReportShopModal(false)}
        targetType="SHOP"
        targetId={sellerId || shopName}
        targetName={shopName}
        onReported={onReported}
      />
    </div>
  );
};

export default ProductShopBanner;
