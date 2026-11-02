import React from 'react';
import {
  ShieldCheck,
  Sliders,
  Clock,
  MessageSquare,
  Scan,
  RotateCw,
  ArrowRight,
} from 'lucide-react';
import type { AuctionTabKey } from './types';

interface AuctionDetailTabsProps {
  activeTab: AuctionTabKey;
  setActiveTab: (tab: AuctionTabKey) => void;
}

export const AuctionDetailTabs: React.FC<AuctionDetailTabsProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <section className="bg-white [border:1px_solid_#e2e8f0] rounded-2xl overflow-hidden mb-10 [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)]">
      <div className="flex items-center [border-bottom:1px_solid_#e2e8f0] bg-slate-50 [overflow-x:auto]">
        <button
          type="button"
          className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'certs' ? 'active' : ''}`}
          onClick={() => setActiveTab('certs')}
        >
          <ShieldCheck className="w-[18px] h-[18px]" />
          <span>Hồ Sơ Giám Định 3D & Vật Lý</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'specs' ? 'active' : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          <Sliders className="w-[18px] h-[18px]" />
          <span>Thông Số Kỹ Thuật Chi Tiết</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock className="w-[18px] h-[18px]" />
          <span>Lịch Sử Đấu Giá (19 lượt)</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <MessageSquare className="w-[18px] h-[18px]" />
          <span>Đánh Giá Collectors (48)</span>
        </button>
      </div>

      <div className="p-7">
        {/* TAB 1: 3D CERTIFICATES & TIMEGRAPHER */}
        {activeTab === 'certs' && (
          <div>
            {/* 3 Certification Cards */}
            <div className="grid [grid-template-columns:repeat(3,_1fr)] gap-5 mb-8 max-[900px]:[grid-template-columns:1fr]">
              {/* Card 1 */}
              <div className="bg-slate-50 [border:1px_solid_#e2e8f0] rounded-xl p-5 flex flex-col justify-between gap-3.5 [transition:all_0.2s_ease] hover:bg-white hover:border-slate-300 hover:[box-shadow:0_4px_12px_rgba(0,_0,_0,_0.05)]">
                <div className="flex items-center gap-2">
                  <Scan className="w-5 h-5 text-blue-600 [flex-shrink:0]" />
                  <h4 className="text-sm font-bold text-blue-600 m-0">Quét 3D LiDAR Hologram</h4>
                </div>
                <p className="[font-size:12.5px] text-slate-600 leading-normal m-0">
                  Tỷ lệ sai số dưới 0.002mm so với bản vẽ gốc của Audemars Piguet Le Brassus. Không
                  phát hiện dấu hiệu can thiệp đánh bóng quá mức (Unpolished bevels).
                </p>
                <div className="text-xs font-semibold text-slate-900 pt-2 [border-top:1px_dashed_#e2e8f0]">
                  Mã kiểm định: <strong>LDR-CHRONO-2025-X09</strong>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-slate-50 [border:1px_solid_#e2e8f0] rounded-xl p-5 flex flex-col justify-between gap-3.5 [transition:all_0.2s_ease] hover:bg-white hover:border-slate-300 hover:[box-shadow:0_4px_12px_rgba(0,_0,_0,_0.05)]">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-5 h-5 text-blue-600 [flex-shrink:0]" />
                  <h4 className="text-sm font-bold text-blue-600 m-0">
                    Tem Niêm Phong Chống Mở Nắp Lưng
                  </h4>
                </div>
                <p className="[font-size:12.5px] text-slate-600 leading-normal m-0">
                  Tem RFID mã hóa micro-mesh được kiểm định bởi Viện Đồng Hồ Cao Cấp Geneva. Bộ máy
                  được bảo hiểm toàn vẹn 100% nguyên bản từ xưởng.
                </p>
                <div className="text-xs font-semibold text-slate-900 pt-2 [border-top:1px_dashed_#e2e8f0]">
                  Trạng thái: <strong>Nguyên tem 100% (Intact)</strong>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-slate-50 [border:1px_solid_#e2e8f0] rounded-xl p-5 flex flex-col justify-between gap-3.5 [transition:all_0.2s_ease] hover:bg-white hover:border-slate-300 hover:[box-shadow:0_4px_12px_rgba(0,_0,_0,_0.05)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600 [flex-shrink:0]" />
                  <h4 className="text-sm font-bold text-blue-600 m-0">
                    Chứng Chỉ NFT On-Chain Provenance
                  </h4>
                </div>
                <p className="[font-size:12.5px] text-slate-600 leading-normal m-0">
                  Hợp đồng thông minh ghi nhận lịch sử sở hữu, hóa đơn mua ban đầu tại Boutique Hong
                  Kong 2022 và các mốc bảo dưỡng định kỳ 24 tháng.
                </p>
                <div className="text-xs font-semibold text-slate-900 pt-2 [border-top:1px_dashed_#e2e8f0]">
                  <span className="text-blue-600 font-semibold inline-flex items-center gap-1">
                    Tra cứu Etherscan / Polygon Contract
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Timegrapher Diagnostics Section */}
            <div className="mt-6">
              <h3 className="text-[15px] font-extrabold text-slate-900 [margin:0_0_1rem_0]">
                Bảng Đo Đạc Máy Thử Nhịp (Timegrapher Diagnostics)
              </h3>

              <div className="grid [grid-template-columns:repeat(4,_1fr)] gap-4 max-[900px]:[grid-template-columns:repeat(2,_1fr)] max-[600px]:[grid-template-columns:1fr]">
                {/* Metric 1 */}
                <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 font-medium m-0">
                      Giá đặt hiện tại:
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-white [padding:0.15rem_0.4rem] rounded-full [border:1px_solid_#bfdbfe]">
                      Live FX: $1 = 24.000đ
                    </span>
                  </div>
                  <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0 [&.red]:text-red-500 red">
                    128.500.000 đ
                  </p>
                  <p className="text-[13px] font-bold text-blue-600 m-0">(≈ $5,354 USD)</p>
                  <p className="text-[11px] text-slate-500 m-0">
                    Khởi điểm: 95.000.000 đ • ≈ $3,958 USD
                  </p>
                </div>

                {/* Metric 2 */}
                <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium m-0">
                    Biên độ dao động (Amplitude):
                  </span>
                  <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0">
                    298°
                  </p>
                  <p className="text-[11px] text-slate-500 m-0">Mức lý tưởng (280° - 310°)</p>
                </div>

                {/* Metric 3 */}
                <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium m-0">
                    Lỗi nhịp (Beat Error):
                  </span>
                  <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0">
                    0.1 ms
                  </p>
                  <p className="text-[11px] text-slate-500 m-0">Cực kỳ hoàn hảo (&lt;0.5ms)</p>
                </div>

                {/* Metric 4 */}
                <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium m-0">
                    Kiểm tra áp suất nước:
                  </span>
                  <p className="text-[26px] font-black text-blue-600 [line-height:1.1] m-0">
                    5.0 BAR (PASS)
                  </p>
                  <p className="text-[11px] text-slate-500 m-0">Chống nước 50m an toàn</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TECHNICAL SPECIFICATIONS */}
        {activeTab === 'specs' && (
          <table className="w-full [border-collapse:collapse] [&_tr]:[border-bottom:1px_solid_#f1f5f9] [&_tr:last-child]:[border-bottom:none] [&_td]:[padding:0.875rem_0.5rem] [&_td]:text-[13px] [&_td.label-col]:[width:30%] [&_td.label-col]:text-slate-500 [&_td.label-col]:font-medium [&_td.val-col]:text-slate-900 [&_td.val-col]:font-semibold">
            <tbody>
              <tr>
                <td className="label-col">Thương hiệu</td>
                <td className="val-col">Audemars Piguet (Le Brassus, Thụy Sĩ)</td>
              </tr>
              <tr>
                <td className="label-col">Bộ sưu tập</td>
                <td className="val-col">Royal Oak Chronograph 41mm</td>
              </tr>
              <tr>
                <td className="label-col">Mã tham chiếu (Ref)</td>
                <td className="val-col">26331ST.OO.1220ST.01</td>
              </tr>
              <tr>
                <td className="label-col">Bộ máy (Calibre)</td>
                <td className="val-col">In-house Manufacture Calibre 4401 Automatic Flyback</td>
              </tr>
              <tr>
                <td className="label-col">Thời gian trữ cót</td>
                <td className="val-col">70 giờ liên tục (Tần số 28.800 vph - 4Hz)</td>
              </tr>
              <tr>
                <td className="label-col">Chất liệu thân vỏ & dây</td>
                <td className="val-col">Thép không gỉ 904L chải xước satin và vát cạnh bóng</td>
              </tr>
              <tr>
                <td className="label-col">Mặt số (Dial)</td>
                <td className="val-col">
                  Họa tiết vân Grande Tapisserie xanh Bleu Nuit, cọc số vàng trắng
                </td>
              </tr>
              <tr>
                <td className="label-col">Mặt kính & nắp lưng</td>
                <td className="val-col">
                  Sapphire nguyên khối chống lóa hai mặt, tem RFID nắp lưng
                </td>
              </tr>
              <tr>
                <td className="label-col">Kháng nước</td>
                <td className="val-col">50m / 5 BAR (Đã thử nghiệm áp suất đạt tiêu chuẩn PASS)</td>
              </tr>
              <tr>
                <td className="label-col">Phụ kiện đi kèm</td>
                <td className="val-col">
                  Full Box hộp gỗ AP, thẻ bảo hành điện tử NFC, chứng thư NFT
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* TAB 3: BID HISTORY */}
        {activeTab === 'history' && (
          <table className="w-full [border-collapse:collapse] [&_th]:text-left [&_th]:p-3 [&_th]:text-xs [&_th]:font-bold [&_th]:text-slate-500 [&_th]:[border-bottom:1px_solid_#e2e8f0] [&_th]:bg-slate-50 [&_td]:[padding:0.875rem_0.75rem] [&_td]:text-[13px] [&_td]:[border-bottom:1px_solid_#f1f5f9]">
            <thead>
              <tr>
                <th>Người tham gia</th>
                <th>Mức giá đặt</th>
                <th>Thời gian</th>
                <th>Xác thực Escrow</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-slate-900">Nguyen_Horology</td>
                <td className="font-bold text-red-600">128.500.000 đ</td>
                <td className="text-slate-500">14:41:20</td>
                <td>
                  <span className="text-emerald-600 font-semibold">Đã khóa cọc 10%</span>
                </td>
                <td>
                  <span className="text-emerald-600 font-bold">Dẫn đầu 👑</span>
                </td>
              </tr>
              <tr>
                <td>Collector_SG_01</td>
                <td className="font-semibold text-slate-800">127.500.000 đ</td>
                <td className="text-slate-500">14:38:05</td>
                <td>
                  <span className="text-slate-600">Đã khóa cọc 10%</span>
                </td>
                <td>
                  <span className="text-slate-400">Bị vượt giá</span>
                </td>
              </tr>
              <tr>
                <td>Pham_Gia_Bao</td>
                <td className="font-semibold text-slate-800">125.000.000 đ</td>
                <td className="text-slate-500">14:30:12</td>
                <td>
                  <span className="text-slate-600">Đã khóa cọc 10%</span>
                </td>
                <td>
                  <span className="text-slate-400">Bị vượt giá</span>
                </td>
              </tr>
              <tr>
                <td>WatchLover99</td>
                <td className="font-semibold text-slate-800">120.000.000 đ</td>
                <td className="text-slate-500">14:15:44</td>
                <td>
                  <span className="text-slate-600">Đã khóa cọc 10%</span>
                </td>
                <td>
                  <span className="text-slate-400">Bị vượt giá</span>
                </td>
              </tr>
              <tr>
                <td>Luxury_Bidder_HN</td>
                <td className="font-semibold text-slate-800">110.000.000 đ</td>
                <td className="text-slate-500">13:58:02</td>
                <td>
                  <span className="text-slate-600">Đã khóa cọc 10%</span>
                </td>
                <td>
                  <span className="text-slate-400">Bị vượt giá</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-black text-amber-500">4.98 / 5</div>
              <div>
                <div className="flex text-amber-500">★★★★★</div>
                <p className="text-xs text-slate-500 m-0">
                  Dựa trên 48 đánh giá của các nhà sưu tập đã hoàn tất nhận hàng và đối chiếu 3D
                </p>
              </div>
            </div>

            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900">
                  Dr. Hoàng Vũ (Collector Hà Nội)
                </span>
                <span className="text-xs text-slate-400">2 ngày trước</span>
              </div>
              <div className="text-xs text-amber-500 mb-1">★★★★★ (Đã đồng kiểm GHN Express)</div>
              <p className="text-xs text-slate-600 m-0">
                Hiện vật đúng từng vết vát bevels như ảnh quét LiDAR 3D. Đồng hồ chạy chuẩn 0.1ms
                Beat Error, dịch vụ vận chuyển thùng chống sốc rất chuyên nghiệp.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AuctionDetailTabs;
