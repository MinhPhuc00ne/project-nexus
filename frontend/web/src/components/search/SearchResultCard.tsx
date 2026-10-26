import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Shield,
  ShieldCheck,
  Truck,
  Box,
  Star,
  Gavel,
  Bell,
  Zap,
  CreditCard,
  Flame,
  Clock,
  RotateCcw,
  ShoppingCart,
  Store,
} from 'lucide-react';
import type { ProductItem } from './types';

interface SearchResultCardProps {
  item: ProductItem;
  isLiked: boolean;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
  onPreview: (item: ProductItem) => void;
  onAddToCart?: (item: ProductItem, e: React.MouseEvent) => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  item,
  isLiked,
  onToggleLike,
  onPreview,
  onAddToCart,
}) => {
  return (
    <div className="[background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:12px] overflow-hidden flex flex-col [transition:all_0.2s_ease] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)] relative hover:[transform:translateY(-3px)] hover:[box-shadow:0_8px_20px_rgba(0,_0,_0,_0.07)] hover:border-slate-300 hover:[&_.product-image-img]:[transform:scale(1.03)]">
      {/* Media / Image Box */}
      <div className="relative w-full aspect-square [background-color:#0b0f19] overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover [transition:transform_0.3s_ease]"
          loading="lazy"
        />

        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {item.primaryBadge.type === 'live' && (
            <span className="bg-red-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1 [letter-spacing:0.3px] [box-shadow:0_2px_4px_rgba(220,_38,_38,_0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
              {item.primaryBadge.text}
            </span>
          )}
          {item.primaryBadge.type === 'mall' && (
            <span className="bg-blue-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1 [box-shadow:0_2px_4px_rgba(37,_99,_235,_0.3)]">
              <ShieldCheck className="w-3 h-3" />
              {item.primaryBadge.text}
            </span>
          )}
          {item.primaryBadge.type === 'upcoming' && (
            <span className="bg-slate-800 [color:#fde047] [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {item.primaryBadge.text}
            </span>
          )}
          {item.primaryBadge.type === 'flash' && (
            <span className="bg-red-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {item.primaryBadge.text}
            </span>
          )}
          {item.primaryBadge.type === 'free_deposit' && (
            <span className="bg-emerald-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {item.primaryBadge.text}
            </span>
          )}
          {item.primaryBadge.type === 'verified' && (
            <span className="bg-blue-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {item.primaryBadge.text}
            </span>
          )}

          {/* Sub glass badge */}
          {item.subBadge && (
            <span
              className={`[background-color:rgba(255,_255,_255,_0.9)] [backdrop-filter:blur(4px)] text-slate-800 [font-size:9px] font-bold [padding:2px_6px] rounded inline-flex items-center gap-1 [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.1)] [&.yellow-tag]:[background-color:#fef08a] [&.yellow-tag]:[color:#854d0e] ${item.subBadge.isYellow ? 'yellow-tag' : ''}`}
            >
              {item.subBadge.icon === '3d' && <Box className="w-2.5 h-2.5 text-blue-600" />}
              {item.subBadge.text}
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          className={`absolute top-2 right-2 [width:28px] [height:28px] rounded-full [background:rgba(255,_255,_255,_0.9)] [backdrop-filter:blur(4px)] [border:none] flex items-center justify-center text-slate-500 cursor-pointer z-10 [transition:all_0.15s_ease] [box-shadow:0_2px_4px_rgba(0,_0,_0,_0.1)] hover:[transform:scale(1.1)] hover:text-red-500 [&.favorited]:text-red-500 [&.favorited]:bg-white ${isLiked ? 'favorited' : ''}`}
          onClick={(e) => onToggleLike(item.id, e)}
          aria-label="Thêm vào yêu thích"
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Bottom Image Overlay Bar */}
        {item.imageOverlay && item.imageOverlay.leftText && (
          <div
            className="absolute bottom-1.5 left-1.5 right-1.5 [background:rgba(255,_255,_255,_0.92)] [backdrop-filter:blur(6px)] [border-radius:6px] [padding:4px_8px] flex items-center justify-between text-[10px] font-semibold z-10 [box-shadow:0_2px_4px_rgba(0,_0,_0,_0.08)] cursor-pointer hover:bg-white transition-colors"
            onClick={() => onPreview(item)}
            title="Bấm để xoay 3D trực tiếp"
          >
            <div className="flex items-center gap-1 text-blue-600">
              {item.imageOverlay.leftIcon === 'rotate' && <RotateCcw className="w-3 h-3" />}
              {item.imageOverlay.leftIcon === 'hourglass' && (
                <Clock className="w-3 h-3 text-blue-600" />
              )}
              <span>{item.imageOverlay.leftText}</span>
            </div>
            <div className="[color:#b45309] font-bold">
              <span>{item.imageOverlay.rightText}</span>
            </div>
          </div>
        )}

        {/* Discount badge */}
        {item.imageOverlay?.isDiscount && (
          <span className="absolute bottom-2 left-2 [background-color:#fee2e2] text-red-600 text-[10px] font-extrabold [padding:2px_6px] rounded z-10">
            {item.imageOverlay.discountText}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col [flex:1]">
        <span className="text-[10px] font-bold [letter-spacing:0.5px] uppercase text-slate-400 mb-1">
          {item.brand}
        </span>
        <h3
          className="text-[13px] font-bold text-slate-900 [line-height:1.35] [margin:0_0_8px] [height:36px] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
          title={item.title}
        >
          <Link to={`/product/${item.id}`} className="hover:text-[#f24e1e] transition">
            {item.title}
          </Link>
        </h3>

        {/* Shop / Seller Row */}
        {item.shopName && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-2">
            <Store size={12} className="text-blue-600 shrink-0" />
            {item.shopId ? (
              <Link
                to={`/shop/${item.shopId}`}
                className="text-blue-600 hover:text-blue-700 hover:underline truncate"
                title={`Xem gian hàng: ${item.shopName}`}
              >
                {item.shopName}
              </Link>
            ) : (
              <span className="truncate">{item.shopName}</span>
            )}
          </div>
        )}

        {/* Rating / Sold Row */}
        {item.rating && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-900">{item.rating.toFixed(1)}</span>
            <span>•</span>
            <span>Đã bán {item.soldCount}</span>
          </div>
        )}

        {/* Price Section */}
        <div className="[margin-top:auto] pt-1">
          {(item.priceLabel || item.timer) && (
            <div className="flex items-center justify-between text-[11px] mb-[2px]">
              {item.priceLabel && (
                <span className="text-slate-500 font-medium">{item.priceLabel}</span>
              )}
              {item.timer && (
                <span className="flex items-center gap-[3px] text-red-600 font-bold text-[11px]">
                  <Clock className="w-3 h-3" /> {item.timer}
                </span>
              )}
            </div>
          )}

          {item.oldPrice && (
            <div className="text-[11px] text-slate-400 [text-decoration:line-through] mb-[2px]">
              {item.oldPrice}
            </div>
          )}

          <div
            className={`[font-size:17px] font-extrabold leading-tight [&.orange]:[color:#ea580c] [&.red]:text-red-600 [&.black]:text-slate-900 ${item.priceColor}`}
          >
            {item.currentPrice}
          </div>

          {/* Sub metadata */}
          <div className="flex items-center justify-between text-[11px] mt-1.5 text-slate-500">
            <span>{item.subMetaLeft}</span>
            {item.subMetaRight && (
              <span
                className={
                  item.subMetaRightType === 'link'
                    ? 'text-blue-600 font-semibold'
                    : item.subMetaRightType === 'waiting'
                      ? '[color:#ea580c] font-bold'
                      : ''
                }
              >
                {item.subMetaRight}
              </span>
            )}
            {item.subMetaRightType === 'green_ship' && (
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <Truck className="w-3 h-3" /> Freeship
              </span>
            )}
            {item.subMetaRightType === 'blue_pay' && (
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
              </span>
            )}
            {item.subMetaRightType === 'blue_cert' && (
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {item.actionButton ? (
          <div className="mt-2.5">
            {item.actionButton.type === 'bid' && (
              <button
                type="button"
                className="w-full [background:linear-gradient(135deg,_#ea580c,_#f97316)] text-white [border:none] [border-radius:8px] [padding:8px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:all_0.15s_ease] [box-shadow:0_2px_4px_rgba(234,_88,_12,_0.2)] hover:[background:linear-gradient(135deg,_#c2410c,_#ea580c)] hover:[transform:translateY(-1px)]"
                onClick={() => onPreview(item)}
              >
                <Gavel className="w-3.5 h-3.5" />
                {item.actionButton.text}
              </button>
            )}
            {item.actionButton.type === 'schedule' && (
              <button
                type="button"
                className="w-full bg-slate-50 [border:1px_solid_#e2e8f0] text-slate-800 [border-radius:8px] [padding:8px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:all_0.15s_ease] hover:bg-slate-100 hover:border-slate-300"
                onClick={() => alert(`Đã đặt lịch báo phiên: ${item.title}`)}
              >
                <Bell className="w-3.5 h-3.5" />
                {item.actionButton.text}
              </button>
            )}
            {item.actionButton.type === 'free_bid' && (
              <button
                type="button"
                className="w-full [background:linear-gradient(135deg,_#ea580c,_#f97316)] text-white [border:none] [border-radius:8px] [padding:8px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:all_0.15s_ease] [box-shadow:0_2px_4px_rgba(234,_88,_12,_0.2)] hover:[background:linear-gradient(135deg,_#c2410c,_#ea580c)] hover:[transform:translateY(-1px)]"
                onClick={() => onPreview(item)}
              >
                <Zap className="w-3.5 h-3.5" />
                {item.actionButton.text}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2">
            <Link
              to={`/product/${item.id}`}
              className="flex-1 text-center py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              Xem chi tiết
            </Link>
            {onAddToCart && (
              <button
                type="button"
                onClick={(e) => onAddToCart(item, e)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
                title="Thêm vào giỏ hàng"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultCard;
