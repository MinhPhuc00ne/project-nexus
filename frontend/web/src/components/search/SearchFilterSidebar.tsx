import React from 'react';
import { SlidersHorizontal, ChevronUp, Shield, Star } from 'lucide-react';
import type { TransactionTypeFilter, ConditionFilter, BrandFilter, ShippingFilter } from './types';

interface SearchFilterSidebarProps {
  transactionTypes: TransactionTypeFilter;
  setTransactionTypes: React.Dispatch<React.SetStateAction<TransactionTypeFilter>>;
  conditionFilters: ConditionFilter;
  setConditionFilters: React.Dispatch<React.SetStateAction<ConditionFilter>>;
  brandFilters: BrandFilter;
  setBrandFilters: React.Dispatch<React.SetStateAction<BrandFilter>>;
  shippingFilters: ShippingFilter;
  setShippingFilters: React.Dispatch<React.SetStateAction<ShippingFilter>>;
  priceFrom: string;
  setPriceFrom: (val: string) => void;
  priceTo: string;
  setPriceTo: (val: string) => void;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onClearAll: () => void;
}

export const SearchFilterSidebar: React.FC<SearchFilterSidebarProps> = ({
  transactionTypes,
  setTransactionTypes,
  conditionFilters,
  setConditionFilters,
  brandFilters,
  setBrandFilters,
  shippingFilters,
  setShippingFilters,
  priceFrom,
  setPriceFrom,
  priceTo,
  setPriceTo,
  collapsedSections,
  onToggleSection,
  onClearAll,
}) => {
  return (
    <aside className="[width:260px] [flex-shrink:0] flex flex-col gap-4 max-[900px]:w-full">
      <div className="[background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:12px] p-[18px] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)]">
        <div className="flex items-center justify-between mb-4 pb-3 [border-bottom:1px_solid_#f1f5f9]">
          <div className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Bộ Lọc Tìm Kiếm</span>
          </div>
          <button
            type="button"
            className="[background:none] [border:none] text-blue-600 text-xs font-semibold cursor-pointer p-0 hover:underline"
            onClick={onClearAll}
          >
            Xóa tất cả
          </button>
        </div>

        {/* 1. LOẠI HÌNH GIAO DỊCH */}
        <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 select-none"
            onClick={() => onToggleSection('transactionType')}
          >
            <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
              LOẠI HÌNH GIAO DỊCH
            </span>
            <ChevronUp
              className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['transactionType'] ? 'collapsed' : ''}`}
            />
          </div>
          {!collapsedSections['transactionType'] && (
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.live3d ? 'checked' : ''}`}
                    onClick={() =>
                      setTransactionTypes((prev) => ({
                        ...prev,
                        live3d: !prev.live3d,
                      }))
                    }
                  >
                    {transactionTypes.live3d && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Đấu Giá Trực Tiếp 3D (360°)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600 orange">
                  14
                </span>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.mall ? 'checked' : ''}`}
                    onClick={() =>
                      setTransactionTypes((prev) => ({
                        ...prev,
                        mall: !prev.mall,
                      }))
                    }
                  >
                    {transactionTypes.mall && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Mua Ngay (NEXUS Mall)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600 blue">
                  86
                </span>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.upcoming ? 'checked' : ''}`}
                    onClick={() =>
                      setTransactionTypes((prev) => ({
                        ...prev,
                        upcoming: !prev.upcoming,
                      }))
                    }
                  >
                    {transactionTypes.upcoming && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Đấu Giá Sắp Diễn Ra</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                  22
                </span>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.escrow ? 'checked' : ''}`}
                    onClick={() =>
                      setTransactionTypes((prev) => ({
                        ...prev,
                        escrow: !prev.escrow,
                      }))
                    }
                  >
                    {transactionTypes.escrow && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Hàng Ký Gửi Escrow</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                  20
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 2. KHOẢNG GIÁ (VNĐ) */}
        <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 select-none"
            onClick={() => onToggleSection('priceRange')}
          >
            <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
              KHOẢNG GIÁ (VNĐ)
            </span>
            <ChevronUp
              className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['priceRange'] ? 'collapsed' : ''}`}
            />
          </div>
          {!collapsedSections['priceRange'] && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="[flex:1] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">TỪ</span>
                  <input
                    type="text"
                    className="w-full [border:1px_solid_#cbd5e1] [border-radius:6px] [padding:6px_8px] text-xs font-semibold text-slate-900 [background:#f8fafc] [outline:none] [box-sizing:border-box] focus:border-blue-600 focus:[background:#ffffff]"
                    value={priceFrom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPriceFrom(e.target.value)
                    }
                  />
                </div>
                <div className="[flex:1] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ĐẾN</span>
                  <input
                    type="text"
                    className="w-full [border:1px_solid_#cbd5e1] [border-radius:6px] [padding:6px_8px] text-xs font-semibold text-slate-900 [background:#f8fafc] [outline:none] [box-sizing:border-box] focus:border-blue-600 focus:[background:#ffffff]"
                    value={priceTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPriceTo(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="[margin:14px_4px_10px]">
                <div className="relative h-1 bg-slate-200 [border-radius:2px]">
                  <div className="absolute h-full [left:5%] [right:50%] bg-blue-600 [border-radius:2px]"></div>
                  <div className="absolute [top:50%] [transform:translate(-50%,_-50%)] w-3.5 h-3.5 rounded-full bg-white [border:2px_solid_#2563eb] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.15)] cursor-pointer [&.left]:[left:5%] [&.right]:[left:50%] left"></div>
                  <div className="absolute [top:50%] [transform:translate(-50%,_-50%)] w-3.5 h-3.5 rounded-full bg-white [border:2px_solid_#2563eb] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.15)] cursor-pointer [&.left]:[left:5%] [&.right]:[left:50%] right"></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-2">
                  <span>0 VNĐ</span>
                  <span>500M+ VNĐ</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full bg-blue-600 text-white [border:none] [border-radius:8px] [padding:9px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:background-color_0.15s_ease] mt-2.5 hover:bg-blue-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Áp Dụng Khoảng Giá
              </button>
            </div>
          )}
        </div>

        {/* 3. TÌNH TRẠNG VẬT PHẨM */}
        <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 select-none"
            onClick={() => onToggleSection('itemCondition')}
          >
            <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
              TÌNH TRẠNG VẬT PHẨM
            </span>
            <ChevronUp
              className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['itemCondition'] ? 'collapsed' : ''}`}
            />
          </div>
          {!collapsedSections['itemCondition'] && (
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${conditionFilters.brandNew ? 'checked' : ''}`}
                    onClick={() =>
                      setConditionFilters((prev) => ({
                        ...prev,
                        brandNew: !prev.brandNew,
                      }))
                    }
                  >
                    {conditionFilters.brandNew && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Mới 100% Nguyên Hộp (Brand New)</span>
                </div>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${conditionFilters.likeNew ? 'checked' : ''}`}
                    onClick={() =>
                      setConditionFilters((prev) => ({
                        ...prev,
                        likeNew: !prev.likeNew,
                      }))
                    }
                  >
                    {conditionFilters.likeNew && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Like New 99% (Cấp Độ S)</span>
                </div>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${conditionFilters.gradeA ? 'checked' : ''}`}
                    onClick={() =>
                      setConditionFilters((prev) => ({
                        ...prev,
                        gradeA: !prev.gradeA,
                      }))
                    }
                  >
                    {conditionFilters.gradeA && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Cấp Độ A (95% - Đã kiểm định)</span>
                </div>
              </label>

              <div className="bg-blue-50 [border:1px_solid_#bfdbfe] [border-radius:8px] [padding:10px_12px] flex items-start gap-2 mt-1.5">
                <Shield className="w-4 h-4 text-blue-600 [flex-shrink:0] mt-[1px]" />
                <span className="text-[11px] [line-height:1.4] [color:#1e40af] font-medium">
                  Bao gồm Chứng thư Giám định Vật lý & NFT Provenance Token
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. THƯƠNG HIỆU XA XỈ */}
        <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 select-none"
            onClick={() => onToggleSection('luxuryBrands')}
          >
            <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
              THƯƠNG HIỆU XA XỈ
            </span>
            <ChevronUp
              className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['luxuryBrands'] ? 'collapsed' : ''}`}
            />
          </div>
          {!collapsedSections['luxuryBrands'] && (
            <div className="flex flex-col gap-2.5">
              {[
                { key: 'ap', name: 'Audemars Piguet', count: 18 },
                { key: 'patek', name: 'Patek Philippe', count: 24 },
                { key: 'rolex', name: 'Rolex', count: 36 },
                { key: 'hublot', name: 'Hublot', count: 15 },
                { key: 'rm', name: 'Richard Mille', count: 8 },
                { key: 'tissot', name: 'Tissot', count: 22 },
                { key: 'seiko', name: 'Seiko', count: 19 },
              ].map((brand) => {
                const isChecked = brandFilters[brand.key as keyof typeof brandFilters];
                return (
                  <label
                    key={brand.key}
                    className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${isChecked ? 'checked' : ''}`}
                        onClick={() =>
                          setBrandFilters((prev) => ({
                            ...prev,
                            [brand.key]: !isChecked,
                          }))
                        }
                      >
                        {isChecked && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <span>{brand.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                      {brand.count}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. VẬN CHUYỂN & DỊCH VỤ */}
        <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 select-none"
            onClick={() => onToggleSection('shippingService')}
          >
            <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
              VẬN CHUYỂN & DỊCH VỤ
            </span>
            <ChevronUp
              className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['shippingService'] ? 'collapsed' : ''}`}
            />
          </div>
          {!collapsedSections['shippingService'] && (
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${shippingFilters.ghn ? 'checked' : ''}`}
                    onClick={() => setShippingFilters((prev) => ({ ...prev, ghn: !prev.ghn }))}
                  >
                    {shippingFilters.ghn && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Đồng kiểm niêm phong GHN Express</span>
                </div>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${shippingFilters.pci ? 'checked' : ''}`}
                    onClick={() => setShippingFilters((prev) => ({ ...prev, pci: !prev.pci }))}
                  >
                    {shippingFilters.pci && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Bảo hiểm giá trị cao 100% (PCI Safe)</span>
                </div>
              </label>

              <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${shippingFilters.express2h ? 'checked' : ''}`}
                    onClick={() =>
                      setShippingFilters((prev) => ({
                        ...prev,
                        express2h: !prev.express2h,
                      }))
                    }
                  >
                    {shippingFilters.express2h && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <span>Hỏa tốc 2H nội thành (TP.HCM / HN)</span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* 6. ĐÁNH GIÁ COLLECTOR */}
        <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
          <div
            className="flex items-center justify-between cursor-pointer mb-3 select-none"
            onClick={() => onToggleSection('collectorRating')}
          >
            <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
              ĐÁNH GIÁ COLLECTOR
            </span>
            <ChevronUp
              className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['collectorRating'] ? 'collapsed' : ''}`}
            />
          </div>
          {!collapsedSections['collectorRating'] && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-[3px] text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-700">(5.0 tuyệt đối)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                  64
                </span>
              </div>

              <div className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-[3px] text-amber-500">
                    {[1, 2, 3, 4].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <Star className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <span className="text-xs text-gray-700">từ 4 sao</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                  78
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SearchFilterSidebar;
