import { Link } from 'react-router-dom';
import {
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  ChevronRight,
  Box,
  Gavel,
} from 'lucide-react';
import type { ProductDetail } from '../products';

interface ProductImageGalleryProps {
  product: ProductDetail;
  selectedImgIdx: number;
  onSelectImage: (index: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function ProductImageGallery({
  product,
  selectedImgIdx,
  onSelectImage,
  isFavorite,
  onToggleFavorite,
}: ProductImageGalleryProps) {
  return (
    <div className="lg:col-span-5 flex flex-col gap-4">
      <div className="relative aspect-square rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center group">
        <img
          src={product.images[selectedImgIdx] || product.images[0]}
          alt={product.name}
          className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
        />

        {/* 3D / Auction Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is3d && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
              <Box size={14} />
              MÔ HÌNH 3D XOAY 360°
            </span>
          )}
          {product.isAuction && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f24e1e] text-white shadow-md">
              <Gavel size={14} />
              PHIÊN ĐẤU GIÁ TRỰC TIẾP
            </span>
          )}
        </div>

        {/* Heart favorite */}
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`absolute top-3 right-3 p-2.5 rounded-full transition shadow cursor-pointer ${
            isFavorite
              ? 'bg-red-50 text-red-500'
              : 'bg-white/90 text-slate-600 hover:text-red-500 hover:bg-white'
          }`}
          title="Lưu vào yêu thích"
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {product.isAuction && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-md rounded-xl p-3 text-white flex items-center justify-between">
            <span className="text-xs text-slate-300">Đấu giá thời gian thực:</span>
            <Link
              to="/auction"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f24e1e] hover:bg-[#d63b0e] text-white text-xs font-bold rounded-lg transition"
            >
              Vào phòng đấu giá
              <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* Thumbnail selector */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {product.images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectImage(idx)}
            className={`w-20 h-20 rounded-xl border-2 overflow-hidden bg-slate-50 transition cursor-pointer shrink-0 ${
              selectedImgIdx === idx
                ? 'border-[#f24e1e] shadow-md'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-contain p-1" />
          </button>
        ))}
      </div>

      {/* Platform Guarantees */}
      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
          <span>Bảo chứng ký quỹ Escrow PayOS 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-blue-600 shrink-0" />
          <span>Freeship & đồng kiểm GHN Express</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw size={18} className="text-amber-600 shrink-0" />
          <span>Đổi trả 7 ngày nếu lỗi kiểm định</span>
        </div>
        <div className="flex items-center gap-2">
          <Award size={18} className="text-purple-600 shrink-0" />
          <span>Cam kết chính hãng hoàn tiền 200%</span>
        </div>
      </div>
    </div>
  );
}
