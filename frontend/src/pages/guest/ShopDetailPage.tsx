import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Store,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  getShopDetailApi,
  type ShopListItem,
  type CatalogProduct,
} from '../../services/products.service';
import { addToCart } from '../../services/cart';
import ShopHeader from '../../components/shop/ShopHeader';
import ShopProductGrid from '../../components/shop/ShopProductGrid';
import { useAuth } from '../../contexts/AuthContext';
import { openChatWithUser } from '../../components/chat/chatEvents';

export const ShopDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, storedUser } = useAuth();

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
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            Quay lại tìm kiếm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <ShopHeader
        shop={shop}
        onShare={() => {
          void navigator.clipboard.writeText(window.location.href);
          setToastMessage('Đã sao chép liên kết gian hàng!');
          setTimeout(() => setToastMessage(null), 3000);
        }}
        onContact={() => {
          if (!token || !storedUser) {
            navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
            return;
          }

          if (storedUser.role !== 'BUYER' && storedUser.role !== 'SELLER') {
            setToastMessage('Tài khoản này không thể nhắn tin trực tiếp với người bán.');
            setTimeout(() => setToastMessage(null), 3000);
            return;
          }

          if (storedUser.id === shop.id) {
            setToastMessage('Bạn đang xem gian hàng của chính mình.');
            setTimeout(() => setToastMessage(null), 3000);
            return;
          }

          openChatWithUser({ userId: shop.id, userName: shop.name });
        }}
      />

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

      <ShopProductGrid
        products={products}
        totalProducts={totalProducts}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export default ShopDetailPage;
