import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Store, Award, Star, Flag } from 'lucide-react';
import type { ProductDetail } from '@/features/catalog/types/product.types';
import type { ShopProfile } from '@/features/catalog/types/shop.types';
import { getShopDetail } from '@/features/catalog/services/shops';
import { getStoredToken } from '@/features/auth/services/auth';
import ReportModal from '../report/ReportModal';

interface ProductShopBannerProps {
  product: ProductDetail;
  onReported?: (msg: string) => void;
}

export const ProductShopBanner: React.FC<ProductShopBannerProps> = ({ product, onReported }) => {
  const { t } = useTranslation('guest');
  const navigate = useNavigate();
  const location = useLocation();
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [showReportShopModal, setShowReportShopModal] = useState(false);

  const formatJoinDate = (dateString?: string): string => {
    if (!dateString) return t('product.joinedRecently');
    const diffDays = Math.floor(
      (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 1) return t('product.joinedToday');
    if (diffDays < 30) return t('product.joinedDaysAgo', { count: diffDays });
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return t('product.joinedMonthsAgo', { count: diffMonths });
    return t('product.joinedYearsAgo', { count: Math.floor(diffMonths / 12) });
  };

  const formatTrustLevel = (level?: string): string => {
    const upper = (level || '').toUpperCase();
    if (upper === 'DIAMOND') return t('product.trustDiamond');
    if (upper === 'PLATINUM') return t('product.trustPlatinum');
    if (upper === 'GOLD') return t('product.trustGold');
    if (upper === 'SILVER') return t('product.trustSilver');
    if (upper === 'BRONZE') return t('product.trustBronze');
    return t('product.trustVerified');
  };

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

  const shopName = shopProfile?.name || fallbackShop?.name || t('product.defaultShopName');
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
                <span className="text-xl font-semibold text-[var(--color-navy)]">
                  {shopName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              title={isOnline ? t('product.online') : t('product.offline')}
            />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="font-semibold text-ink text-base truncate">
              {sellerId ? (
                <Link to={`/shop/${sellerId}`} className="hover:text-blue-600 transition">
                  {shopName}
                </Link>
              ) : (
                shopName
              )}
            </h3>
            <p className="text-[11px] font-medium text-muted flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {isOnline ? t('product.shopActive') : t('product.shopOffline')}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>{t('product.chatNow')}</span>
              </button>

              {sellerId ? (
                <Link
                  to={`/shop/${sellerId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition"
                >
                  <Store size={13} />
                  <span>{t('product.viewShop')}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
                  <Store size={13} />
                  <span>{t('product.viewShop')}</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowReportShopModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/50 rounded-md transition cursor-pointer"
                title={t('product.reportShopTitle')}
              >
                <Flag size={12} />
                <span>{t('product.reportShop')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Shop stats grid (Blue & White signature style) */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
          <div className="space-y-0.5">
            <span className="text-muted">{t('product.shopReviewsLabel')}</span>
            <p className="font-semibold text-blue-700 flex items-center gap-1">
              <Star size={12} className="fill-blue-600 text-blue-600" />
              <span>{t('product.shopReviewsCount', { count: totalReviews })}</span>
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted">{t('product.responseRateLabel')}</span>
            <p className="font-semibold text-blue-700">
              {isOnline ? '99%' : t('product.waitingResponse')}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted">{t('product.joinedLabel')}</span>
            <p className="font-semibold text-ink">{formatJoinDate(shopProfile?.createdAt)}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted">{t('product.productsLabel')}</span>
            <p className="font-semibold text-blue-700">{totalProducts}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted">{t('product.responseTimeLabel')}</span>
            <p className="font-semibold text-ink">
              {isOnline ? t('product.withinMinutes') : t('product.withinHours')}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted">{t('product.reputationLabel')}</span>
            <p className="font-semibold text-blue-700 flex items-center gap-1">
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
