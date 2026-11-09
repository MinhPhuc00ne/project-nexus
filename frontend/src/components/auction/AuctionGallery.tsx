import React, { useState } from 'react';
import {
  Scan,
  Eye,
  Box,
  RotateCw,
  RotateCcw,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { AuctionViewerMode } from './types';
import type { AuctionEntity } from '../../services/auction.service';
import { openChatWithUser } from '../chat/chatEvents';

interface ThumbnailItem {
  label: string;
  src: string;
}

interface AuctionGalleryProps {
  viewerMode: AuctionViewerMode;
  setViewerMode: (mode: AuctionViewerMode) => void;
  selectedThumb: number;
  setSelectedThumb: (idx: number) => void;
  rotationAngle: number;
  setRotationAngle: React.Dispatch<React.SetStateAction<number>>;
  thumbnails: ThumbnailItem[];
  auction?: AuctionEntity | null;
}

export const AuctionGallery: React.FC<AuctionGalleryProps> = ({
  viewerMode,
  setViewerMode,
  selectedThumb,
  setSelectedThumb,
  rotationAngle,
  setRotationAngle,
  thumbnails,
  auction,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewerMode !== '3d') return;
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewerMode !== '3d') return;
    const diff = e.clientX - dragStartX;
    if (Math.abs(diff) > 8) {
      setRotationAngle((prev) => (prev + (diff > 0 ? 15 : -15)) % 360);
      setDragStartX(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentImage =
    thumbnails[selectedThumb]?.src ||
    thumbnails[0]?.src ||
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80';

  const sellerName =
    auction?.seller?.fullName || auction?.product?.category?.name || 'NEXUS Luxury Horology';

  const sellerAvatar = auction?.seller?.avatarUrl;

  return (
    <div className="flex flex-col gap-4">
      {/* 3D / HD Viewer Main Stage */}
      <div
        className="relative aspect-square w-full rounded-3xl overflow-hidden flex items-center justify-center bg-radial from-slate-850 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl select-none group cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Ambient Studio Spotlight Glow */}
        <div className="absolute inset-0 bg-radial from-sky-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Floating Top Indicators */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 bg-rose-600/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-rose-900/40 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>LIVE 3D ĐANG DIỄN RA</span>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-medium px-3 py-1 rounded-full w-fit">
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span>Độ phân giải 4K Ultra-HD</span>
          </div>
        </div>

        {/* Floating Top Right Quick Actions */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 text-slate-300">
          <button
            type="button"
            title="Thu nhỏ"
            disabled={zoomLevel <= 0.8}
            onClick={() => setZoomLevel((prev) => Math.max(0.8, prev - 0.2))}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono font-bold px-1 text-slate-400">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            title="Phóng to"
            disabled={zoomLevel >= 2.2}
            onClick={() => setZoomLevel((prev) => Math.min(2.2, prev + 0.2))}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Mở toàn màn hình"
            onClick={() => window.open(currentImage, '_blank')}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Main Product Image with simulated 3D rotation & Zoom */}
        <div
          className="relative w-full h-full flex items-center justify-center p-8 transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${zoomLevel})`,
          }}
        >
          <img
            src={currentImage}
            alt={thumbnails[selectedThumb]?.label || 'Auction Product'}
            className="max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)] transition-transform duration-200"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80';
            }}
          />
        </div>

        {/* LiDAR Holographic Overlay (if mode = lidar) */}
        {viewerMode === 'lidar' &&
          (() => {
            const firstItem = auction?.items?.[0];
            const certCode =
              firstItem?.appraisalCertificateNumber ||
              (auction?.id ? `NX-3D-${auction.id.slice(0, 8).toUpperCase()}` : 'PASS');

            return (
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(6,182,212,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.15)_1px,transparent_1px)] bg-[size:24px_24px]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#06b6d4] animate-pulse" />
                <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md text-cyan-400 font-mono text-xs px-3.5 py-1.5 rounded-xl border border-cyan-500/40 flex items-center gap-2 shadow-xl">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>QUÉT LIDAR 3D: KHỚP 100% CẤU TRÚC GỐC [{certCode}]</span>
                </div>
              </div>
            );
          })()}

        {/* 3D Interactive Floating Compass / Rotation Bar */}
        {viewerMode === '3d' && (
          <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-700/70 p-2 px-3 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-xs text-sky-400 font-mono font-semibold">
              <RotateCw className="w-4 h-4 text-sky-400 animate-spin" />
              <span>Góc xoay: {Math.abs(rotationAngle % 360)}°</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRotationAngle((prev) => (prev - 45) % 360)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> -45°
              </button>
              <button
                type="button"
                onClick={() => setRotationAngle(0)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Gốc 0°
              </button>
              <button
                type="button"
                onClick={() => setRotationAngle((prev) => (prev + 45) % 360)}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
              >
                +45° <RotateCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Viewer Mode Switcher */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          type="button"
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
            viewerMode === 'photo'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          onClick={() => {
            setViewerMode('photo');
            setZoomLevel(1);
          }}
        >
          <Eye className="w-4 h-4 text-slate-700" />
          <span>Ảnh Studio HD</span>
        </button>

        <button
          type="button"
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
            viewerMode === '3d'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          onClick={() => {
            setViewerMode('3d');
            setRotationAngle((prev) => (prev + 45) % 360);
          }}
        >
          <Box className={`w-4 h-4 ${viewerMode === '3d' ? 'text-white' : 'text-sky-600'}`} />
          <span>Xoay 360° 3D</span>
        </button>

        <button
          type="button"
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
            viewerMode === 'lidar'
              ? 'bg-slate-900 text-cyan-400 shadow-md border border-cyan-500/40'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          onClick={() => setViewerMode('lidar')}
        >
          <Scan className="w-4 h-4 text-cyan-500" />
          <span>Quét Hologram</span>
        </button>
      </div>

      {/* Gallery Thumbnails */}
      <div className="grid grid-cols-5 gap-2.5">
        {thumbnails.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className={`aspect-square bg-white rounded-xl p-1.5 cursor-pointer overflow-hidden flex items-center justify-center border-2 transition ${
              selectedThumb === idx
                ? 'border-sky-600 shadow-md bg-sky-50/40 ring-2 ring-sky-200'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setSelectedThumb(idx)}
            title={item.label}
          >
            <img
              src={item.src}
              alt={item.label}
              className="w-full h-full object-cover rounded-lg hover:scale-105 transition"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';
              }}
            />
          </button>
        ))}
      </div>

      {/* Real Seller & Vault Guarantee Card */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-900 text-white flex items-center justify-center font-black text-base shrink-0 overflow-hidden shadow-inner">
            {sellerAvatar ? (
              <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
            ) : (
              <span>{sellerName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 truncate m-0">{sellerName}</h4>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5 flex items-center gap-2">
              <span className="text-amber-500 font-bold">★ 4.98/5</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã xác thực KYC
              </span>
            </p>
          </div>
        </div>

        {auction?.seller?.id && (
          <button
            type="button"
            onClick={() => openChatWithUser({ userId: auction.seller!.id, userName: sellerName })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Hỏi Seller</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AuctionGallery;
