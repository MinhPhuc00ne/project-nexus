import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  Zap,
  Star,
  Check,
  ChevronRight,
  Minus,
  Plus,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { getProductById, type ProductDetail } from '../../components/products';
import { addToCart } from '../../services/cart';
import ProductImageGallery from '../../components/productDetail/ProductImageGallery';
import ProductInfoTabs from '../../components/productDetail/ProductInfoTabs';
import RelatedProductsSection from '../../components/productDetail/RelatedProductsSection';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductDetail>(() =>
    getProductById(id || 'ap-tourbillon'),
  );
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Bản Tiêu Chuẩn');
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
    <div className="min-h-screen bg-slate-50 py-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-indigo-600 transition">
              Trang Chủ
            </Link>
            <ChevronRight size={13} />
            <Link to="/search" className="hover:text-indigo-600 transition">
              Đồng Hồ & Trang Sức
            </Link>
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

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <ProductImageGallery
            product={product}
            selectedImgIdx={selectedImgIdx}
            onSelectImage={setSelectedImgIdx}
            isFavorite={isFavorite}
            onToggleFavorite={() => {
              setIsFavorite(!isFavorite);
              showToast(
                isFavorite
                  ? 'Đã bỏ yêu thích sản phẩm'
                  : 'Đã lưu sản phẩm vào danh sách yêu thích!',
              );
            }}
          />

          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">
                  {product.brand}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check size={12} /> Còn hàng ({product.stock} chiếc)
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-3 leading-snug">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={15} fill="currentColor" />
                  <span>{product.rating}</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">
                  <strong>{product.reviewsCount}</strong> đánh giá
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">
                  <strong>{product.soldCount}</strong> đã giao dịch
                </span>
              </div>

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
                  <span>
                    Nhập mã <strong>NEXUS500K</strong> giảm ngay 500.000đ khi thanh toán
                  </span>
                </div>
              </div>

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
                  <p className="text-xs text-slate-500">
                    Điểm uy tín: <strong>{product.shop.trustScore}/100</strong> • Phản hồi:{' '}
                    {product.shop.responseRate}
                  </p>
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

        <ProductInfoTabs product={product} />

        <RelatedProductsSection currentProductId={product.id} />
      </div>
    </div>
  );
}
