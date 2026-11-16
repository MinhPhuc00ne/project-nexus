import React, { useState, useEffect, useMemo } from 'react';
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
import type { AuctionEntity, AuctionConsignmentItem } from '../../services/auction.service';
import type { AuctionBidItem } from '../../types/auction-api.types';
import { getShopReviewsApi, type ShopReviewItem } from '../../services/reviews.service';
import { useAuth } from '../../contexts/AuthContext';

interface AuctionDetailTabsProps {
  activeTab: AuctionTabKey;
  setActiveTab: (tab: AuctionTabKey) => void;
  auction?: AuctionEntity | null;
  selectedItem?: AuctionConsignmentItem | null;
  hasItems?: boolean;
}

export const AuctionDetailTabs: React.FC<AuctionDetailTabsProps> = ({
  activeTab,
  setActiveTab,
  auction,
  selectedItem,
  hasItems: _hasItems,
}) => {
  const { user: currentUser } = useAuth();
  const hasItems =
    _hasItems ??
    Boolean(selectedItem || auction?.product || (auction?.items && auction.items.length > 0));

  const uniqueBids = useMemo(() => {
    if (!auction?.bids || auction.bids.length === 0) return [];
    const seenIds = new Set<string>();
    const seenCombos = new Set<string>();
    const result: AuctionBidItem[] = [];

    for (const b of auction.bids) {
      if (b.id && seenIds.has(b.id)) continue;
      if (b.id) seenIds.add(b.id);

      // Phòng ngừa trường hợp cùng 1 lượt đặt giá vừa nhận từ REST vừa nhận từ WebSocket
      const bidderIdentifier =
        b.bidder?.id ||
        (b.bidder?.fullName?.toLowerCase().includes('tài khoản hiện tại')
          ? 'current-user'
          : b.bidder?.fullName) ||
        'unknown';
      const comboKey = `${bidderIdentifier}-${Number(b.bidAmount)}`;
      if (seenCombos.has(comboKey)) continue;
      seenCombos.add(comboKey);

      result.push(b);
    }

    return result.sort((a, b) => {
      const timeA = new Date(a.placedAt).getTime();
      const timeB = new Date(b.placedAt).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return Number(b.bidAmount) - Number(a.bidAmount);
    });
  }, [auction?.bids]);

  const bidsCount = uniqueBids.length || auction?.totalBidsCount || 0;
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
            if (!hasItems) {
              return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                  <ShieldCheck className="w-12 h-12 text-slate-400 mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Chưa Có Chứng Thư Kiểm Định
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed m-0">
                    Phiên đấu giá đang mở tiếp nhận sản phẩm. Khi các Người Bán (Seller) gửi hồ sơ
                    ký gửi, Hội đồng Giám định Độc lập của NEXUS sẽ tiến hành kiểm định nguồn gốc và
                    cấp mã chứng thư niêm yết công khai tại đây.
                  </p>
                </div>
              );
            }

            const activeItem = selectedItem || auction?.items?.[0];
            const certNumber =
              activeItem?.appraisalCertificateNumber ||
              (auction?.id ? `NX-3D-${auction.id.slice(0, 8).toUpperCase()}` : 'NX-3D-AP2025X');
            const appraisalAgency =
              activeItem?.appraisalAgency || 'Trung tâm Giám định Độc lập & Thẩm duyệt Sàn NEXUS';

            return (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 m-0">
                        Chứng Thư Giám Định & Thẩm Định Vật Phẩm
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

                {activeItem && (
                  <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Hồ sơ ký gửi:</span>
                        <strong className="text-slate-900">
                          Lô #{activeItem.lotNumber ?? 1}: {activeItem.title}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Cơ quan thẩm định:</span>
                        <strong className="text-sky-700">{appraisalAgency}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Tình trạng thẩm định:
                        </span>
                        <span className="text-emerald-600 font-bold">✓ Đã kiểm định nguồn gốc</span>
                      </div>
                    </div>

                    {activeItem.certificateImages && activeItem.certificateImages.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-sky-100">
                        <span className="text-slate-500 block text-[11px] mb-2 font-semibold">
                          Tài liệu chứng nhận đính kèm:
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {activeItem.certificateImages.map((cImg, idx) => (
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
                      <Scan size={14} /> Thẩm Định Chi Tiết
                    </div>
                    <p className="text-xs text-slate-600">
                      Vật phẩm được chụp cận cảnh độ phân giải cao, bảo đảm hiển thị trung thực từng
                      chi tiết và giấy tờ kiểm định.
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
        {activeTab === 'specs' &&
          (() => {
            if (!hasItems) {
              return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                  <Sliders className="w-12 h-12 text-slate-400 mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Thông Số Kỹ Thuật Đang Chờ Cập Nhật
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed m-0">
                    Thông số chi tiết của hiện vật sẽ được niêm yết theo từng lô hàng ngay khi
                    Seller hoàn tất thủ tục bàn giao hiện vật cho phiên đấu giá này.
                  </p>
                </div>
              );
            }

            const activeItem = selectedItem || auction?.items?.[0];
            return (
              <table className="w-full text-xs divide-y divide-slate-100">
                <tbody className="divide-y divide-slate-100">
                  {activeItem && (
                    <tr className="bg-blue-50/50">
                      <td className="py-2.5 px-2 font-bold text-blue-900 w-1/3">
                        Lô hàng đang chọn
                      </td>
                      <td className="py-2.5 px-2 text-blue-950 font-bold">
                        Lô #{activeItem.lotNumber ?? 1}: {activeItem.title}
                      </td>
                    </tr>
                  )}
                  {activeItem?.description && (
                    <tr>
                      <td className="py-2.5 font-bold text-slate-500">Mô tả hiện vật</td>
                      <td className="py-2.5 text-slate-700 leading-relaxed">
                        {activeItem.description}
                      </td>
                    </tr>
                  )}
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
                      {activeItem?.startingPrice
                        ? `${Number(activeItem.startingPrice).toLocaleString('vi-VN')} đ`
                        : activeItem?.proposedStartingPrice
                          ? `${Number(activeItem.proposedStartingPrice).toLocaleString('vi-VN')} đ`
                          : auction?.startingPrice
                            ? `${Number(auction.startingPrice).toLocaleString('vi-VN')} đ`
                            : 'Chưa thiết lập'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-500">
                      Bước giá tối thiểu (+Increment)
                    </td>
                    <td className="py-2.5 text-blue-600 font-bold">
                      {activeItem?.bidIncrement
                        ? `+${Number(activeItem.bidIncrement).toLocaleString('vi-VN')} đ`
                        : activeItem?.proposedBidIncrement
                          ? `+${Number(activeItem.proposedBidIncrement).toLocaleString('vi-VN')} đ`
                          : auction?.bidIncrement
                            ? `+${Number(auction.bidIncrement).toLocaleString('vi-VN')} đ`
                            : '+1.000 đ'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-500">Điểm uy tín Buyer tối thiểu</td>
                    <td className="py-2.5 text-slate-900 font-bold">
                      {auction?.minBuyerReputation ?? 40} điểm uy tín
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-500">
                      Điểm uy tín Seller tối thiểu
                    </td>
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
                    <td className="py-2.5 font-bold text-slate-500">
                      Trạng thái gia hạn Anti-Sniping
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${auction?.isExtended ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-600'}`}
                      >
                        {auction?.isExtended
                          ? 'ĐÃ KÍCH HOẠT GIA HẠN (+120s)'
                          : 'SẴN SÀNG KÍCH HOẠT'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}

        {/* TAB 3: BID HISTORY */}
        {activeTab === 'history' && (
          <div>
            {uniqueBids.length === 0 ? (
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
                    {uniqueBids.map((bid, idx) => {
                      const isMe =
                        (currentUser?.id && bid.bidder?.id === currentUser.id) ||
                        (currentUser?.fullName && bid.bidder?.fullName === currentUser.fullName) ||
                        bid.bidder?.fullName?.toLowerCase().includes('tài khoản hiện tại') ||
                        bid.bidder?.id === 'current-user';

                      const rawName = bid.bidder?.fullName || 'Người dùng ***';
                      const displayName = isMe
                        ? currentUser?.fullName || rawName.replace(' (Tài khoản hiện tại)', '')
                        : rawName;

                      return (
                        <tr key={bid.id || idx} className={idx === 0 ? 'bg-amber-50/40' : ''}>
                          <td className="p-3 font-semibold text-slate-800">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{displayName}</span>
                              {isMe && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                  Bạn
                                </span>
                              )}
                            </div>
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
                      );
                    })}
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
