import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Layers } from 'lucide-react';
import { formatAuctionImage } from '@/features/auction/services/auction.service';

interface SellerGalleryFrame3DProps {
  title: string;
  sellerName?: string;
  lotNumber?: number | null;
  images: string[];
}

const FALLBACK_GALLERY_IMG =
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1000&q=80';

/**
 * Khung Tranh Triển Lãm 3D (3D Gallery Frame):
 * Tự động kích hoạt khi sản phẩm của Seller KHÔNG nằm trong 10 model 3D dựng sẵn.
 * Đóng gói toàn bộ các hình ảnh món hàng của Seller vào khung trưng bày 3D có đèn rọi & chuyển góc mượt.
 */
export const SellerGalleryFrame3D: React.FC<SellerGalleryFrame3DProps> = ({
  title,
  sellerName,
  lotNumber,
  images,
}) => {
  const { t } = useTranslation('auction');
  const resolvedImages = (images.length > 0 ? images : [FALLBACK_GALLERY_IMG]).map(
    (url) => formatAuctionImage(url) || FALLBACK_GALLERY_IMG,
  );
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    setActiveImgIdx(0);
    if (resolvedImages.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveImgIdx((prev) => (prev + 1) % resolvedImages.length);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [title, resolvedImages.length]);

  const activeUrl = resolvedImages[activeImgIdx] || resolvedImages[0];
  const leftPreview =
    resolvedImages.length > 1 ? resolvedImages[(activeImgIdx + 1) % resolvedImages.length] : null;
  const rightPreview =
    resolvedImages.length > 2 ? resolvedImages[(activeImgIdx + 2) % resolvedImages.length] : null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full px-4">
      {/* Khung cảnh không gian 3D Perspective */}
      <div className="museum-frame-stage relative flex items-center justify-center w-full max-w-[480px] h-[320px]">
        {/* Cánh ảnh phụ bên trái (nếu seller gửi >= 2 ảnh) */}
        {leftPreview && (
          <div className="museum-frame-wing museum-frame-wing-left hidden sm:block">
            <img
              src={leftPreview}
              alt={t('showcase.frameWingLeftAlt', { title })}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_IMG;
              }}
            />
          </div>
        )}

        {/* Khung Tranh Trung Tâm mạ vàng 3D */}
        <div className="museum-frame-center relative z-10 w-[250px] sm:w-[290px] h-[250px] sm:h-[280px] rounded-xl p-3 bg-gradient-to-br from-amber-300 via-yellow-600 to-amber-900 shadow-[0_28px_70px_rgba(0,0,0,0.85)]">
          {/* Lớp bo nhung bảo tàng bên trong */}
          <div className="relative w-full h-full rounded-lg bg-slate-950 p-2.5 border border-amber-200/40 shadow-inner overflow-hidden">
            <img
              key={activeUrl}
              src={activeUrl}
              alt={title}
              className="ken-burns-pan w-full h-full object-cover rounded transition-opacity duration-700"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_IMG;
              }}
            />

            {/* Hiệu ứng ánh sáng lướt qua mặt kính bảo vệ khung tranh */}
            <div className="museum-frame-glass-glare pointer-events-none absolute inset-0" />

            {/* Thanh tia quét laser thẩm định trực tiếp trên ảnh Seller */}
            <div className="hud-scanline pointer-events-none" />

            {/* Nhãn góc ảnh */}
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-md bg-slate-950/85 px-2 py-0.5 text-[10px] font-mono text-amber-200 border border-amber-400/30">
              <ImageIcon className="w-3 h-3 text-amber-400" />
              <span>
                {t('showcase.framePhotoBadge', {
                  current: activeImgIdx + 1,
                  total: resolvedImages.length,
                })}
              </span>
            </div>
          </div>

          {/* Bảng đồng khắc tên dưới chân khung */}
          <div className="mx-auto -mt-1 w-4/5 rounded-b-md border border-amber-400/50 bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 px-3 py-1 text-center shadow-lg">
            <p className="truncate text-[10px] font-bold tracking-widest text-amber-100 uppercase">
              {lotNumber ? t('showcase.frameLotPrefix', { number: lotNumber }) : ''}
              {sellerName || 'SELLER ARCHIVE'}
            </p>
          </div>
        </div>

        {/* Cánh ảnh phụ bên phải (nếu seller gửi >= 3 ảnh) */}
        {rightPreview && (
          <div className="museum-frame-wing museum-frame-wing-right hidden sm:block">
            <img
              src={rightPreview}
              alt={t('showcase.frameWingRightAlt', { title })}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_IMG;
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-slate-950/80 px-3.5 py-1 text-[11px] font-mono font-semibold tracking-wider text-amber-200 shadow-lg backdrop-blur-md">
        <Layers className="w-3.5 h-3.5 text-amber-400" />
        <span>{t('showcase.frameFooterTag', { count: resolvedImages.length })}</span>
      </div>
    </div>
  );
};
