import React from 'react';
import { Scan, Eye, Box, RotateCw, Sparkles } from 'lucide-react';
import type { AuctionViewerMode } from './types';

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
}

export const AuctionGallery: React.FC<AuctionGalleryProps> = ({
  viewerMode,
  setViewerMode,
  selectedThumb,
  setSelectedThumb,
  rotationAngle,
  setRotationAngle,
  thumbnails,
}) => {
  return (
    <div>
      {/* 3D / HD Viewer Main Box */}
      <div className="relative aspect-square [background-color:#ffffff] [border:1px_solid_#e2e8f0] rounded-2xl overflow-hidden flex items-center justify-center [box-shadow:0_4px_20px_rgba(0,_0,_0,_0.04)]">
        {/* Floating Top Left Indicators */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <span className="inline-flex items-center gap-[0.35rem] [background:rgba(220,_38,_38,_0.9)] text-white text-[11px] font-bold [padding:0.25rem_0.55rem] rounded-full [box-shadow:0_2px_8px_rgba(220,_38,_38,_0.35)] w-fit">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            LIVE 3D ĐANG DIỄN RA
          </span>
          <span className="inline-flex items-center gap-[0.35rem] [background:rgba(15,_23,_42,_0.78)] [backdrop-filter:blur(6px)] text-white text-[11px] font-semibold [padding:0.25rem_0.55rem] rounded-full w-fit">
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            3D LiDAR Có Sẵn
          </span>
        </div>

        {/* Main Product Image with simulated 3D rotation */}
        <img
          src={thumbnails[selectedThumb].src}
          alt="Audemars Piguet Royal Oak Chrono"
          className="[max-width:82%] [max-height:82%] object-contain [transition:transform_0.2s_cubic-bezier(0.2,_0,_0,_1)] [filter:drop-shadow(0_15px_25px_rgba(0,_0,_0,_0.12))]"
          style={{
            transform: `rotate(${rotationAngle}deg) scale(${viewerMode === '3d' ? 1.08 : 1})`,
          }}
        />

        {/* LiDAR Holographic Overlay (if mode = lidar) */}
        {viewerMode === 'lidar' && (
          <div className="absolute [inset:0] pointer-events-none [background-image:linear-gradient(rgba(6,_182,_212,_0.15)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(6,_182,_212,_0.15)_1px,_transparent_1px)] [background-size:24px_24px]">
            <div className="absolute top-0 left-0 right-0 h-[3px] [background:linear-gradient(90deg,_transparent,_#06b6d4,_#38bdf8,_transparent)] [box-shadow:0_0_15px_#06b6d4,_0_0_30px_#06b6d4] [animation:lidarScanAnim_2.8s_ease-in-out_infinite_alternate]"></div>
            <div className="absolute bottom-3.5 left-3.5 [background:rgba(15,_23,_42,_0.85)] [backdrop-filter:blur(8px)] [color:#38bdf8] font-mono text-[11px] [padding:0.35rem_0.65rem] rounded-md [border:1px_solid_rgba(56,_189,_248,_0.4)] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>LIDAR 3D MATRIX: SAI SỐ 0.0018mm [PASS]</span>
            </div>
          </div>
        )}

        {/* 3D Interactive badge */}
        {viewerMode === '3d' && (
          <div className="absolute bottom-3.5 left-3.5 [background:rgba(15,_23,_42,_0.85)] [backdrop-filter:blur(8px)] [color:#38bdf8] font-mono text-[11px] [padding:0.35rem_0.65rem] rounded-md [border:1px_solid_rgba(56,_189,_248,_0.4)] flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>KÉO HOẶC BẤM ĐỂ XOAY 360° • KHÔNG GIAN 3 CHIỀU</span>
          </div>
        )}
      </div>

      {/* Viewer Mode Switcher */}
      <div className="flex items-center justify-center gap-2 mt-4 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          className={`[flex:1] inline-flex items-center justify-center gap-1.5 [padding:0.5rem_0.75rem] text-xs font-semibold text-slate-500 rounded-lg [border:none] [background:transparent] cursor-pointer [transition:all_0.15s_ease] whitespace-nowrap hover:text-slate-900 [&.active]:bg-white [&.active]:text-slate-900 [&.active]:[box-shadow:0_2px_4px_rgba(0,_0,_0,_0.06)] ${viewerMode === 'photo' ? 'active' : ''}`}
          onClick={() => setViewerMode('photo')}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Ảnh Studio HD</span>
        </button>
        <button
          type="button"
          className={`[flex:1] inline-flex items-center justify-center gap-1.5 [padding:0.5rem_0.75rem] text-xs font-semibold text-slate-500 rounded-lg [border:none] [background:transparent] cursor-pointer [transition:all_0.15s_ease] whitespace-nowrap hover:text-slate-900 [&.active]:bg-white [&.active]:text-slate-900 [&.active]:[box-shadow:0_2px_4px_rgba(0,_0,_0,_0.06)] ${viewerMode === '3d' ? 'active' : ''}`}
          onClick={() => {
            setViewerMode('3d');
            setRotationAngle((prev) => prev + 45);
          }}
        >
          <Box className="w-3.5 h-3.5 text-blue-600" />
          <span>Xoay 360° 3D Mesh</span>
        </button>
        <button
          type="button"
          className={`[flex:1] inline-flex items-center justify-center gap-1.5 [padding:0.5rem_0.75rem] text-xs font-semibold text-slate-500 rounded-lg [border:none] [background:transparent] cursor-pointer [transition:all_0.15s_ease] whitespace-nowrap hover:text-slate-900 [&.active]:bg-white [&.active]:text-slate-900 [&.active]:[box-shadow:0_2px_4px_rgba(0,_0,_0,_0.06)] ${viewerMode === 'lidar' ? 'active' : ''}`}
          onClick={() => setViewerMode('lidar')}
        >
          <Scan className="w-3.5 h-3.5 text-cyan-600" />
          <span>Quét LiDAR Hologram</span>
        </button>
      </div>

      {/* Gallery Thumbnails */}
      <div className="grid [grid-template-columns:repeat(5,_1fr)] gap-2.5 mt-4">
        {thumbnails.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className={`aspect-square [background:#f8fafc] [border:2px_solid_#e2e8f0] rounded-lg p-1 cursor-pointer overflow-hidden flex items-center justify-center [transition:all_0.15s_ease] hover:border-slate-300 [&.active]:border-blue-600 [&.active]:bg-blue-50 ${selectedThumb === idx ? 'active' : ''}`}
            onClick={() => setSelectedThumb(idx)}
            title={item.label}
          >
            <img
              src={item.src}
              alt={item.label}
              className="[max-width:90%] [max-height:90%] object-contain"
            />
          </button>
        ))}
      </div>

      {/* Vault Storage Assurance Card */}
      <div className="mt-5 [padding:0.875rem_1rem] [background:#f8fafc] [border:1px_solid_#e2e8f0] rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="[width:40px] [height:40px] rounded-full [background:#1e3a8a] text-white flex items-center justify-center font-bold text-[15px] [flex-shrink:0]">
            GV
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-900 m-0">
              Geneva Vault Horology Store
            </h4>
            <p className="text-[11px] text-slate-500 m-0">
              <span className="text-amber-500 font-bold">★ 4.99/5</span> • 184 phiên đấu giá hoàn
              tất
            </p>
          </div>
        </div>
        <div className="text-[11px] text-blue-600 [background:#eff6ff] [border:1px_solid_#bfdbfe] [padding:0.25rem_0.5rem] rounded-full font-semibold whitespace-nowrap">
          <span>Kho Bảo Mật Q.1 (TP.HCM)</span>
        </div>
      </div>
    </div>
  );
};

export default AuctionGallery;
