import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Award,
  MapPin,
  ShieldCheck,
  Clock,
  Share2,
  MessageCircle,
  Flag,
} from 'lucide-react';
import type { ShopListItem } from '@/features/catalog/services/products.service';
import ReportModal from '../report/ReportModal';

interface ShopHeaderProps {
  shop: ShopListItem;
  onShare: () => void;
  onContact: () => void;
  onReported?: (msg: string) => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({ shop, onShare, onContact, onReported }) => {
  const { t } = useTranslation('guest');
  const [showReportModal, setShowReportModal] = useState(false);

  // Avatar của Shop là riêng biệt hoàn toàn với Avatar cá nhân của Seller
  const shopLogoUrl = shop.avatarUrl;

  const getTrustBadge = (trustLevel: string) => {
    const level = (trustLevel || '').toUpperCase();
    if (level === 'DIAMOND') {
      return {
        label: t('product.trustDiamond'),
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    if (level === 'PLATINUM') {
      return {
        label: t('product.trustPlatinum'),
        color: 'bg-slate-100 text-ink border-slate-300',
      };
    }
    if (level === 'GOLD') {
      return { label: t('shop.trustGoldLabel'), color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return {
      label: t('shop.trustPartnerLabel'),
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  const badge = getTrustBadge(shop.trustLevel);

  return (
    <section className="bg-[var(--color-navy)] text-white relative overflow-hidden border-b border-blue-900">
      <div className="storefront-container py-9 relative z-10">
        <div className="flex items-center gap-2 text-xs text-blue-200 mb-5">
          <Link to="/" className="hover:text-white transition">
            {t('shop.breadcrumbHome')}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/search" className="hover:text-white transition">
            {t('shop.breadcrumbShops')}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white font-semibold">{shop.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-lg bg-white text-[var(--color-navy)] flex items-center justify-center text-2xl sm:text-3xl font-semibold shadow-md border-2 border-blue-200 shrink-0 overflow-hidden">
              {shopLogoUrl ? (
                <img src={shopLogoUrl} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(shop.name || 'S').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {shop.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badge.color}`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
                {shop.isSellerActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/15 text-white border border-white/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {t('product.online')}
                  </span>
                )}
              </div>

              <p className="text-xs text-blue-100 font-medium mb-2">
                {t('shop.ownerLabel')}{' '}
                <span className="text-white font-semibold">{shop.sellerFullName}</span>
              </p>

              {shop.description && (
                <p className="text-xs text-blue-100/90 max-w-xl line-clamp-2 mb-2.5">
                  {shop.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-blue-100 flex-wrap">
                {shop.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-200" />
                    {shop.address.district ? `${shop.address.district}, ` : ''}
                    {shop.address.city || t('shop.defaultCountry')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                  {t('shop.reputationScore')}{' '}
                  <strong className="text-white">{shop.reputationScore}/100</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  {t('shop.responseRate')} <strong className="text-white">99%</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('shop.share')}</span>
            </button>
            <button
              type="button"
              onClick={onContact}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[var(--color-navy)] hover:bg-blue-50 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t('shop.contactShop')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-blue-500/20 text-blue-100 hover:text-white text-xs font-semibold border border-white/20 transition cursor-pointer"
              title={t('product.reportShopTitle')}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t('product.reportShop')}</span>
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="SHOP"
        targetId={shop.id}
        targetName={shop.name}
        onReported={onReported}
      />
    </section>
  );
};

export default ShopHeader;
