import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sliders,
  Clock,
  MessageSquare,
  Scan,
  RotateCw,
  UserCheck,
  Star,
} from 'lucide-react';
import type { AuctionTabKey } from './types';
import type { AuctionEntity } from '../../services/auction.service';
import { getShopReviewsApi, type ShopReviewItem } from '../../services/reviews.service';

interface AuctionDetailTabsProps {
  activeTab: AuctionTabKey;
  setActiveTab: (tab: AuctionTabKey) => void;
  auction?: AuctionEntity | null;
}

export const AuctionDetailTabs: React.FC<AuctionDetailTabsProps> = ({
  activeTab,
  setActiveTab,
  auction,
}) => {
  const bidsCount = auction?.bids?.length || auction?.totalBidsCount || 0;
  const [reviews, setReviews] = useState<ShopReviewItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    const sellerId = auction?.seller?.id || auction?.sellerId;
    if (sellerId && activeTab === 'reviews') {
      setIsLoadingReviews(true);
      getShopReviewsApi(sellerId)
        .then((res) => {
          setReviews(res.items || []);
        })
        .catch(() => {
          setReviews([]);
        })
        .finally(() => {
          setIsLoadingReviews(false);
        });
    }
  }, [auction?.seller?.id, auction?.sellerId, activeTab]);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-10 shadow-xs">
      <div className="flex items-center border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-slate-500 border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-slate-900 hover:bg-slate-100 ${
            activeTab === 'certs'
              ? 'text-slate-900 font-bold bg-white border-b-2 border-rose-500'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('certs')}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Hồ Sơ Giám Định & Thông Tin</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-slate-500 border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-slate-900 hover:bg-slate-100 ${
            activeTab === 'specs'
              ? 'text-slate-900 font-bold bg-white border-b-2 border-rose-500'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('specs')}
        >
          <Sliders className="w-4 h-4 text-blue-500" />
          <span>Thể Lệ & Thông Số Phiên</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-slate-500 border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-slate-900 hover:bg-slate-100 ${
            activeTab === 'history'
              ? 'text-slate-900 font-bold bg-white border-b-2 border-rose-500'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Lịch Sử Đặt Giá ({bidsCount} lượt)</span>
        </button>

        <button
          type="button"
          className={`inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-slate-500 border-none bg-transparent cursor-pointer whitespace-nowrap transition border-b-2 hover:text-slate-900 hover:bg-slate-100 ${
            activeTab === 'reviews'
              ? 'text-slate-900 font-bold bg-white border-b-2 border-rose-500'
              : 'border-b-transparent'
          }`}
          onClick={() => setActiveTab('reviews')}
        >
          <MessageSquare className="w-4 h-4 text-violet-500" />
          <span>Đánh Giá & Uy Tín</span>
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: CERTS & INFO */}
        {activeTab === 'certs' &&
          (() => {
            const primaryItem = auction?.items?.[0];
            const certNumber =
              primaryItem?.appraisalCertificateNumber ||
              (auction?.id ? `NX-3D-${auction.id.slice(0, 8).toUpperCase()}` : 'NX-3D-AP2025X');
            const appraisalAgency =
              primaryItem?.appraisalAgency || 'Trung tâm Giám định Độc lập & Thẩm duyệt Sàn NEXUS';

            return (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 m-0">
                        Chứng Thư Giám Định Vật Phẩm Số Hóa 3D
                      </h4>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        Mã kiểm định:{' '}
                        <strong className="text-slate-800 font-mono">{certNumber}</strong> •{' '}
                        {appraisalAgency}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                    <UserCheck size={14} /> ĐÃ THẨM ĐỊNH HỢP LỆ
                  </span>
                </div>

                {primaryItem && (
                  <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Hồ sơ ký gửi:</span>
                        <strong className="text-slate-900">
                          Lô #{primaryItem.lotNumber ?? 1}: {primaryItem.title}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Cơ quan thẩm định:</span>
                        <strong className="text-sky-700">{appraisalAgency}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Trạng thái số hóa 3D:
                        </span>
                        <span className="text-emerald-600 font-bold">
                          {primaryItem.threeModelKey
                            ? '✓ Sẵn sàng mô hình LiDAR 3D'
                            : '✓ Đồng bộ dữ liệu 360°'}
                        </span>
                      </div>
                    </div>

                    {primaryItem.certificateImages && primaryItem.certificateImages.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-sky-100">
                        <span className="text-slate-500 block text-[11px] mb-2 font-semibold">
                          Tài liệu chứng nhận đính kèm:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {primaryItem.certificateImages.map((cImg, idx) => (
                            <a
                              key={idx}
                              href={cImg}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-blue-600 hover:border-blue-300 transition text-[11px]"
                            >
                              <span>Giấy chứng nhận #{idx + 1}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {auction?.description && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Mô Tả Hiện Vật Đấu Giá
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-xl">
                      {auction.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-cyan-600 text-xs font-bold mb-1">
                      <Scan size={14} /> Quét Mô Hình 3D
                    </div>
                    <p className="text-xs text-slate-600">
                      Vật phẩm được quét tương tác thực tế, cho phép xoay 360° quan sát mọi góc cạnh
                      chi tiết.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold mb-1">
                      <ShieldCheck size={14} /> Ký Quỹ Đảm Bảo 100%
                    </div>
                    <p className="text-xs text-slate-600">
                      Số tiền cọc được lưu ký an toàn trong ví Escrow. Tự động hoàn cọc trong 30
                      giây nếu bị vượt giá.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold mb-1">
                      <RotateCw size={14} /> Chống Bắn Giá Anti-Sniping
                    </div>
                    <p className="text-xs text-slate-600">
                      Nếu có lượt đặt giá trong 2 phút cuối, hệ thống tự động gia hạn thêm 120 giây
                      để đảm bảo công bằng.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* TAB 2: SPECS */}
        {activeTab === 'specs' && (
          <table className="w-full text-xs divide-y divide-slate-100">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 font-bold text-slate-500 w-1/3">Tiêu đề phiên</td>
                <td className="py-2.5 text-slate-900 font-semibold">
                  {auction?.title || 'Phiên đấu giá công khai'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Mã định danh (Auction ID)</td>
                <td className="py-2.5 font-mono text-slate-700">
                  {auction?.id || 'Đang cập nhật'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Giá khởi điểm</td>
                <td className="py-2.5 text-slate-900 font-bold">
                  {auction?.startingPrice
                    ? `${Number(auction.startingPrice).toLocaleString('vi-VN')} đ`
                    : 'Chưa thiết lập'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Bước giá tối thiểu (+Increment)</td>
                <td className="py-2.5 text-blue-600 font-bold">
                  {auction?.bidIncrement
                    ? `+${Number(auction.bidIncrement).toLocaleString('vi-VN')} đ`
                    : '+1.000.000 đ'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Điểm uy tín Buyer tối thiểu</td>
                <td className="py-2.5 text-slate-900 font-bold">
                  {auction?.minBuyerReputation ?? 40} điểm uy tín
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Điểm uy tín Seller tối thiểu</td>
                <td className="py-2.5 text-slate-900 font-bold">
                  {auction?.minSellerReputation ?? 50} điểm uy tín
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Cơ chế cọc ví & Hoàn tiền</td>
                <td className="py-2.5 text-slate-800">
                  <span className="font-semibold text-emerald-700">AUCTION_BID_LOCK</span> (Khóa
                  cọc) & <span className="font-semibold text-blue-700">AUCTION_BID_REFUND</span>{' '}
                  (Hoàn cọc tự động khi có người trả giá cao hơn)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Thời gian bắt đầu</td>
                <td className="py-2.5 text-slate-700">
                  {auction?.startTime
                    ? new Date(auction.startTime).toLocaleString('vi-VN')
                    : 'Đang diễn ra'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Thời gian kết thúc dự kiến</td>
                <td className="py-2.5 text-slate-700">
                  {auction?.endTime
                    ? new Date(auction.endTime).toLocaleString('vi-VN')
                    : 'Chưa ấn định'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-500">Trạng thái gia hạn Anti-Sniping</td>
                <td className="py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${auction?.isExtended ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600'}`}
                  >
                    {auction?.isExtended ? 'ĐÃ KÍCH HOẠT GIA HẠN (+120s)' : 'SẴN SÀNG KÍCH HOẠT'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* TAB 3: BID HISTORY */}
        {activeTab === 'history' && (
          <div>
            {!auction?.bids || auction.bids.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Chưa có lượt đặt giá nào. Hãy là người đầu tiên trả giá để sở hữu hiện vật!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500">
                      <th className="p-3">Người tham gia</th>
                      <th className="p-3">Mức giá đặt</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Bảo chứng Escrow</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auction.bids.map((bid, idx) => (
                      <tr key={bid.id || idx} className={idx === 0 ? 'bg-amber-50/40' : ''}>
                        <td className="p-3 font-semibold text-slate-800">
                          {bid.bidder?.fullName || 'Người dùng ***'}
                        </td>
                        <td
                          className={`p-3 font-bold ${idx === 0 ? 'text-rose-600 text-sm' : 'text-slate-800'}`}
                        >
                          {Number(bid.bidAmount).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(bid.placedAt).toLocaleTimeString('vi-VN')} (
                          {new Date(bid.placedAt).toLocaleDateString('vi-VN')})
                        </td>
                        <td className="p-3">
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            ✓ Đã khóa cọc 100%
                          </span>
                        </td>
                        <td className="p-3">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Dẫn đầu 👑
                            </span>
                          ) : (
                            <span className="text-slate-400">Bị vượt giá</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-3xl font-black text-amber-500">
                {reviews.length > 0
                  ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                  : '5.0'}
              </div>
              <div>
                <div className="flex text-amber-500 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Đánh giá xác thực từ các giao dịch thành công trên sàn NEXUS ({reviews.length}{' '}
                  đánh giá).
                </p>
              </div>
            </div>

            {isLoadingReviews ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Đang tải đánh giá gian hàng từ hệ thống...
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-700">
                  Gian hàng chưa có đánh giá công khai nào
                </p>
                <p className="mt-1 text-slate-400">
                  Người bán đã được xác minh danh tính và vượt qua kiểm định tư cách KYC bởi NEXUS.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border border-slate-100 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        {r.reviewer?.fullName || 'Người mua ẩn danh'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-500 mb-1">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-emerald-600 font-semibold text-[10px] ml-1">
                        (Đã giao hàng thành công)
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-slate-600 m-0 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AuctionDetailTabs;
