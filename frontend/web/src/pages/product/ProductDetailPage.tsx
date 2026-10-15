import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  Zap,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  Star,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Box,
  MessageCircle,
  Gavel,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { getProductById, PRODUCTS_CATALOG, type ProductDetail } from '../../data/products';
import { addToCart } from '../../services/cart';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductDetail>(() => getProductById(id || 'ap-tourbillon'));
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Bản Tiêu Chuẩn');
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'escrow' | 'reviews'>('desc');
  const [toast, setToast] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      setProduct(getProductById(id));
      setSelectedImgIdx(0);
      setQuantity(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddToCart = () => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        formattedPrice: product.formattedPrice,
        img: product.images[0] || '/images/watches/watch-1.png',
        shopName: product.shop.name,
        brand: product.brand,
      },
      quantity,
    );
    showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`);
  };

  const handleBuyNow = () => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        formattedPrice: product.formattedPrice,
        img: product.images[0] || '/images/watches/watch-1.png',
        shopName: product.shop.name,
        brand: product.brand,
      },
      quantity,
    );
    navigate('/cart');
  };

  return (
    <div className="product-detail-page bg-slate-50 min-h-screen py-6">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      <div className="max-w-[1280px] mx-auto px-4">
        {/* Navigation Bar & Back Button */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-indigo-600 transition">Trang Chủ</Link>
            <ChevronRight size={13} />
            <Link to="/search" className="hover:text-indigo-600 transition">Đồng Hồ & Trang Sức</Link>
            <ChevronRight size={13} />
            <span className="font-semibold text-slate-800 line-clamp-1">{product.name}</span>
          </nav>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
        </div>

        {/* Main Product Showcase Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Gallery & 3D Interactive (5 Cols) */}
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
                onClick={() => {
                  setIsFavorite(!isFavorite);
                  showToast(isFavorite ? 'Đã bỏ yêu thích sản phẩm' : 'Đã lưu sản phẩm vào danh sách yêu thích!');
                }}
                className={`absolute top-3 right-3 p-2.5 rounded-full transition shadow ${
                  isFavorite ? 'bg-red-50 text-red-500' : 'bg-white/90 text-slate-600 hover:text-red-500 hover:bg-white'
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
                  onClick={() => setSelectedImgIdx(idx)}
                  className={`w-20 h-20 rounded-xl border-2 overflow-hidden bg-slate-50 transition cursor-pointer shrink-0 ${
                    selectedImgIdx === idx ? 'border-[#f24e1e] shadow-md' : 'border-slate-200 hover:border-slate-300'
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

          {/* Right Column: Pricing, Specs, Order actions (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Brand & Badge */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">
                  {product.brand}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check size={12} /> Còn hàng ({product.stock} chiếc)
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-900 mb-3 leading-snug">
                {product.name}
              </h1>

              {/* Rating & Stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={15} fill="currentColor" />
                  <span>{product.rating}</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700"><strong>{product.reviewsCount}</strong> đánh giá</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700"><strong>{product.soldCount}</strong> đã giao dịch</span>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-white border border-orange-200/60 mb-6">
                <div className="text-xs text-slate-500 mb-1 font-medium">Giá bán niêm yết:</div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-extrabold text-[#f24e1e] tracking-tight">
                    {product.formattedPrice}
                  </span>
                  {product.formattedOldPrice && (
                    <span className="text-base text-slate-400 line-through">
                      {product.formattedOldPrice}
                    </span>
                  )}
                  {product.discount && (
                    <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-xs font-bold">
                      -{product.discount}%
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-orange-200/40 flex items-center gap-2 text-xs text-slate-700">
                  <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-bold text-[11px]">
                    VOUCHER SÀN
                  </span>
                  <span>Nhập mã <strong>NEXUS500K</strong> giảm ngay 500.000đ khi thanh toán</span>
                </div>
              </div>

              {/* Options selection */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Phiên bản & Màu sắc:
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {['Bản Tiêu Chuẩn', 'Vàng Hồng 18K', 'Titanium Xám Khói'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedColor(opt)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          selectedColor === opt
                            ? 'border-[#f24e1e] bg-orange-50 text-[#f24e1e] shadow-sm'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Số lượng đặt mua:
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2.5 hover:bg-slate-200 transition text-slate-600 cursor-pointer"
                        title="Giảm số lượng"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-12 text-center text-sm font-bold text-slate-900 bg-white py-2">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="p-2.5 hover:bg-slate-200 transition text-slate-600 cursor-pointer"
                        title="Tăng số lượng"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">Tối đa {product.stock} sản phẩm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border-2 border-[#f24e1e] text-[#f24e1e] bg-orange-50/50 hover:bg-orange-100 font-bold text-sm transition shadow-sm cursor-pointer"
              >
                <ShoppingCart size={18} />
                Thêm Vào Giỏ Hàng
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white font-bold text-sm transition shadow-md hover:shadow-lg cursor-pointer"
              >
                <Zap size={18} />
                Mua Ngay (Escrow PayOS)
              </button>
            </div>

            {/* Shop info bar */}
            <div className="mt-6 p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                  {product.shop.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    {product.shop.name}
                    {product.shop.verified && <CheckCircle2 size={14} className="text-blue-500" />}
                  </h4>
                  <p className="text-xs text-slate-500">Điểm uy tín: <strong>{product.shop.trustScore}/100</strong> • Phản hồi: {product.shop.responseRate}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => showToast('Đang kết nối tin nhắn trực tiếp với Gian hàng...')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                <MessageCircle size={14} />
                Chat Shop
              </button>
            </div>
          </div>
        </div>

        {/* Tabbed Info Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-12">
          {/* Tabs bar */}
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
                    <li>Mô hình quét 3D thực tế độ phân giải cao, hỗ trợ kiểm định tương tác trực quan.</li>
                    <li>Sử dụng các vật liệu cao cấp chuẩn đồng hồ xa xỉ Thụy Sỹ.</li>
                    <li>Đi kèm hộp đựng cao cấp, thẻ bảo hành quốc tế tích hợp chip NFC chống giả mạo.</li>
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
                        <td className="py-3 px-4 text-slate-600 border-b border-slate-100">
                          {val}
                        </td>
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
                      Khi quý khách đặt mua hoặc tham gia đấu giá, số tiền thanh toán hoặc tiền đặt cọc (50%) sẽ được giữ an toàn tại tài khoản ủy thác Escrow của hệ thống NEXUS. Người bán sẽ KHÔNG được nhận tiền ngay lập tức mà chỉ nhận được khi đơn hàng đã được giao đến tay quý khách và được đồng kiểm xác nhận đạt tiêu chuẩn.
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
                      Tất cả đơn hàng giá trị cao đều được niêm phong bằng seal an ninh chuyên dụng của NEXUS và vận chuyển có bảo hiểm 100% qua Giao Hàng Nhanh (GHN). Quý khách có quyền mở bưu kiện kiểm tra hàng trước mặt nhân viên giao nhận trước khi xác nhận.
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
                    <p className="font-bold text-slate-800">100% Khách hàng hài lòng về độ hoàn thiện và bảo chứng Escrow</p>
                    <p>Sản phẩm đã được chuyên viên giám định vật lý trước khi kích hoạt giao dịch.</p>
                  </div>
                </div>

                {/* Sample Review Comments */}
                <div className="space-y-4">
                  {[
                    { name: 'Trần Hoàng Long', time: '2 ngày trước', comment: 'Hàng nhận chuẩn chỉ từng con ốc, check mã NFC chính hãng trùng khớp. Ký quỹ PayOS rất yên tâm!', rating: 5 },
                    { name: 'Vũ Minh Tuấn', time: '1 tuần trước', comment: 'Mô hình 3D trên web xoay y chang lúc nhận hàng ngoài đời. Đóng gói hộp rất sang trọng.', rating: 5 },
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

        {/* Related Products Carousel / Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye size={20} className="text-[#f24e1e]" />
              Sản Phẩm Tương Tự Có Thể Bạn Thích
            </h3>
            <Link to="/search" className="text-xs font-bold text-indigo-600 hover:underline">
              Xem tất cả sàn &gt;
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PRODUCTS_CATALOG.filter((p) => p.id !== product.id).slice(0, 4).map((rel) => (
              <Link
                key={rel.id}
                to={`/product/${rel.id}`}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col justify-between"
              >
                <div className="aspect-square bg-slate-50 p-4 overflow-hidden flex items-center justify-center">
                  <img
                    src={rel.images[0]}
                    alt={rel.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                    {rel.brand.split('•')[0]}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-[#f24e1e] transition">
                    {rel.name}
                  </h4>
                  <div className="text-sm font-extrabold text-[#f24e1e]">
                    {rel.formattedPrice}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
