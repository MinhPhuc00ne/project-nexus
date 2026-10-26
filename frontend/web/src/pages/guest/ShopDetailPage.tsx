import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  Award,
  ShieldCheck,
  Package,
  Clock,
  MessageCircle,
  Share2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Eye,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  getShopDetailApi,
  type ShopListItem,
  type CatalogProduct,
} from '../../services/products.service';
import { addToCart } from '../../services/cart';

export const ShopDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<ShopListItem | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchShopData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getShopDetailApi(id, page, 12);
      setShop(data.shop);
      setProducts(data.products.items || []);
      setTotalPages(data.products.totalPages || 1);
      setTotalProducts(data.products.total || 0);
    } catch (err: unknown) {
      console.error('Failed to load shop details:', err);
      setError('Không thể tải thông tin gian hàng hoặc gian hàng không tồn tại.');
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    void fetchShopData();
  }, [fetchShopData]);

  const handleAddToCart = async (product: CatalogProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(
        {
          id: product.id,
          productId: product.id,
          name: product.title,
          price: product.basePrice,
          formattedPrice: `${product.basePrice.toLocaleString('vi-VN')} ₫`,
          img: product.thumbnail || product.images[0] || '/images/watches/watch-1.png',
          shopName: shop?.name || 'Nexus Store',
          brand: 'NEXUS LUXURY',
        },
        1,
      );
      setToastMessage(`Đã thêm "${product.title}" vào giỏ hàng!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Add to cart failed:', err);
    }
  };

  const getTrustBadge = (trustLevel: string) => {
    const level = trustLevel.toUpperCase();
    if (level === 'DIAMOND') {
      return { label: 'Kim Cương', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (level === 'PLATINUM') {
      return { label: 'Bạch Kim', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
    if (level === 'GOLD') {
      return { label: 'Hoàng Gia / Vàng', color: 'bg-amber-50 text-amber-700 border-amber-300' };
    }
    return {
      label: 'Đối Tác Xác Thực',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-base font-semibold">Đang tải thông tin gian hàng...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Gian Hàng Không Khả Dụng</h2>
          <p className="text-sm text-slate-500 mb-6">{error || 'Không tìm thấy gian hàng này.'}</p>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Quay lại tìm kiếm
          </button>
        </div>
      </div>
    );
  }

  const badge = getTrustBadge(shop.trustLevel);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SHOP HEADER BANNER */}
      <section className="bg-slate-900 text-white relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 pointer-events-none" />
        <div className="max-w-screen-2xl mx-auto px-6 py-10 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
            <Link to="/" className="hover:text-white transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/search" className="hover:text-white transition">
              Gian hàng
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200 font-semibold">{shop.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            {/* Shop Info Left */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-blue-900/30 border-2 border-white/10 shrink-0 overflow-hidden">
                {shop.avatarUrl ? (
                  <img
                    src={shop.avatarUrl}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{shop.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {shop.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    {badge.label}
                  </span>
                  {shop.isSellerActive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Đang hoạt động
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-300 font-medium mb-3">
                  Đại diện: <span className="text-white font-semibold">{shop.sellerFullName}</span>
                </p>

                {shop.description && (
                  <p className="text-xs text-slate-400 max-w-xl line-clamp-2 mb-3">
                    {shop.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  {shop.address && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      {shop.address.district ? `${shop.address.district}, ` : ''}
                      {shop.address.city || 'Việt Nam'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Điểm uy tín: <strong className="text-white">{shop.reputationScore}/100</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Phản hồi: <strong className="text-white">99%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Shop Actions Right */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setToastMessage('Đã sao chép liên kết gian hàng!');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              >
                <Share2 className="w-4 h-4 text-slate-300" />
                <span>Chia sẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setToastMessage('Tính năng Chat đang kết nối với người bán...')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Liên hệ Shop</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-slate-500 text-xs">Tổng sản phẩm:</span>
              <span className="font-bold text-slate-900">{totalProducts}</span>
            </div>
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-500 text-xs">Xác thực:</span>
              <span className="font-bold text-emerald-600">Đã kiểm duyệt</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-slate-500 text-xs">Bảo đảm:</span>
              <span className="font-bold text-slate-900">Nexus Escrow 100%</span>
            </div>
          </div>

          <Link
            to="/search"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Xem tất cả sản phẩm chợ</span>
          </Link>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <main className="max-w-screen-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sản Phẩm Của Gian Hàng</h2>
            <p className="text-xs text-slate-500 mt-1">
              Tất cả đồng hồ và tài sản xa xỉ được bảo chứng bởi gian hàng này
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            HIỂN THỊ {products.length} / {totalProducts} SẢN PHẨM
          </span>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Chưa có sản phẩm nào</h3>
            <p className="text-xs text-slate-500 mb-6">
              Gian hàng này hiện chưa niêm yết sản phẩm mới nào hoặc các sản phẩm đã được bán hết.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Khám phá sản phẩm khác
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Product Image */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src={product.thumbnail || product.images[0] || '/images/watches/watch-1.png'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.threeModelKey && (
                    <span className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      3D Model
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  {product.category && (
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                      {product.category.name}
                    </span>
                  )}
                  <Link
                    to={`/product/${product.id}`}
                    className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2 mb-2"
                  >
                    {product.title}
                  </Link>

                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Giá niêm yết
                      </span>
                      <span className="text-base font-extrabold text-blue-600">
                        {product.basePrice.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/product/${product.id}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(product, e)}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                        title="Thêm vào giỏ"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-slate-200">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Trang trước
            </button>
            <span className="text-xs font-semibold text-slate-500 px-3">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Trang sau
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopDetailPage;
