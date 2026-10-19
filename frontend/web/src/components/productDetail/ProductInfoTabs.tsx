import { useState } from 'react';
import { ShieldCheck, Truck, Star } from 'lucide-react';
import type { ProductDetail } from '../../products';

interface ProductInfoTabsProps {
  product: ProductDetail;
}

export default function ProductInfoTabs({ product }: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'escrow' | 'reviews'>('desc');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-12">
      <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('desc')}
          className={`py-4 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'desc'
              ? 'border-[#f24e1e] text-[#f24e1e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Mô Tả Sản Phẩm
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`py-4 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'specs'
              ? 'border-[#f24e1e] text-[#f24e1e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Thông Số Kỹ Thuật
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('escrow')}
          className={`py-4 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'escrow'
              ? 'border-[#f24e1e] text-[#f24e1e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Bảo Chứng Escrow & Giao Hàng
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`py-4 text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-[#f24e1e] text-[#f24e1e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Đánh Giá Khách Hàng ({product.reviewsCount})
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'desc' && (
          <div className="prose max-w-none text-slate-700 space-y-4 text-sm leading-relaxed">
            <p className="whitespace-pre-line">{product.description}</p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 my-4">
              <h4 className="font-bold text-slate-900 mb-2">Đặc Điểm Nổi Bật:</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                <li>
                  Mô hình quét 3D thực tế độ phân giải cao, hỗ trợ kiểm định tương tác trực quan.
                </li>
                <li>Sử dụng các vật liệu cao cấp chuẩn đồng hồ xa xỉ Thụy Sỹ.</li>
                <li>
                  Đi kèm hộp đựng cao cấp, thẻ bảo hành quốc tế tích hợp chip NFC chống giả mạo.
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="max-w-2xl">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {Object.entries(product.specs).map(([key, val], idx) => (
                  <tr key={key} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="py-3 px-4 font-bold text-slate-700 w-1/3 border-b border-slate-100">
                      {key}
                    </td>
                    <td className="py-3 px-4 text-slate-600 border-b border-slate-100">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'escrow' && (
          <div className="space-y-6 max-w-3xl text-sm text-slate-700">
            <div className="flex gap-4 p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
              <ShieldCheck size={28} className="text-indigo-600 shrink-0" />
              <div>
                <h4 className="font-bold text-indigo-950 text-base mb-1">
                  Cơ Chế Bảo Chứng Ký Quỹ Escrow PayOS
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Khi quý khách đặt mua hoặc tham gia đấu giá, số tiền thanh toán hoặc tiền đặt cọc
                  (50%) sẽ được giữ an toàn tại tài khoản ủy thác Escrow của hệ thống NEXUS. Người
                  bán sẽ KHÔNG được nhận tiền ngay lập tức mà chỉ nhận được khi đơn hàng đã được
                  giao đến tay quý khách và được đồng kiểm xác nhận đạt tiêu chuẩn.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-blue-50 border border-blue-100">
              <Truck size={28} className="text-blue-600 shrink-0" />
              <div>
                <h4 className="font-bold text-blue-950 text-base mb-1">
                  Vận Chuyển Hỏa Tốc & Đồng Kiểm GHN Express
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Tất cả đơn hàng giá trị cao đều được niêm phong bằng seal an ninh chuyên dụng của
                  NEXUS và vận chuyển có bảo hiểm 100% qua Giao Hàng Nhanh (GHN). Quý khách có quyền
                  mở bưu kiện kiểm tra hàng trước mặt nhân viên giao nhận trước khi xác nhận.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex items-center gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-center pr-6 border-r border-slate-200">
                <div className="text-4xl font-extrabold text-[#f24e1e]">{product.rating}</div>
                <div className="flex text-amber-500 justify-center my-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <div className="text-xs text-slate-500">{product.reviewsCount} nhận xét</div>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">
                  100% Khách hàng hài lòng về độ hoàn thiện và bảo chứng Escrow
                </p>
                <p>Sản phẩm đã được chuyên viên giám định vật lý trước khi kích hoạt giao dịch.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  name: 'Trần Hoàng Long',
                  time: '2 ngày trước',
                  comment:
                    'Hàng nhận chuẩn chỉ từng con ốc, check mã NFC chính hãng trùng khớp. Ký quỹ PayOS rất yên tâm!',
                  rating: 5,
                },
                {
                  name: 'Vũ Minh Tuấn',
                  time: '1 tuần trước',
                  comment:
                    'Mô hình 3D trên web xoay y chang lúc nhận hàng ngoài đời. Đóng gói hộp rất sang trọng.',
                  rating: 5,
                },
              ].map((rev, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-xs">{rev.name}</span>
                    <span className="text-[11px] text-slate-400">{rev.time}</span>
                  </div>
                  <div className="flex text-amber-400 mb-2">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
