import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, X, ShieldCheck, Gavel } from 'lucide-react';
import type { ProductItem } from './types';

interface SearchPreviewModalProps {
  item: ProductItem | null;
  onClose: () => void;
}

export const SearchPreviewModal: React.FC<SearchPreviewModalProps> = ({ item, onClose }) => {
  const navigate = useNavigate();

  if (!item) return null;

  return (
    <div
      className="fixed [inset:0] [background:rgba(15,_23,_42,_0.7)] [backdrop-filter:blur(8px)] [z-index:100] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="[background:#ffffff] [border-radius:16px] w-full max-w-[680px] overflow-hidden [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.2)] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="[padding:16px_20px] [border-bottom:1px_solid_#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm">
              Mô Phỏng 3D AR & Chi Tiết Phiên Đấu Giá
            </span>
          </div>
          <button
            type="button"
            className="[background:none] [border:none] text-slate-500 cursor-pointer p-1 [border-radius:6px] hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl">
            <img
              src={item.image}
              alt={item.title}
              className="w-24 h-24 object-cover rounded-lg shadow-sm"
            />
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {item.brand}
              </span>
              <h3 className="font-bold text-gray-900 text-base mt-1">{item.title}</h3>
              <div className="text-xl font-extrabold text-orange-600 mt-2">{item.currentPrice}</div>
            </div>
          </div>

          <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-1 text-blue-950 font-bold">
                Bảo chứng kiểm định vật lý số 100%
              </strong>
              Vật phẩm đã được chuyên gia đồng kiểm thông qua Micro-Mesh scan bề mặt 3D, kèm theo
              NFT Provenance Token lưu trữ bất biến trên chuỗi khối.
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-sm"
              onClick={() => {
                onClose();
                navigate('/auction');
              }}
            >
              <Gavel className="w-4 h-4" /> Vào Phòng Đấu Giá Trực Tiếp 3D
            </button>
            <button
              type="button"
              className="px-5 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPreviewModal;
